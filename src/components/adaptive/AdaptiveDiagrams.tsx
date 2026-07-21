import type { DiagramType } from "@/lib/contracts/adaptation";

type DiagramStep = {
  label: string;
  detail: string;
};

function DiagramShell({
  id,
  eyebrow,
  title,
  steps,
  textAlternative,
}: {
  id: string;
  eyebrow: string;
  title: string;
  steps: DiagramStep[];
  textAlternative: string;
}) {
  return (
    <figure
      className="adaptive-card adaptive-diagram"
      aria-labelledby={`${id}-title`}
    >
      <p className="adaptive-eyebrow">{eyebrow}</p>
      <h3 id={`${id}-title`}>{title}</h3>
      <ol className="diagram-track" aria-hidden="true">
        {steps.map((step, index) => (
          <li key={step.label}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </li>
        ))}
      </ol>
      <figcaption>
        <strong>Text alternative:</strong> {textAlternative}
      </figcaption>
    </figure>
  );
}

export function RequestCycleDiagram() {
  return (
    <DiagramShell
      id="request-cycle-diagram"
      eyebrow="Visual map · request cycle"
      title="A respectful API request cycle"
      steps={[
        { label: "Request", detail: "The client asks for a resource." },
        { label: "Response", detail: "The server returns data or a limit." },
        {
          label: "Decision",
          detail: "The client reads the status and headers.",
        },
        { label: "Next action", detail: "Continue, wait, or stop safely." },
      ]}
      textAlternative="The client sends a request, reads the server response, checks the status and rate-limit headers, then either continues or waits before another attempt."
    />
  );
}

export function RetryTimelineDiagram() {
  return (
    <DiagramShell
      id="retry-timeline-diagram"
      eyebrow="Visual map · retry timeline"
      title="Retries spread out over time"
      steps={[
        { label: "429", detail: "The first request is rate limited." },
        { label: "Wait", detail: "Honor Retry-After when supplied." },
        { label: "Back off", detail: "Increase the bounded delay." },
        { label: "Retry", detail: "Try once the wait has elapsed." },
      ]}
      textAlternative="After a 429 response, the client waits for the server-directed interval, increases a bounded backoff delay when needed, and retries later instead of immediately."
    />
  );
}

export function RateLimitWindowDiagram() {
  return (
    <DiagramShell
      id="rate-limit-window-diagram"
      eyebrow="Visual map · rate-limit window"
      title="Requests inside a fixed allowance"
      steps={[
        { label: "Window opens", detail: "A new counting period begins." },
        {
          label: "Requests count",
          detail: "Each eligible call uses allowance.",
        },
        { label: "Limit reached", detail: "Further calls receive 429." },
        { label: "Window resets", detail: "Capacity becomes available again." },
      ]}
      textAlternative="During a rate-limit window, requests consume a fixed allowance. Once the allowance is exhausted, later calls receive 429 until the window resets."
    />
  );
}

export function ApprovedVisualMap({
  diagramType,
}: {
  diagramType: DiagramType;
}) {
  if (diagramType === "request-cycle") return <RequestCycleDiagram />;
  if (diagramType === "retry-timeline") return <RetryTimelineDiagram />;
  if (diagramType === "rate-limit-window") return <RateLimitWindowDiagram />;
  return null;
}
