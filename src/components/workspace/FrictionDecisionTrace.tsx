import type {
  FrictionAssessment,
  ReasonCode,
} from "@/lib/contracts/adaptation";
import { FRICTION_CONFIG } from "@/lib/friction/config";

const REASON_LABELS: Record<ReasonCode, string> = {
  REPEATED_SELECTION: "Repeated section review",
  SCROLL_REVERSAL: "Repeated navigation reversals",
  JARGON_DWELL: "Extended terminology review",
  INACTIVITY: "Extended pause",
  QUIZ_RETRY: "Repeated knowledge-check attempts",
};

export function FrictionDecisionTrace({
  assessment,
}: {
  assessment: FrictionAssessment | null;
}) {
  const score = assessment?.score ?? 0;
  return (
    <div className="friction-decision-trace" aria-live="polite">
      <div className="decision-trace-summary">
        <strong>
          Score {score} · support threshold{" "}
          {FRICTION_CONFIG.thresholds.highFriction}
        </strong>
        <small>
          {assessment?.eligibleForAdaptation
            ? "Support eligible"
            : "Observing task signals"}
        </small>
      </div>
      {assessment && assessment.reasonCodes.length > 0 && (
        <ul aria-label="Observed task-friction reasons">
          {assessment.reasonCodes.map((reason) => (
            <li key={reason}>{REASON_LABELS[reason]}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
