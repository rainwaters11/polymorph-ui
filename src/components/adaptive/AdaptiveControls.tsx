type ButtonProps = {
  onClick: () => void;
};

export function ShowOriginalControl({
  showingOriginal,
  onClick,
}: ButtonProps & { showingOriginal: boolean }) {
  return (
    <button type="button" className="adaptive-control" onClick={onClick}>
      {showingOriginal ? "Hide original text" : "Show original text"}
    </button>
  );
}

export function PauseTelemetryControl({
  paused,
  onClick,
}: ButtonProps & { paused: boolean }) {
  return (
    <button type="button" className="adaptive-control" onClick={onClick}>
      {paused ? "Resume telemetry" : "Pause telemetry"}
    </button>
  );
}

export function ResetViewButton({ onClick }: ButtonProps) {
  return (
    <button type="button" className="adaptive-control" onClick={onClick}>
      Reset view
    </button>
  );
}

export function DismissAdaptationControl({ onClick }: ButtonProps) {
  return (
    <button
      type="button"
      className="adaptive-control adaptive-control-strong"
      onClick={onClick}
    >
      Return to standard view
    </button>
  );
}
