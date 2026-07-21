export function AdaptationNotice({
  reason,
  onAdapt,
  onStay,
  eyebrow = "Support is available",
  title = "Would a clearer view help?",
  primaryLabel = "Adapt now",
}: {
  reason: string;
  onAdapt: () => void;
  onStay: () => void;
  eyebrow?: string;
  title?: string;
  primaryLabel?: string;
}) {
  return (
    <section
      className="adaptation-notice"
      aria-labelledby="adaptation-notice-title"
    >
      <div>
        <p className="adaptive-eyebrow">{eyebrow}</p>
        <h2 id="adaptation-notice-title">{title}</h2>
        <p>{reason}</p>
      </div>
      <div className="adaptation-notice-actions">
        <button
          type="button"
          className="adaptive-primary-action"
          onClick={onAdapt}
        >
          {primaryLabel}
        </button>
        <button type="button" className="adaptive-control" onClick={onStay}>
          Stay in standard view
        </button>
      </div>
    </section>
  );
}
