import type { RefObject } from "react";

type ManualHelpButtonProps = {
  expanded: boolean;
  onClick: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
};

export function ManualHelpButton({
  expanded,
  onClick,
  buttonRef,
}: ManualHelpButtonProps) {
  return (
    <button
      ref={buttonRef}
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
