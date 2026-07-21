import type { AdaptationMode } from "@/lib/contracts/assistance";

const modes: Array<{
  value: AdaptationMode;
  label: string;
  description: string;
}> = [
  { value: "focus", label: "Focus", description: "Reduce competing detail" },
  {
    value: "plain-language",
    label: "Clarify",
    description: "Explain terms with an example",
  },
  {
    value: "visual-map",
    label: "Visualize",
    description: "Map the process visually",
  },
  {
    value: "step-by-step",
    label: "Guided",
    description: "Break it into clear stages",
  },
  {
    value: "check-understanding",
    label: "Practice",
    description: "Try one short question",
  },
];

type ManualHelpChooserProps = {
  activeSectionTitle: string;
  selectedMode?: AdaptationMode;
  onModeChange: (mode?: AdaptationMode) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function ManualHelpChooser({
  activeSectionTitle,
  selectedMode,
  onModeChange,
  onSubmit,
  onCancel,
}: ManualHelpChooserProps) {
  return (
    <div className="help-chooser" id="manual-help-chooser">
      <div className="help-chooser-heading">
        <p>Help with</p>
        <h3>{activeSectionTitle}</h3>
      </div>
      <fieldset>
        <legend>
          Choose a support style <span>(optional)</span>
        </legend>
        <div className="help-mode-grid">
          {modes.map((mode) => (
            <label key={mode.value}>
              <input
                type="radio"
                name="manual-help-mode"
                value={mode.value}
                checked={selectedMode === mode.value}
                onChange={() => onModeChange(mode.value)}
              />
              <span>
                <strong>{mode.label}</strong>
                <small>{mode.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="help-chooser-actions">
        <button className="primary-action" type="button" onClick={onSubmit}>
          Request support
        </button>
        {selectedMode ? (
          <button type="button" onClick={() => onModeChange(undefined)}>
            Clear choice
          </button>
        ) : (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
