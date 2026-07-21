import type { FrictionAssessment } from "@/lib/contracts/adaptation";
import type { ProactiveAssistanceGate } from "@/lib/contracts/assistance";

export const FIRST_DECLINE_COOLDOWN_MS = 5 * 60 * 1000;
export const PROACTIVE_GATE_STORAGE_KEY = "polymorph-ui:proactive-gate";

export const initialProactiveAssistanceGate: ProactiveAssistanceGate = {
  declinedEpisodeIds: [],
  declineCount: 0,
  cooldownUntil: null,
  disabledForSession: false,
};

export type ProactiveGateDecision =
  | { allowed: true; reason: null }
  | {
      allowed: false;
      reason:
        "ineligible" | "episode-declined" | "cooldown" | "session-disabled";
    };

export function parseProactiveAssistanceGate(
  serialized: string | null,
): ProactiveAssistanceGate {
  if (!serialized) return initialProactiveAssistanceGate;
  try {
    const value: unknown = JSON.parse(serialized);
    if (typeof value !== "object" || value === null) {
      return initialProactiveAssistanceGate;
    }
    const candidate = value as Record<string, unknown>;
    if (
      !Array.isArray(candidate.declinedEpisodeIds) ||
      !candidate.declinedEpisodeIds.every(
        (episodeId) => typeof episodeId === "string",
      ) ||
      typeof candidate.declineCount !== "number" ||
      !Number.isInteger(candidate.declineCount) ||
      candidate.declineCount < 0 ||
      (candidate.cooldownUntil !== null &&
        typeof candidate.cooldownUntil !== "string") ||
      typeof candidate.disabledForSession !== "boolean"
    ) {
      return initialProactiveAssistanceGate;
    }
    return {
      declinedEpisodeIds: candidate.declinedEpisodeIds.slice(-100),
      declineCount: candidate.declineCount,
      cooldownUntil: candidate.cooldownUntil as string | null,
      disabledForSession: candidate.disabledForSession,
    };
  } catch {
    return initialProactiveAssistanceGate;
  }
}

/** Checked only after evidence-only classification and before consent routing. */
export function evaluateProactiveGate(
  assessment: FrictionAssessment,
  gate: ProactiveAssistanceGate,
  nowMs: number,
): ProactiveGateDecision {
  if (!assessment.eligibleForAdaptation) {
    return { allowed: false, reason: "ineligible" };
  }
  if (gate.disabledForSession) {
    return { allowed: false, reason: "session-disabled" };
  }
  if (gate.declinedEpisodeIds.includes(assessment.episodeId)) {
    return { allowed: false, reason: "episode-declined" };
  }
  if (gate.cooldownUntil !== null && Date.parse(gate.cooldownUntil) > nowMs) {
    return { allowed: false, reason: "cooldown" };
  }
  return { allowed: true, reason: null };
}

/** Records session-only suppression without changing classifier eligibility. */
export function recordProactiveDecline(
  gate: ProactiveAssistanceGate,
  episodeId: string,
  nowMs: number,
): ProactiveAssistanceGate {
  const declineCount = gate.declineCount + 1;
  return {
    declinedEpisodeIds: gate.declinedEpisodeIds.includes(episodeId)
      ? gate.declinedEpisodeIds
      : [...gate.declinedEpisodeIds.slice(-99), episodeId],
    declineCount,
    cooldownUntil:
      declineCount === 1
        ? new Date(nowMs + FIRST_DECLINE_COOLDOWN_MS).toISOString()
        : gate.cooldownUntil,
    disabledForSession: declineCount >= 2,
  };
}
