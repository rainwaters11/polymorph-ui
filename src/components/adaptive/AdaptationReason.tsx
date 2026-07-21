import type { AdaptationPlan, ReasonCode } from "@/lib/contracts/adaptation";

const reasonLabels: Record<ReasonCode, string> = {
  REPEATED_SELECTION: "A section was selected more than once",
  SCROLL_REVERSAL: "The reading path moved back and forth",
  JARGON_DWELL: "A glossary term stayed in focus",
  INACTIVITY: "The current section stayed open without progress",
  QUIZ_RETRY: "The knowledge check needed another attempt",
};

type AdaptationReasonProps = {
  transparency: AdaptationPlan["transparency"];
};

export function AdaptationReason({ transparency }: AdaptationReasonProps) {
  return (
    <details className="adaptation-reason">
      <summary>Why did this view change?</summary>
      <p>{transparency.reasonSummary}</p>
      {transparency.reasonCodes.length > 0 && (
        <ul>
          {transparency.reasonCodes.map((code) => (
            <li key={code}>{reasonLabels[code]}</li>
          ))}
        </ul>
      )}
      <small>This describes reading-friction signals, not a diagnosis.</small>
    </details>
  );
}
