import { forwardRef } from "react";

type AdaptationNoticeProps = {
  kind?: "offer" | "automatic";
  reason: string;
  onAdapt: () => void;
  onDecline?: () => void;
  onStay?: () => void;
};

export const AdaptationNotice = forwardRef<HTMLElement, AdaptationNoticeProps>(
  function AdaptationNotice(
    { kind = "offer", reason, onAdapt, onDecline, onStay },
    ref,
  ) {
    const onStandardView = onDecline ?? onStay;

    return (
      <section
        ref={ref}
        className="adaptation-notice"
        aria-labelledby="adaptation-notice-title"
        aria-live="polite"
        tabIndex={-1}
      >
        <div className="notice-mark" aria-hidden="true">✦</div>
        <div className="notice-copy">
          <p className="adaptive-eyebrow">
            {kind === "offer" ? "Support is available" : "Adaptation notice"}
          </p>
          <h2 id="adaptation-notice-title">
            {kind === "offer" ? "Would a clearer view help?" : "A clearer view is ready"}
          </h2>
          <p>{reason}</p>
        </div>
        <div className="adaptation-notice-actions">
          <button className="adaptive-primary-action" type="button" onClick={onAdapt}>
            Adapt now
          </button>
          <button type="button" className="adaptive-control" onClick={onStandardView}>
            Stay in standard view
          </button>
        </div>
      </section>
    );
  },
);
