import type { AdaptationPlan } from "@/lib/contracts/adaptation";
import type {
  AdaptationMode,
  ManualHelpRequest,
} from "@/lib/contracts/assistance";
import type { DocumentSection } from "@/lib/contracts/document";
import { rateLimitingLesson } from "@/content/rate-limiting-lesson";

const supportingModeByPrimary: Record<AdaptationMode, AdaptationMode[]> = {
  focus: ["plain-language"],
  "plain-language": ["focus"],
  "visual-map": ["plain-language"],
  "step-by-step": ["plain-language"],
  "check-understanding": ["plain-language"],
};

function diagramForSection(
  sectionId: string,
): AdaptationPlan["instructionalSupport"]["diagramType"] {
  if (sectionId.includes("jitter") || sectionId.includes("backoff")) {
    return "retry-timeline";
  }
  if (sectionId.includes("header") || sectionId.includes("429")) {
    return "rate-limit-window";
  }
  return "request-cycle";
}

function stepsForSection(section: DocumentSection) {
  const sectionSpecificSteps: Record<string, string[]> = {
    "section-rate-limit-purpose": [
      "A client sends a request to an API with finite capacity.",
      "The API counts that request inside a defined request window.",
      "If the client is over its allowance, the API returns 429 instead of accepting more work.",
      "The client waits, then retries according to the server's guidance and a bounded policy.",
    ],
    "section-429-response": [
      "Recognize 429 as a temporary request-limit response.",
      "Read Retry-After and the provider's rate-limit headers when they are available.",
      "Wait for the instructed interval instead of retrying immediately.",
      "Retry only when the operation is safe and the attempt budget allows it.",
    ],
    "section-exponential-backoff": [
      "Start with the server's Retry-After guidance when it is present.",
      "Otherwise calculate a bounded delay from the current attempt number.",
      "Add jitter so clients do not retry in one synchronized wave.",
      "Stop after the attempt budget or cancellation signal is reached.",
    ],
  };

  return (
    sectionSpecificSteps[section.id] ?? [
      `Start with the key idea: ${section.summary}`,
      "Connect the idea to the server's request limit and recovery window.",
      "Apply it with a bounded retry policy rather than an immediate loop.",
    ]
  );
}

function explanationForSection(section: DocumentSection) {
  const explanations: Record<string, string> = {
    "section-rate-limit-purpose":
      "An API has limited capacity. A rate limit is the API's way of sharing that capacity fairly. When a client reaches its allowance, the server can temporarily reject more requests so the service stays available for everyone.",
    "section-429-response":
      "A 429 response means the server understood the request but needs the client to slow down. It is usually a temporary boundary, not proof that the request itself is invalid. The client should inspect the server's timing guidance before trying again.",
    "section-rate-limit-headers":
      "Rate-limit headers are status clues. They can describe the request allowance, what remains, and when the allowance refreshes. Header names and meanings vary by provider, so the provider's documentation remains the source of truth.",
    "section-exponential-backoff":
      "Exponential backoff increases the wait after each unsuccessful attempt. Longer waits reduce pressure on a service that is still recovering, while a maximum delay and attempt count keep the client from waiting forever.",
    "section-jitter":
      "Jitter adds a small, bounded amount of randomness to each retry delay. That spreads many clients across the recovery window instead of letting them all retry at the same instant.",
    "section-client-example":
      "The client retries only when it receives 429. It follows Retry-After when possible, otherwise calculates a bounded random delay, and stops after a fixed number of attempts or a cancellation signal.",
  };

  return explanations[section.id] ?? section.summary;
}

export function createMockAdaptationPlan(
  request: ManualHelpRequest,
  section: DocumentSection,
): AdaptationPlan {
  const primaryMode = request.requestedMode ?? "focus";

  return {
    sourceSectionId: section.id,
    frictionState: "steady",
    primaryMode,
    supportingModes: supportingModeByPrimary[primaryMode],
    presentation: {
      density: "reduced",
      hideSecondaryNavigation: true,
      emphasizeCurrentSection: true,
      increaseSpacing: true,
      preserveScrollPosition: true,
    },
    instructionalSupport: {
      heading: `${section.title}, made easier to scan`,
      explanation: explanationForSection(section),
      glossary: rateLimitingLesson.glossary.slice(0, 4).map((item) => ({
        term: item.term,
        definition: item.definition,
      })),
      steps: stepsForSection(section),
      analogy:
        "Think of a rate limit like timed entry at a busy venue: the pause protects the space, and a retry is useful only after capacity becomes available.",
      diagramType: diagramForSection(section.id),
    },
    knowledgeCheck: {
      question:
        "What should a client do first when a 429 response includes Retry-After?",
      options: [
        "Retry immediately before other clients do",
        "Wait at least for the server-directed interval",
        "Increase concurrency to finish sooner",
      ],
      correctIndex: 1,
      explanation:
        "Retry-After is the server's direct timing guidance. Honor it before applying the rest of the bounded retry policy.",
    },
    transparency: {
      reasonSummary:
        "You asked for support with this section, so the same source is presented with less competition and one clearer learning path.",
      reasonCodes: [],
    },
    controls: {
      allowDismiss: true,
      allowReset: true,
      allowPause: true,
      showOriginalText: true,
    },
  };
}

export function createMockPlanForMode(mode: AdaptationMode): AdaptationPlan {
  const section = rateLimitingLesson.sections[1];
  return createMockAdaptationPlan(
    {
      requestId: `mock-${mode}`,
      sectionId: section.id,
      activeSectionAnchor: section.anchor,
      sourceSectionText: `${section.title}\n\n${section.summary}`,
      requestedMode: mode,
      requestedAt: "2026-07-20T12:00:00.000Z",
    },
    section,
  );
}
