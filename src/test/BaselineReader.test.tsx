import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaselineReader } from "@/components/reader/BaselineReader";
import { ASSISTANCE_CONSENT_STORAGE_KEY } from "@/lib/contracts/assistance";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("BaselineReader", () => {
  it("renders a credible baseline with stable anchor navigation", () => {
    render(<BaselineReader />);

    expect(
      screen.getByRole("heading", {
        name: "Rate limits, retries, and respectful clients",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /exponential backoff/i }),
    ).toHaveAttribute("href", "#exponential-backoff");
    expect(
      screen.getByRole("progressbar", { name: /lesson progress/i }),
    ).toHaveAttribute("aria-valuenow", "17");
    expect(
      screen.getByRole("button", { name: /help me with this section/i }),
    ).toBeInTheDocument();
  });

  it("defaults to offer and reports all assistance-consent choices", () => {
    const onPreferenceChange = vi.fn();
    render(
      <BaselineReader onAssistancePreferenceChange={onPreferenceChange} />,
    );

    const offer = screen.getByRole("radio", {
      name: /ask before changing/i,
    });
    const automatic = screen.getByRole("radio", {
      name: /adapt after a notice/i,
    });
    const manualOnly = screen.getByRole("radio", {
      name: /only when i ask/i,
    });

    expect(offer).toBeChecked();
    fireEvent.click(automatic);
    fireEvent.click(manualOnly);

    expect(onPreferenceChange).toHaveBeenNthCalledWith(1, "automatic");
    expect(onPreferenceChange).toHaveBeenNthCalledWith(2, "manual-only");
    expect(
      screen.getByRole("button", { name: /help me with this section/i }),
    ).toBeInTheDocument();
  });

  it("restores the learner's assistance choice across a page reload", async () => {
    const first = render(<BaselineReader />);
    fireEvent.click(screen.getByRole("radio", { name: /only when i ask/i }));
    expect(window.sessionStorage.getItem(ASSISTANCE_CONSENT_STORAGE_KEY)).toBe(
      "manual-only",
    );
    first.unmount();

    const onPreferenceChange = vi.fn();
    render(
      <BaselineReader onAssistancePreferenceChange={onPreferenceChange} />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("radio", { name: /only when i ask/i }),
      ).toBeChecked(),
    );
    expect(onPreferenceChange).toHaveBeenCalledWith("manual-only");
  });

  it("creates a grounded manual-help request without changing the lesson", () => {
    const onManualHelp = vi.fn();
    render(<BaselineReader onManualHelp={onManualHelp} />);

    const helpButton = screen.getByRole("button", {
      name: /help me with this section/i,
    });
    helpButton.focus();
    expect(helpButton).toHaveFocus();
    fireEvent.click(helpButton);
    fireEvent.click(screen.getByRole("radio", { name: /clarify/i }));
    fireEvent.click(screen.getByRole("button", { name: /request support/i }));

    expect(onManualHelp).toHaveBeenCalledTimes(1);
    expect(onManualHelp).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionId: "section-rate-limit-purpose",
        activeSectionAnchor: "why-rate-limits-exist",
        requestedMode: "plain-language",
        sourceSectionText: expect.stringContaining("finite compute"),
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Why APIs enforce rate limits" }),
    ).toBeInTheDocument();
    expect(helpButton).toHaveFocus();
  });

  it("returns keyboard focus to the help trigger after cancellation", () => {
    render(<BaselineReader />);

    const helpButton = screen.getByRole("button", {
      name: /help me with this section/i,
    });
    fireEvent.click(helpButton);
    const cancel = screen.getByRole("button", { name: /cancel/i });
    cancel.focus();
    expect(cancel).toHaveFocus();

    fireEvent.click(cancel);

    expect(helpButton).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: /request support/i }),
    ).not.toBeInTheDocument();
  });

  it("reports navigation and rereading through typed callback boundaries", () => {
    const onNavigate = vi.fn();
    const onTextInteraction = vi.fn();
    render(
      <BaselineReader
        onSectionNavigation={onNavigate}
        onTextInteraction={onTextInteraction}
      />,
    );

    fireEvent.click(
      screen.getByRole("link", { name: /why apis enforce rate limits/i }),
    );

    expect(onNavigate).toHaveBeenCalledWith({
      sectionId: "section-rate-limit-purpose",
      anchor: "why-rate-limits-exist",
      source: "table-of-contents",
    });
    expect(onTextInteraction).toHaveBeenCalledWith({
      sectionId: "section-rate-limit-purpose",
      anchor: "why-rate-limits-exist",
      type: "reread",
    });
  });

  it("reports glossary open and close interactions", () => {
    const onGlossaryInteraction = vi.fn();
    render(<BaselineReader onGlossaryInteraction={onGlossaryInteraction} />);

    const details = screen.getByText("Jitter").closest("details");
    expect(details).not.toBeNull();
    if (!details) return;

    details.open = true;
    fireEvent(details, new Event("toggle", { bubbles: true }));
    details.open = false;
    fireEvent(details, new Event("toggle", { bubbles: true }));

    expect(onGlossaryInteraction).toHaveBeenCalledWith({
      termId: "glossary-jitter",
      action: "open",
    });
    expect(onGlossaryInteraction).toHaveBeenCalledWith({
      termId: "glossary-jitter",
      action: "close",
    });
  });

  it("reports correct and incorrect quiz attempts", () => {
    const onQuizAttempt = vi.fn();
    render(<BaselineReader onQuizAttempt={onQuizAttempt} />);

    fireEvent.click(screen.getByRole("radio", { name: /retry immediately/i }));
    fireEvent.click(screen.getByRole("button", { name: /check answer/i }));
    expect(onQuizAttempt).toHaveBeenLastCalledWith(
      expect.objectContaining({
        questionId: "quiz-retry-strategy-01",
        selectedOptionId: "option-retry-immediately",
        correct: false,
      }),
    );

    fireEvent.click(
      screen.getByRole("radio", { name: /wait at least four seconds/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /check answer/i }));
    expect(onQuizAttempt).toHaveBeenLastCalledWith(
      expect.objectContaining({
        questionId: "quiz-retry-strategy-01",
        selectedOptionId: "option-wait-four-seconds",
        correct: true,
      }),
    );
    expect(
      screen.getByText(/correct\. the server has supplied/i),
    ).toBeInTheDocument();
  });
});
