import type {
  AssistanceConsentMode,
  AssistancePreferenceCallback,
} from "@/lib/contracts/assistance";

const choices: Array<{
  value: AssistanceConsentMode;
  label: string;
  description: string;
}> = [
  {
    value: "offer",
    label: "Ask before changing",
    description: "Offer support, then wait for my choice.",
  },
  {
    value: "automatic",
    label: "Adapt after a notice",
    description: "Show a notice before adjusting the workspace.",
  },
  {
    value: "manual-only",
    label: "Only when I ask",
    description: "Never suggest a change proactively.",
  },
];

type AssistancePreferencesProps = {
  value: AssistanceConsentMode;
  onChange: AssistancePreferenceCallback;
};

export function AssistancePreferences({
  value,
  onChange,
}: AssistancePreferencesProps) {
  return (
    <fieldset className="assistance-preferences">
      <legend>How should this workspace help?</legend>
      <p>Your choice lasts for this session.</p>
      <div className="preference-options">
        {choices.map((choice) => (
          <label key={choice.value}>
            <input
              type="radio"
              name="assistance-consent"
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
            />
            <span className="radio-control" aria-hidden="true" />
            <span>
              <strong>{choice.label}</strong>
              <small>{choice.description}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
