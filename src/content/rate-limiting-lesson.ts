import type { TechnicalLesson } from "@/lib/contracts/document";

export const rateLimitingLesson: TechnicalLesson = {
  id: "lesson-api-rate-limiting-v1",
  kicker: "API reliability · Core concept",
  title: "Rate limits, retries, and respectful clients",
  objective:
    "Learn how to read rate-limit signals and design a retry strategy that protects both your application and the API it depends on.",
  estimatedMinutes: 14,
  sections: [
    {
      id: "section-rate-limit-purpose",
      anchor: "why-rate-limits-exist",
      eyebrow: "01 · Foundations",
      title: "Why APIs enforce rate limits",
      summary:
        "Rate limits turn shared capacity into a predictable contract instead of a race for resources.",
      readingMinutes: 2,
      blocks: [
        {
          id: "paragraph-rate-limit-capacity",
          type: "paragraph",
          text: "An API has finite compute, database connections, and downstream capacity. A rate limit defines how many requests a client may make during a window so that one integration cannot exhaust those shared resources. The limit protects availability, controls cost, and gives every client a more predictable experience.",
        },
        {
          id: "paragraph-rate-limit-contract",
          type: "paragraph",
          text: "A well-behaved client treats the limit as part of the API contract. It observes response headers, slows down when capacity is low, and retries only when the server indicates that another attempt is reasonable. Retrying immediately and repeatedly creates more load at the exact moment the service is asking for less.",
        },
        {
          id: "callout-budget-model",
          type: "callout",
          tone: "note",
          title: "Think in budgets, not speed bumps",
          text: "A rate limit is a request budget shared across a time window. Your client should plan how it spends that budget instead of waiting to fail at the boundary.",
        },
      ],
    },
    {
      id: "section-rate-limit-headers",
      anchor: "reading-rate-limit-headers",
      eyebrow: "02 · Response signals",
      title: "Reading the headers",
      summary:
        "Headers expose the size, remaining capacity, and reset point of the current request window.",
      readingMinutes: 3,
      blocks: [
        {
          id: "paragraph-header-variants",
          type: "paragraph",
          text: "Header names vary by provider, but most communicate the same three facts: the total allowance, the requests remaining, and the time when the budget resets. Read the provider documentation before assuming whether a reset value is a duration, a Unix timestamp, or a formatted date.",
        },
        {
          id: "table-header-reference",
          type: "table",
          caption: "Common rate-limit response headers",
          columns: ["Header", "What it communicates", "Client response"],
          rows: [
            [
              "RateLimit-Limit",
              "Maximum requests allowed in the current policy window",
              "Use it to pace planned work",
            ],
            [
              "RateLimit-Remaining",
              "Requests still available before the limit is reached",
              "Reduce concurrency as it approaches zero",
            ],
            [
              "RateLimit-Reset",
              "When the current budget becomes available again",
              "Schedule later work after the reset",
            ],
            [
              "Retry-After",
              "How long to wait before retrying this response",
              "Honor it before calculating a fallback delay",
            ],
          ],
        },
        {
          id: "code-header-example",
          type: "code",
          language: "http",
          label: "Example response",
          code: "HTTP/1.1 200 OK\nRateLimit-Limit: 100\nRateLimit-Remaining: 7\nRateLimit-Reset: 42",
        },
      ],
    },
    {
      id: "section-429-response",
      anchor: "handling-429-responses",
      eyebrow: "03 · Failure handling",
      title: "When the server returns 429",
      summary:
        "A 429 response is an instruction to pause, not proof that the request can never succeed.",
      readingMinutes: 2,
      blocks: [
        {
          id: "paragraph-429-semantics",
          type: "paragraph",
          text: "The HTTP status 429 Too Many Requests means the client has exceeded a rate policy. The response may include Retry-After as either a number of seconds or an HTTP date. A client should prefer that server-provided instruction because the server understands its own recovery window better than the caller does.",
        },
        {
          id: "callout-retry-after",
          type: "callout",
          tone: "warning",
          title: "Common mistake: retrying every failed request",
          text: "Retry only failures that are plausibly temporary, cap the number of attempts, and never retry a non-idempotent operation unless the API provides a safe idempotency mechanism.",
        },
        {
          id: "code-429-example",
          type: "code",
          language: "http",
          label: "Rate-limited response",
          code: 'HTTP/1.1 429 Too Many Requests\nContent-Type: application/json\nRetry-After: 4\n\n{ "error": "rate_limit_exceeded" }',
        },
      ],
    },
    {
      id: "section-exponential-backoff",
      anchor: "exponential-backoff",
      eyebrow: "04 · Retry strategy",
      title: "Exponential backoff",
      summary:
        "Each unsuccessful attempt increases the delay, creating room for a constrained service to recover.",
      readingMinutes: 3,
      blocks: [
        {
          id: "paragraph-backoff-formula",
          type: "paragraph",
          text: "With exponential backoff, the client multiplies a base delay after each unsuccessful attempt. A simple schedule might wait 500 ms, 1 second, 2 seconds, and 4 seconds. The growing interval reduces synchronized pressure and prevents a tight retry loop.",
        },
        {
          id: "paragraph-backoff-bounds",
          type: "paragraph",
          text: "Production clients also need boundaries: a maximum attempt count, a maximum delay, a request timeout, and cancellation support. If Retry-After is present, treat it as the minimum server-directed wait; otherwise calculate a bounded backoff delay.",
        },
        {
          id: "callout-backoff-rule",
          type: "callout",
          tone: "note",
          title: "A practical rule",
          text: "Server guidance first. Bounded exponential backoff second. A clear failure for the learner or caller when the attempt budget is exhausted.",
        },
      ],
    },
    {
      id: "section-jitter",
      anchor: "adding-jitter",
      eyebrow: "05 · Traffic shaping",
      title: "Why backoff needs jitter",
      summary:
        "Random variation keeps many clients from retrying in the same synchronized wave.",
      readingMinutes: 2,
      blocks: [
        {
          id: "paragraph-thundering-herd",
          type: "paragraph",
          text: "If thousands of clients fail together and use identical delays, they will wake together and create another traffic spike. This is sometimes called the thundering-herd problem. Jitter adds bounded randomness so retry attempts spread across the recovery window.",
        },
        {
          id: "timeline-retry-jitter",
          type: "timeline",
          title: "One possible retry timeline",
          description:
            "The base delay doubles while jitter changes the exact send time. The values are illustrative, not a universal policy.",
          steps: [
            { label: "Initial request", delay: "0 ms", detail: "Receives 429" },
            {
              label: "Retry 1",
              delay: "620 ms",
              detail: "500 ms base + jitter",
            },
            { label: "Retry 2", delay: "1.3 s", detail: "1 s base + jitter" },
            { label: "Retry 3", delay: "2.2 s", detail: "2 s base + jitter" },
          ],
        },
      ],
    },
    {
      id: "section-client-example",
      anchor: "typescript-client-example",
      eyebrow: "06 · Implementation",
      title: "A bounded TypeScript client",
      summary:
        "Combine server guidance, bounded attempts, cancellation, exponential delay, and jitter.",
      readingMinutes: 2,
      blocks: [
        {
          id: "paragraph-example-scope",
          type: "paragraph",
          text: "This compact example retries only 429 responses, respects Retry-After when it contains seconds, and otherwise uses full jitter. A production implementation should also classify network failures, parse HTTP-date values, record observability data, and follow the provider's exact policy.",
        },
        {
          id: "code-typescript-retry",
          type: "code",
          language: "typescript",
          label: "requestWithBackoff.ts",
          code: `const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });

export async function requestWithBackoff(
  url: string,
  signal?: AbortSignal,
) {
  const maxAttempts = 4;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(url, { signal });
    if (response.status !== 429) return response;

    if (attempt === maxAttempts - 1) break;
    const retryAfter = Number(response.headers.get("Retry-After"));
    const ceiling = 500 * 2 ** attempt;
    const delay = Number.isFinite(retryAfter)
      ? retryAfter * 1_000
      : Math.random() * ceiling;

    await sleep(Math.min(delay, 8_000), signal);
  }

  throw new Error("Request remained rate limited");
}`,
        },
        {
          id: "callout-idempotency",
          type: "callout",
          tone: "warning",
          title: "Before copying this pattern",
          text: "Confirm that retrying the operation is safe. Reads are usually idempotent; payments, messages, and other writes may require an idempotency key supplied by the API.",
        },
      ],
    },
  ],
  glossary: [
    {
      id: "glossary-rate-limit",
      term: "Rate limit",
      definition:
        "A policy that bounds how many requests a client may make during a defined window.",
    },
    {
      id: "glossary-idempotent",
      term: "Idempotent",
      definition:
        "An operation that has the same intended effect when performed more than once.",
    },
    {
      id: "glossary-backoff",
      term: "Exponential backoff",
      definition:
        "A retry strategy that increases the delay after each unsuccessful attempt.",
    },
    {
      id: "glossary-jitter",
      term: "Jitter",
      definition:
        "Bounded randomness added to a retry delay to spread requests over time.",
    },
    {
      id: "glossary-request-window",
      term: "Request window",
      definition:
        "The period over which an API counts requests against a limit.",
    },
    {
      id: "glossary-thundering-herd",
      term: "Thundering herd",
      definition:
        "A surge created when many waiting clients resume work at nearly the same moment.",
    },
  ],
  quiz: {
    id: "quiz-retry-strategy-01",
    prompt:
      "A request receives 429 with Retry-After: 4. What should a respectful client do first?",
    options: [
      {
        id: "option-retry-immediately",
        label: "Retry immediately, then start exponential backoff",
      },
      {
        id: "option-wait-four-seconds",
        label: "Wait at least four seconds before another eligible attempt",
      },
      {
        id: "option-increase-concurrency",
        label: "Increase concurrency so the remaining work finishes sooner",
      },
    ],
    correctOptionId: "option-wait-four-seconds",
    correctFeedback:
      "Correct. The server has supplied the minimum recovery delay, so the client should honor it before retrying.",
    incorrectFeedback:
      "Not quite. Start with the server's Retry-After guidance, then apply your bounded retry policy.",
  },
};
