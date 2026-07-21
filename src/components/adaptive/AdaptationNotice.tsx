export function AdaptationNotice({
  reason,
  onAdapt,
  onStay,
}: {
  reason: string;
  onAdapt: () => void;
  onStay: () => void;
}) {
  return (
    <section
      className="adaptation-notice"
      aria-labelledby="adaptation-notice-title"
    >
      <div>
        <p className="adaptive-eyebrow">Support is available</p>
        <h2 id="adaptation-notice-title">Would a clearer view help?</h2>
        <p>{reason}</p>
      </div>
      <div className="adaptation-notice-actions">
        <button
          type="button"
          className="adaptive-primary-action"
          onClick={onAdapt}
        >
          Adapt now
        </button>
        <button type="button" className="adaptive-control" onClick={onStay}>
          Stay in standard view
        </button>
      </div>
    </section>
  );
}
