type ReaderHeaderProps = {
  progress: number;
  activeLabel: string;
};

export function ReaderHeader({ progress, activeLabel }: ReaderHeaderProps) {
  return (
    <header id="region-product-header" className="product-header">
      <a className="brand" href="#lesson-title" aria-label="Polymorph UI home">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span>
          <strong>Polymorph</strong>
          <small>Learning workspace</small>
        </span>
      </a>

      <div className="header-progress">
        <div className="header-progress-copy">
          <span>{activeLabel}</span>
          <span>{progress}%</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={`Lesson progress: ${progress}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div
        className="view-badge"
        aria-label="Current interface mode: Standard view"
      >
        <span aria-hidden="true" />
        Standard view
      </div>
    </header>
  );
}
