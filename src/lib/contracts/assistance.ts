import type {
  DocumentSectionAnchor,
  DocumentSectionId,
} from "@/lib/contracts/document";

export type AssistanceConsentMode = "offer" | "automatic" | "manual-only";

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
