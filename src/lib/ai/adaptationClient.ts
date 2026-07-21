import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  adaptationPlanSchema,
  type AdaptRequest,
  type AdaptationPlan,
} from "@/lib/contracts/adaptation";
import {
  ADAPTATION_SYSTEM_PROMPT,
  buildAdaptationUserPrompt,
} from "@/lib/ai/adaptationPrompt";

/**
 * Product-facing model name for this endpoint. Overridable so the deployed
 * environment can point at whichever GPT-5.6 model id the hackathon
 * environment provisions without a code change.
 */
export const ADAPTATION_MODEL =
  process.env.OPENAI_ADAPTATION_MODEL ?? "gpt-5.6";

export const ADAPTATION_REQUEST_TIMEOUT_MS = 15_000;

export class AdaptationModelError extends Error {
  constructor(
    message: string,
    readonly kind:
      | "missing-key"
      | "timeout"
      | "rate-limit"
      | "malformed-output"
      | "provider-error",
    readonly requestId: string,
  ) {
    super(message);
    this.name = "AdaptationModelError";
  }
}

let cachedClient: OpenAI | null = null;

function getClient(requestId: string): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AdaptationModelError(
      "OPENAI_API_KEY is not configured",
      "missing-key",
      requestId,
    );
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey,
      timeout: ADAPTATION_REQUEST_TIMEOUT_MS,
    });
  }

  return cachedClient;
}

/**
 * Calls the model for a structured AdaptationPlan. Never throws the raw
 * SDK error to the caller — every failure path is normalized into an
 * AdaptationModelError so the route handler can select a deterministic
 * fallback without leaking provider internals.
 */
export async function requestAdaptationPlan(
  request: AdaptRequest,
  requestId: string,
): Promise<AdaptationPlan> {
  const client = getClient(requestId);

  try {
    const response = await client.responses.parse(
      {
        model: ADAPTATION_MODEL,
        input: [
          { role: "system", content: ADAPTATION_SYSTEM_PROMPT },
          { role: "user", content: buildAdaptationUserPrompt(request) },
        ],
        text: {
          format: zodTextFormat(adaptationPlanSchema, "adaptation_plan"),
        },
      },
      { timeout: ADAPTATION_REQUEST_TIMEOUT_MS },
    );

    if (
      response.output_parsed === null ||
      response.output_parsed === undefined
    ) {
      throw new AdaptationModelError(
        "Model refused or returned no parsable output",
        "malformed-output",
        requestId,
      );
    }

    const validated = adaptationPlanSchema.safeParse(response.output_parsed);
    if (!validated.success) {
      throw new AdaptationModelError(
        "Model output failed schema validation",
        "malformed-output",
        requestId,
      );
    }

    return validated.data;
  } catch (error) {
    if (error instanceof AdaptationModelError) {
      throw error;
    }

    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new AdaptationModelError(
          "Model rate limit exceeded",
          "rate-limit",
          requestId,
        );
      }

      throw new AdaptationModelError(
        "Model provider error",
        "provider-error",
        requestId,
      );
    }

    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      throw new AdaptationModelError(
        "Model request timed out",
        "timeout",
        requestId,
      );
    }

    throw new AdaptationModelError(
      "Unexpected model client error",
      "provider-error",
      requestId,
    );
  }
}
