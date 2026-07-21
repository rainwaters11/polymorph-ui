import { useId, type ReactNode } from "react";
import type { AdaptiveModeComponentProps } from "@/lib/adaptation/registry";

type DiagramFrameProps = {
  title: string;
  description: string;
  steps: string[];
  children: (ids: { titleId: string; descriptionId: string }) => ReactNode;
};

function DiagramFrame({
  title,
  description,
  steps,
  children,
}: DiagramFrameProps) {
  const id = useId();
  const titleId = `${id}-diagram-title`;
  const descriptionId = `${id}-diagram-description`;

  return (
    <figure className="adaptive-diagram">
      <div className="diagram-heading">
        <p>Accessible visual map</p>
        <h3>{title}</h3>
      </div>
      {children({ titleId, descriptionId })}
      <figcaption>{description}</figcaption>
      <details className="diagram-text-alternative">
        <summary>Read this diagram as text</summary>
        <ol>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>
    </figure>
  );
}

export function RequestCycleDiagram() {
  const title = "A respectful request cycle";
  const description =
    "A client sends a request, the API checks its allowance, and an over-limit response sends the client into a wait before a bounded retry.";

  return (
    <DiagramFrame
      title={title}
      description={description}
      steps={[
        "The client sends one request.",
        "The API checks the request against the current allowance.",
        "An allowed request receives a normal response.",
        "An over-limit request receives 429 and timing guidance.",
        "The client waits before an eligible bounded retry.",
      ]}
    >
      {({ titleId, descriptionId }) => (
        <svg
          viewBox="0 0 760 300"
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
        >
          <title id={titleId}>{title}</title>
          <desc id={descriptionId}>{description}</desc>
          <path className="diagram-route" d="M176 92 H300" />
          <path className="diagram-route" d="M462 92 H584" />
          <path className="diagram-route secondary" d="M380 148 V220 H584" />
          <path className="diagram-route secondary" d="M584 220 H176 V150" />
          <g className="diagram-node client">
            <rect x="30" y="48" width="146" height="104" rx="24" />
            <text x="103" y="88" textAnchor="middle">
              Client
            </text>
            <text x="103" y="116" textAnchor="middle">
              sends request
            </text>
          </g>
          <g className="diagram-node server">
            <rect x="300" y="48" width="162" height="104" rx="24" />
            <text x="381" y="88" textAnchor="middle">
              API
            </text>
            <text x="381" y="116" textAnchor="middle">
              checks allowance
            </text>
          </g>
          <g className="diagram-node response">
            <rect x="584" y="48" width="146" height="104" rx="24" />
            <text x="657" y="88" textAnchor="middle">
              Response
            </text>
            <text x="657" y="116" textAnchor="middle">
              success or 429
            </text>
          </g>
          <g className="diagram-node wait">
            <rect x="584" y="190" width="146" height="78" rx="24" />
            <text x="657" y="222" textAnchor="middle">
              Wait
            </text>
            <text x="657" y="246" textAnchor="middle">
              then retry
            </text>
          </g>
          <text className="diagram-label" x="235" y="78" textAnchor="middle">
            request
          </text>
          <text className="diagram-label" x="523" y="78" textAnchor="middle">
            decision
          </text>
          <text className="diagram-label" x="471" y="211" textAnchor="middle">
            only after 429
          </text>
        </svg>
      )}
    </DiagramFrame>
  );
}

export function RetryTimelineDiagram() {
  const title = "Backoff spreads retries over time";
  const description =
    "The wait grows after each unsuccessful attempt, while jitter varies the exact send time.";

  return (
    <DiagramFrame
      title={title}
      description={description}
      steps={[
        "The initial request is sent at zero seconds and receives 429.",
        "Retry one waits about half a second plus jitter.",
        "Retry two waits about one second plus jitter.",
        "Retry three waits about two seconds plus jitter.",
        "The client stops when its bounded attempt budget is exhausted.",
      ]}
    >
      {({ titleId, descriptionId }) => (
        <svg
          viewBox="0 0 760 300"
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
        >
          <title id={titleId}>{title}</title>
          <desc id={descriptionId}>{description}</desc>
          <line className="timeline-axis" x1="62" y1="188" x2="706" y2="188" />
          {[
            { x: 92, label: "Request", delay: "0 ms", height: 70 },
            { x: 248, label: "Retry 1", delay: "~500 ms", height: 92 },
            { x: 432, label: "Retry 2", delay: "~1 s", height: 116 },
            { x: 654, label: "Retry 3", delay: "~2 s", height: 142 },
          ].map((item, index) => (
            <g key={item.label} className="timeline-attempt">
              <line x1={item.x} y1="188" x2={item.x} y2={188 - item.height} />
              <circle cx={item.x} cy={188 - item.height} r="13" />
              <text x={item.x} y="222" textAnchor="middle">
                {item.label}
              </text>
              <text x={item.x} y="248" textAnchor="middle">
                {item.delay}
              </text>
              {index > 0 && (
                <path
                  className="jitter-mark"
                  d={`M${item.x - 24} ${171 - item.height} l8 -9 l8 9 l8 -9 l8 9`}
                />
              )}
            </g>
          ))}
          <text className="diagram-label" x="380" y="280" textAnchor="middle">
            time moves forward →
          </text>
        </svg>
      )}
    </DiagramFrame>
  );
}

export function RateLimitWindowDiagram() {
  const title = "Requests inside one rate-limit window";
  const description =
    "Five requests fit inside the example allowance. Later requests wait until the next window begins.";

  return (
    <DiagramFrame
      title={title}
      description={description}
      steps={[
        "A request window begins with five available request slots.",
        "Each accepted request uses one slot.",
        "The sixth request is over the example limit and receives 429.",
        "The client waits instead of sending a tight retry loop.",
        "A new request becomes eligible after the window resets.",
      ]}
    >
      {({ titleId, descriptionId }) => (
        <svg
          viewBox="0 0 760 300"
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
        >
          <title id={titleId}>{title}</title>
          <desc id={descriptionId}>{description}</desc>
          <rect
            className="window-band"
            x="42"
            y="54"
            width="470"
            height="184"
            rx="28"
          />
          <text className="window-title" x="72" y="90">
            Current window · limit 5
          </text>
          {[0, 1, 2, 3, 4].map((index) => (
            <g key={index} className="request-token">
              <circle cx={104 + index * 86} cy="154" r="30" />
              <text x={104 + index * 86} y="161" textAnchor="middle">
                {index + 1}
              </text>
            </g>
          ))}
          <path className="window-divider" d="M542 44 V248" />
          <g className="blocked-request">
            <circle cx="624" cy="128" r="36" />
            <text x="624" y="135" textAnchor="middle">
              6
            </text>
            <text x="624" y="190" textAnchor="middle">
              429 · wait
            </text>
          </g>
          <path className="diagram-route secondary" d="M624 224 v36 H466" />
          <text className="diagram-label" x="564" y="280" textAnchor="middle">
            next window
          </text>
        </svg>
      )}
    </DiagramFrame>
  );
}

export function VisualMap({ plan }: AdaptiveModeComponentProps) {
  const diagramType = plan.instructionalSupport.diagramType;

  return (
    <section
      className="adaptive-panel visual-map"
      data-adaptive-mode="visual-map"
    >
      <div className="mode-chip">
        <span aria-hidden="true">◇</span>
        Visual map
      </div>
      {diagramType === "retry-timeline" && <RetryTimelineDiagram />}
      {diagramType === "rate-limit-window" && <RateLimitWindowDiagram />}
      {(diagramType === "request-cycle" || diagramType === "none") && (
        <RequestCycleDiagram />
      )}
    </section>
  );
}
