import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  adaptRequestSchema,
  adaptationPlanSchema,
  type AdaptRequest,
  type AdaptationPlan,
} from "@/lib/contracts/adaptation";
import {
  AdaptationModelError,
  requestAdaptationPlan,
} from "@/lib/ai/adaptationClient";
import { buildFallbackAdaptationPlan } from "@/lib/adaptation/fallbackPlan";

export const runtime = "nodejs";

type ErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
): NextResponse<ErrorBody> {
  return NextResponse.json(
    { error: { code, message, requestId } },
    { status, headers: { "x-request-id": requestId } },
  );
}

function expectedSourceSectionId(request: AdaptRequest): string {
  return request.authorization === "telemetry-consent"
    ? request.sourceSectionId
    : request.manualRequest.sectionId;
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/**
 * Defense in depth beyond the Zod schema: even a schema-valid plan is
 * rejected if it would let a model response weaken mandatory controls
 * or drift from the section the learner is actually reading.
 */
function isPlanSafe(plan: AdaptationPlan, request: AdaptRequest): boolean {
  const controlsIntact =
    plan.controls.allowDismiss === true &&
    plan.controls.allowReset === true &&
    plan.controls.allowPause === true &&
    plan.controls.showOriginalText === true;

  const sourceIdentityPreserved =
    plan.sourceSectionId === expectedSourceSectionId(request);

  const modeCountValid =
    plan.supportingModes.length <= 2 &&
    !plan.supportingModes.includes(plan.primaryMode);

  const telemetryEvidencePreserved =
    request.authorization === "learner-request" ||
    (plan.frictionState === request.assessment.state &&
      arraysEqual(
        plan.transparency.reasonCodes,
        request.assessment.reasonCodes,
      ));

  return (
    controlsIntact &&
    sourceIdentityPreserved &&
    modeCountValid &&
    telemetryEvidencePreserved
  );
}

function logOutcome(
  requestId: string,
  authorization: AdaptRequest["authorization"],
  outcome: "model" | "fallback",
  detail?: string,
) {
  // Server-side observability only: no raw telemetry events, source
  // text, or model output is logged, only the outcome classification.
  console.info(
    JSON.stringify({
      scope: "api/adapt",
      requestId,
      authorization,
      outcome,
      detail,
    }),
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const requestId = randomUUID();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      "Request body must be valid JSON.",
      requestId,
    );
  }

  const parsedRequest = adaptRequestSchema.safeParse(json);
  if (!parsedRequest.success) {
    return errorResponse(
      400,
      "invalid_request",
      "Request body did not match the expected adaptation request shape.",
      requestId,
    );
  }

  const request = parsedRequest.data;

  if (
    request.authorization === "telemetry-consent" &&
    !request.assessment.eligibleForAdaptation
  ) {
    return errorResponse(
      422,
      "ineligible_telemetry",
      "Telemetry-triggered adaptation requires an eligible deterministic assessment.",
      requestId,
    );
  }

  try {
    const plan = await requestAdaptationPlan(request, requestId);

    if (!isPlanSafe(plan, request)) {
      logOutcome(requestId, request.authorization, "fallback", "unsafe-plan");
      return NextResponse.json(
        {
          plan: buildFallbackAdaptationPlan(request),
          fallback: true,
          requestId,
        },
        { headers: { "x-request-id": requestId } },
      );
    }

    logOutcome(requestId, request.authorization, "model");
    return NextResponse.json(
      { plan, fallback: false, requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    const kind =
      error instanceof AdaptationModelError ? error.kind : "provider-error";
    logOutcome(requestId, request.authorization, "fallback", kind);

    const fallbackPlan = buildFallbackAdaptationPlan(request);
    const fallbackValidation = adaptationPlanSchema.safeParse(fallbackPlan);
    if (!fallbackValidation.success) {
      return errorResponse(
        500,
        "fallback_generation_failed",
        "Unable to produce a usable adaptation plan.",
        requestId,
      );
    }

    return NextResponse.json(
      { plan: fallbackValidation.data, fallback: true, requestId },
      { headers: { "x-request-id": requestId } },
    );
  }
}
