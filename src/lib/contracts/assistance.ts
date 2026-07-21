import type {
  DocumentSectionAnchor,
  DocumentSectionId,
} from "@/lib/contracts/document";

export const ASSISTANCE_CONSENT_MODES = [
  "offer",
  "automatic",
  "manual-only",
] as const;

export type AssistanceConsentMode = (typeof ASSISTANCE_CONSENT_MODES)[number];

export const ASSISTANCE_CONSENT_STORAGE_KEY = "polymorph-ui:assistance-consent";

export function isAssistanceConsentMode(
  value: unknown,
): value is AssistanceConsentMode {
  return ASSISTANCE_CONSENT_MODES.includes(value as AssistanceConsentMode);
}

export type ProactiveAssistanceGate = {
  declinedEpisodeIds: readonly string[];
  declineCount: number;
  cooldownUntil: string | null;
  disabledForSession: boolean;
};

export type AdaptationMode =
  | "focus"
  | "plain-language"
  | "visual-map"
  | "step-by-step"
  | "check-understanding";

export type ManualHelpRequest = {
  requestId: string;
  sectionId: DocumentSectionId;
  activeSectionAnchor: DocumentSectionAnchor;
  sourceSectionText: string;
  requestedMode?: AdaptationMode;
  requestedAt: string;
};

export type AssistancePreferenceCallback = (
  mode: AssistanceConsentMode,
) => void;

export type ManualHelpCallback = (request: ManualHelpRequest) => void;
