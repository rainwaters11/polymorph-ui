import { forwardRef } from "react";

type AdaptationNoticeProps = {
  kind: "offer" | "automatic";
  reason: string;
  onAdapt: () => void;
  onDecline: () => void;
};

export const AdaptationNotice = forwardRef<HTMLElement, AdaptationNoticeProps>(
  function AdaptationNotice({ kind, reason, onAdapt, onDecline }, ref) {
    return (
      <section
        ref={ref}
        className="adaptation-notice"
        aria-labelledby="adaptation-notice-title"
        aria-live="polite"
        tabIndex={-1}
      >
        <div className="notice-mark" aria-hidden="true">
          ✦
        </div>
        <div className="notice-copy">
          <p>
            {kind === "offer" ? "Support is available" : "Adaptation notice"}
          </p>
          <h2 id="adaptation-notice-title">
            {kind === "offer"
              ? "Would a clearer view help?"
              : "A clearer view is ready"}
          </h2>
          <span>{reason}</span>
        </div>
        <div className="notice-actions">
          <button
            className="adaptive-primary-action"
            type="button"
            onClick={onAdapt}
          >
            Adapt now
          </button>
          <button type="button" onClick={onDecline}>
            Stay in standard view
          </button>
        </div>
      </section>
    );
  },
);
