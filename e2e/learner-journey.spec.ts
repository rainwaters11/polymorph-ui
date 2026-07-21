import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

type JsonRecord = Record<string, unknown>;

const forbiddenPayloadTerms = [
  "keystroke",
  "clipboard",
  "wallet",
  "biometric",
  "diagnosis",
  "email",
  "name",
];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sourceSectionIdFor(body: JsonRecord) {
  if (typeof body.sourceSectionId === "string") return body.sourceSectionId;
  if (isRecord(body.manualRequest)) {
    const sectionId = body.manualRequest.sectionId;
    if (typeof sectionId === "string") return sectionId;
  }
  return "section-rate-limit-purpose";
}

function successfulPlan(sourceSectionId: string) {
  return {
    sourceSectionId,
    frictionState: "high-friction",
    primaryMode: "visual-map",
    supportingModes: ["plain-language", "check-understanding"],
    presentation: {
      density: "reduced",
      hideSecondaryNavigation: true,
      emphasizeCurrentSection: true,
      increaseSpacing: true,
      preserveScrollPosition: true,
    },
    instructionalSupport: {
      heading: "Make rate limits easier to follow",
      explanation:
        "A rate limit is a server rule that controls how many requests may arrive during a period.",
      glossary: [
        {
          term: "Rate limit",
          definition: "A bounded request allowance.",
        },
      ],
      steps: [
        "Read the response status.",
        "Check Retry-After.",
        "Wait before retrying.",
      ],
      analogy: "It works like a paced entry line.",
      diagramType: "rate-limit-window",
    },
    knowledgeCheck: {
      question: "What should a client do after a 429 response?",
      options: ["Retry immediately", "Read Retry-After and wait"],
      correctIndex: 1,
      explanation: "A respectful client follows the server's wait guidance.",
    },
    transparency: {
      reasonSummary:
        "Repeated rereading and quiz retries made a clearer view useful.",
      reasonCodes: ["REPEATED_SELECTION", "JARGON_DWELL", "QUIZ_RETRY"],
    },
    controls: {
      allowDismiss: true,
      allowReset: true,
      allowPause: true,
      showOriginalText: true,
    },
  };
}

async function installSuccessfulAdaptation(
  page: Page,
  options: { delayMs?: number } = {},
) {
  const requests: JsonRecord[] = [];

  await page.route("**/api/adapt", async (route: Route) => {
    const body: unknown = route.request().postDataJSON();
    if (!isRecord(body)) throw new Error("Expected a JSON adaptation request");
    requests.push(body);

    if (options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }

    try {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          plan: successfulPlan(sourceSectionIdFor(body)),
          fallback: false,
          requestId: "playwright-deterministic-plan",
        }),
      });
    } catch {
      // A cancelled request intentionally closes before a delayed response.
    }
  });

  return requests;
}

async function triggerOffer(page: Page) {
  const demoButton = page.getByRole("button", {
    name: /simulate reading friction/i,
  });
  await demoButton.focus();
  await demoButton.press("Enter");
  await expect(
    page.getByRole("heading", { name: /would a clearer view help/i }),
  ).toBeVisible();
  return demoButton;
}

async function requestManualHelp(page: Page) {
  const helpButton = page.getByRole("button", {
    name: /help me with this section/i,
  });
  await helpButton.focus();
  await helpButton.press("Enter");
  const requestButton = page.getByRole("button", { name: /request support/i });
  await requestButton.focus();
  await requestButton.press("Enter");
  return helpButton;
}

async function expectNoAccessibilityViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const summary = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target),
  }));
  expect(summary).toEqual([]);
}

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
}

test("completes the privacy-safe learner journey and restores place and focus", async ({
  page,
}) => {
  const requests = await installSuccessfulAdaptation(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /rate limits, retries, and respectful clients/i,
    }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);

  const demoButton = page.getByRole("button", {
    name: /simulate reading friction/i,
  });
  await demoButton.focus();
  await page.evaluate(() => window.scrollTo(0, 420));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(420);
  const preservedScroll = await page.evaluate(() => window.scrollY);
  await demoButton.press("Enter");
  await expect(
    page.getByRole("heading", { name: /would a clearer view help/i }),
  ).toBeVisible();

  const adaptNow = page.getByRole("button", { name: /adapt now/i });
  await adaptNow.focus();
  await adaptNow.press("Enter");

  await expect.poll(() => requests.length).toBe(1);
  const request = requests[0];
  expect(Object.keys(request).sort()).toEqual(
    [
      "assessment",
      "authorization",
      "sourceSectionId",
      "sourceSectionText",
    ].sort(),
  );
  expect(request.authorization).toBe("telemetry-consent");
  expect(request.sourceSectionId).toBe("section-rate-limit-purpose");
  expect(String(request.sourceSectionText)).toContain("finite compute");
  expect(isRecord(request.assessment)).toBe(true);
  if (!isRecord(request.assessment)) throw new Error("Missing assessment");
  expect(Object.keys(request.assessment).sort()).toEqual(
    [
      "eligibleForAdaptation",
      "episodeId",
      "reasonCodes",
      "recommendedModes",
      "score",
      "state",
    ].sort(),
  );
  const serializedRequest = JSON.stringify(request).toLowerCase();
  for (const forbiddenTerm of forbiddenPayloadTerms) {
    expect(serializedRequest).not.toContain(forbiddenTerm);
  }

  const adaptedHeading = page.getByRole("heading", {
    level: 2,
    name: "Make rate limits easier to follow",
  });
  await expect(adaptedHeading).toBeVisible();
  await expect(adaptedHeading).toBeFocused();
  await expect(page.locator('[data-primary-mode="visual-map"]')).toBeVisible();
  await expect(page.getByText(/text alternative:/i)).toBeVisible();
  await expectNoAccessibilityViolations(page);

  const originalToggle = page.getByRole("button", {
    name: /show original text/i,
  });
  await originalToggle.focus();
  await originalToggle.press("Enter");
  await expect(
    page.getByRole("article", { name: /original text/i }),
  ).toBeVisible();

  const pause = page.getByRole("button", { name: /pause telemetry/i });
  await pause.focus();
  await pause.press("Enter");
  const resume = page.getByRole("button", { name: /resume telemetry/i });
  await expect(resume).toBeVisible();
  await resume.focus();
  await resume.press("Enter");

  const correctAnswer = page.getByRole("radio", {
    name: /read retry-after and wait/i,
  });
  await correctAnswer.focus();
  await correctAnswer.press("Space");
  const checkAnswer = page.getByRole("button", { name: /check my answer/i });
  await checkAnswer.focus();
  await checkAnswer.press("Enter");

  await expect(page.getByText(/restoring the full lesson/i)).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /rate limits, retries, and respectful clients/i,
    }),
  ).toBeVisible();
  await expect(demoButton).toBeFocused();
  await expect
    .poll(async () =>
      Math.abs((await page.evaluate(() => window.scrollY)) - preservedScroll),
    )
    .toBeLessThanOrEqual(32);
});

test("decline sends no request and manual-only makes no proactive transition", async ({
  page,
}) => {
  const requests = await installSuccessfulAdaptation(page);
  await page.goto("/");

  await triggerOffer(page);
  const stayStandard = page.getByRole("button", {
    name: /stay in standard view/i,
  });
  await stayStandard.focus();
  await stayStandard.press("Enter");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /rate limits, retries, and respectful clients/i,
    }),
  ).toBeVisible();
  expect(requests).toHaveLength(0);

  const manualOnly = page.getByRole("radio", { name: /only when i ask/i });
  await manualOnly.focus();
  await manualOnly.press("Space");
  await page
    .getByRole("button", { name: /simulate reading friction/i })
    .click();
  await page.waitForTimeout(4_700);
  await expect(
    page.getByRole("heading", { name: /would a clearer view help/i }),
  ).toHaveCount(0);
  expect(requests).toHaveLength(0);

  await requestManualHelp(page);
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].authorization).toBe("learner-request");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Make rate limits easier to follow",
    }),
  ).toBeVisible();
});

test("AI-disabled fallback keeps every escape control usable by keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await triggerOffer(page);

  const fallbackResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/adapt") &&
      response.request().method() === "POST",
  );
  const adaptNow = page.getByRole("button", { name: /adapt now/i });
  await adaptNow.focus();
  await adaptNow.press("Enter");
  const response = await fallbackResponse;
  expect(response.status()).toBe(200);
  const responseBody: unknown = await response.json();
  expect(isRecord(responseBody) && responseBody.fallback).toBe(true);

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: /a simpler view of this section/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/complete safe fallback is shown/i),
  ).toBeAttached();

  const showOriginal = page.getByRole("button", {
    name: /show original text/i,
  });
  await showOriginal.focus();
  await showOriginal.press("Enter");
  await expect(
    page.getByRole("article", { name: /original text/i }),
  ).toBeVisible();

  const pause = page.getByRole("button", { name: /pause telemetry/i });
  await pause.focus();
  await pause.press("Enter");
  const reset = page.getByRole("button", { name: /reset view/i });
  await reset.focus();
  await reset.press("Enter");
  await expect(page.getByText(/reading telemetry is paused/i)).toBeVisible();

  const helpButton = await requestManualHelp(page);
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: /a simpler view of this section/i,
    }),
  ).toBeVisible();
  const dismiss = page.getByRole("button", {
    name: /return to standard view/i,
  });
  await dismiss.focus();
  await dismiss.press("Enter");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /rate limits, retries, and respectful clients/i,
    }),
  ).toBeVisible();
  await expect(helpButton).toBeFocused();
});

test("a stalled request can be cancelled and its late response stays stale", async ({
  page,
}) => {
  const requests = await installSuccessfulAdaptation(page, { delayMs: 800 });
  await page.goto("/");
  const demoButton = await triggerOffer(page);
  await page.getByRole("button", { name: /adapt now/i }).press("Enter");

  const cancel = page.getByRole("button", {
    name: /cancel and return to the lesson/i,
  });
  await expect(cancel).toBeFocused();
  await cancel.press("Enter");
  await expect(demoButton).toBeFocused();
  await page.waitForTimeout(1_000);

  expect(requests).toHaveLength(1);
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Make rate limits easier to follow",
    }),
  ).toHaveCount(0);
  await expect(page.getByText(/focused learning view is ready/i)).toHaveCount(
    0,
  );
});

test("adapted controls reflow on mobile and a 200% zoom equivalent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installSuccessfulAdaptation(page, { delayMs: 250 });
  await page.goto("/");

  expect(
    await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
  await expectNoPageOverflow(page);

  await requestManualHelp(page);
  const loader = page.locator(".workspace-loader");
  await expect(loader).toBeVisible();
  const animationDurationSeconds = await loader.evaluate((element) => {
    const duration = getComputedStyle(element).animationDuration;
    return duration.endsWith("ms")
      ? Number.parseFloat(duration) / 1_000
      : Number.parseFloat(duration);
  });
  expect(animationDurationSeconds).toBeLessThanOrEqual(0.000_01);

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Make rate limits easier to follow",
    }),
  ).toBeVisible();
  await expect(page.getByText(/text alternative:/i)).toBeVisible();
  await expectNoPageOverflow(page);

  // A 1280px desktop viewport at 200% browser zoom has roughly 640 CSS
  // pixels available for reflow. This verifies the equivalent layout width.
  await page.setViewportSize({ width: 640, height: 900 });
  for (const name of [
    /show original text/i,
    /pause telemetry/i,
    /reset view/i,
    /return to standard view/i,
  ]) {
    await expect(page.getByRole("button", { name })).toBeVisible();
  }
  await expectNoPageOverflow(page);
  await expectNoAccessibilityViolations(page);
});
