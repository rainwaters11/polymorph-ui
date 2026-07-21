type ShowOriginalControlProps = {
  showing: boolean;
  onToggle: () => void;
};

export function ShowOriginalControl({
  showing,
  onToggle,
}: ShowOriginalControlProps) {
  return (
    <button type="button" aria-pressed={showing} onClick={onToggle}>
      <span aria-hidden="true">{showing ? "−" : "＋"}</span>
      {showing ? "Hide original wording" : "Show original wording"}
    </button>
  );
}

type PauseTelemetryControlProps = {
  paused: boolean;
  onToggle: () => void;
};

export function PauseTelemetryControl({
  paused,
  onToggle,
}: PauseTelemetryControlProps) {
  return (
    <button type="button" aria-pressed={paused} onClick={onToggle}>
      <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
      {paused ? "Resume reading signals" : "Pause reading signals"}
    </button>
  );
}

type ResetViewButtonProps = {
  onReset: () => void;
};

export function ResetViewButton({ onReset }: ResetViewButtonProps) {
  return (
    <button type="button" onClick={onReset}>
      <span aria-hidden="true">↺</span>
      Reset view
    </button>
  );
}
