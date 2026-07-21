import type { AdaptationMode, ReasonCode } from "@/lib/contracts/adaptation";

/**
 * Hackathon-demo heuristics, not scientific, diagnostic, or medical claims.
 * Keeping every threshold here makes the classifier easy to explain and tune.
 */
export const FRICTION_CONFIG = {
  signals: {
    repeatedSelection: { minimum: 2, weight: 2 },
    scrollReversal: { minimum: 4, weight: 2 },
    jargonDwell: { minimumMs: 4_000, weight: 1 },
    inactivity: { minimumMs: 30_000, weight: 1 },
    quizRetry: { minimum: 2, weight: 3 },
  },
  thresholds: {
    possibleConfusion: 3,
    highFriction: 6,
  },
  cooldownMs: 30_000,
  maxHandledEpisodes: 100,
} as const;

export const RECOMMENDED_MODES_BY_REASON: Record<
  ReasonCode,
  readonly AdaptationMode[]
> = {
  REPEATED_SELECTION: ["plain-language"],
  SCROLL_REVERSAL: ["focus"],
  JARGON_DWELL: ["plain-language", "visual-map"],
  INACTIVITY: ["focus", "step-by-step"],
  QUIZ_RETRY: ["check-understanding", "plain-language"],
};
