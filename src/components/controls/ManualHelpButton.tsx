type ManualHelpButtonProps = {
  expanded: boolean;
  onClick: () => void;
};

export function ManualHelpButton({ expanded, onClick }: ManualHelpButtonProps) {
  return (
    <button
      className="manual-help-button"
      type="button"
      aria-expanded={expanded}
      aria-controls="manual-help-chooser"
      onClick={onClick}
    >
      <span className="help-spark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span>
        <strong>Help me with this section</strong>
        <small>Choose how the workspace can support you</small>
      </span>
      <span aria-hidden="true">{expanded ? "−" : "+"}</span>
    </button>
  );
}
