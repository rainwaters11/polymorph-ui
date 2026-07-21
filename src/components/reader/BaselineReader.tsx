"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rateLimitingLesson } from "@/content/rate-limiting-lesson";
import {
  ASSISTANCE_CONSENT_STORAGE_KEY,
  isAssistanceConsentMode,
  type AdaptationMode,
  type AssistanceConsentMode,
  type AssistancePreferenceCallback,
  type ManualHelpCallback,
} from "@/lib/contracts/assistance";
import type {
  ActiveSectionCallback,
  GlossaryInteractionCallback,
  QuizAttemptCallback,
  ReaderTextInteractionCallback,
  SectionNavigation,
  SectionNavigationCallback,
} from "@/lib/contracts/document";
import { AssistancePreferences } from "@/components/controls/AssistancePreferences";
import { ManualHelpButton } from "@/components/controls/ManualHelpButton";
import { ManualHelpChooser } from "@/components/controls/ManualHelpChooser";
import { BaselineQuiz } from "@/components/reader/BaselineQuiz";
import { DocumentTableOfContents } from "@/components/reader/DocumentTableOfContents";
import { GlossaryPanel } from "@/components/reader/GlossaryPanel";
import { ReaderHeader } from "@/components/reader/ReaderHeader";
import { TechnicalDocument } from "@/components/reader/TechnicalDocument";

export type BaselineReaderProps = {
  onActiveSectionChange?: ActiveSectionCallback;
  onSectionNavigation?: SectionNavigationCallback;
  onGlossaryInteraction?: GlossaryInteractionCallback;
  onQuizAttempt?: QuizAttemptCallback;
  onTextInteraction?: ReaderTextInteractionCallback;
  onAssistancePreferenceChange?: AssistancePreferenceCallback;
  onManualHelp?: ManualHelpCallback;
};

export function getSectionSourceText(sectionId: string) {
  const section = rateLimitingLesson.sections.find(
    (item) => item.id === sectionId,
  );
  if (!section) return "";

  const blockText = section.blocks.map((block) => {
    if (block.type === "paragraph") return block.text;
    if (block.type === "code") return `${block.label}\n${block.code}`;
    if (block.type === "callout") return `${block.title}: ${block.text}`;
    if (block.type === "timeline") {
      return `${block.title}: ${block.steps
        .map((step) => `${step.label} (${step.delay}) ${step.detail}`)
        .join("; ")}`;
    }
    return `${block.caption}: ${block.rows.map((row) => row.join(" — ")).join("; ")}`;
  });

  return [section.title, section.summary, ...blockText].join("\n\n");
}

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `manual-${Date.now()}`;
}

export function BaselineReader({
  onActiveSectionChange,
  onSectionNavigation,
  onGlossaryInteraction,
  onQuizAttempt,
  onTextInteraction,
  onAssistancePreferenceChange,
  onManualHelp,
}: BaselineReaderProps) {
  const firstSection = rateLimitingLesson.sections[0];
  const [activeSectionId, setActiveSectionId] = useState(firstSection.id);
  const [consentMode, setConsentMode] =
    useState<AssistanceConsentMode>("offer");
  const [helpOpen, setHelpOpen] = useState(false);
  const [requestedMode, setRequestedMode] = useState<AdaptationMode>();
  const [statusMessage, setStatusMessage] = useState("");
  const helpButtonRef = useRef<HTMLButtonElement>(null);

  const activeSection = useMemo(
    () =>
      rateLimitingLesson.sections.find(
        (section) => section.id === activeSectionId,
      ) ?? firstSection,
    [activeSectionId, firstSection],
  );
  const activeIndex = rateLimitingLesson.sections.findIndex(
    (section) => section.id === activeSection.id,
  );
  const progress = Math.round(
    ((activeIndex + 1) / rateLimitingLesson.sections.length) * 100,
  );

  const activateSection = useCallback(
    (sectionId: string) => {
      const section = rateLimitingLesson.sections.find(
        (item) => item.id === sectionId,
      );
      if (!section) return;
      setActiveSectionId(section.id);
      onActiveSectionChange?.({
        sectionId: section.id,
        anchor: section.anchor,
      });
    },
    [onActiveSectionChange],
  );

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const sectionId = visible?.target.getAttribute("data-document-section");
        if (sectionId) activateSection(sectionId);
      },
      { rootMargin: "-22% 0px -58% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    const sections = document.querySelectorAll("[data-document-section]");
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [activateSection]);

  useEffect(() => {
    try {
      const storedMode = window.sessionStorage.getItem(
        ASSISTANCE_CONSENT_STORAGE_KEY,
      );
      if (isAssistanceConsentMode(storedMode)) {
        const timeout = window.setTimeout(() => {
          setConsentMode(storedMode);
          onAssistancePreferenceChange?.(storedMode);
        }, 0);
        return () => window.clearTimeout(timeout);
      }
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
      // The safe product default remains the learner-controlled offer path.
    }
  }, [onAssistancePreferenceChange]);

  function handleNavigation(navigation: SectionNavigation) {
    if (navigation.sectionId === activeSectionId) {
      onTextInteraction?.({
        sectionId: navigation.sectionId,
        anchor: navigation.anchor,
        type: "reread",
      });
    }
    activateSection(navigation.sectionId);
    onSectionNavigation?.(navigation);
  }

  function handleConsentChange(mode: AssistanceConsentMode) {
    setConsentMode(mode);
    try {
      window.sessionStorage.setItem(ASSISTANCE_CONSENT_STORAGE_KEY, mode);
    } catch {
      // Keep the in-memory preference usable when storage is unavailable.
    }
    onAssistancePreferenceChange?.(mode);
    setStatusMessage(
      mode === "manual-only"
        ? "Preference saved. The workspace will only change when you ask."
        : "Assistance preference saved for this session.",
    );
  }

  function submitManualHelp() {
    const request = {
      requestId: createRequestId(),
      sectionId: activeSection.id,
      activeSectionAnchor: activeSection.anchor,
      sourceSectionText: getSectionSourceText(activeSection.id),
      ...(requestedMode ? { requestedMode } : {}),
      requestedAt: new Date().toISOString(),
    };
    // Return focus to the stable trigger before the chooser unmounts. This
    // also gives the adaptive workspace a durable element to restore after
    // the learner exits the transformed view.
    helpButtonRef.current?.focus({ preventScroll: true });
    onManualHelp?.(request);
    setHelpOpen(false);
    setRequestedMode(undefined);
    setStatusMessage(
      `Support requested for “${activeSection.title}”. The original lesson remains unchanged.`,
    );
  }

  return (
    <div className="reader-app">
      <a className="skip-link" href="#region-technical-document">
        Skip to lesson
      </a>
      <ReaderHeader
        progress={progress}
        activeLabel={`Section ${activeIndex + 1} of ${rateLimitingLesson.sections.length}`}
      />

      <main>
        <section
          id="region-lesson-header"
          className="lesson-hero"
          aria-labelledby="lesson-title"
        >
          <div className="lesson-hero-copy">
            <p className="lesson-kicker">{rateLimitingLesson.kicker}</p>
            <h1 id="lesson-title">{rateLimitingLesson.title}</h1>
            <p className="lesson-objective">{rateLimitingLesson.objective}</p>
          </div>
          <dl className="lesson-meta">
            <div>
              <dt>Format</dt>
              <dd>Technical lesson</dd>
            </div>
            <div>
              <dt>Reading time</dt>
              <dd>{rateLimitingLesson.estimatedMinutes} minutes</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>Foundational</dd>
            </div>
          </dl>
        </section>

        <div className="reader-grid">
          <DocumentTableOfContents
            sections={rateLimitingLesson.sections}
            activeSectionId={activeSection.id}
            onNavigate={handleNavigation}
          />

          <div className="reader-content">
            <TechnicalDocument
              sections={rateLimitingLesson.sections}
              activeSectionId={activeSection.id}
              onTextInteraction={onTextInteraction}
            />
            <GlossaryPanel
              terms={rateLimitingLesson.glossary}
              onInteraction={onGlossaryInteraction}
            />
            <BaselineQuiz
              question={rateLimitingLesson.quiz}
              onAttempt={onQuizAttempt}
            />
          </div>

          <aside
            id="region-learning-support"
            className="support-panel"
            aria-label="Learning support"
          >
            <div className="support-context">
              <p>Current section</p>
              <strong>{activeSection.title}</strong>
              <span>{activeSection.readingMinutes} min read</span>
            </div>
            <ManualHelpButton
              buttonRef={helpButtonRef}
              expanded={helpOpen}
              onClick={() => setHelpOpen((open) => !open)}
            />
            {helpOpen && (
              <ManualHelpChooser
                activeSectionTitle={activeSection.title}
                selectedMode={requestedMode}
                onModeChange={setRequestedMode}
                onSubmit={submitManualHelp}
                onCancel={() => {
                  helpButtonRef.current?.focus({ preventScroll: true });
                  setHelpOpen(false);
                  setRequestedMode(undefined);
                }}
              />
            )}
            <AssistancePreferences
              value={consentMode}
              onChange={handleConsentChange}
            />
            <div className="privacy-note">
              <span aria-hidden="true">✓</span>
              <p>
                <strong>Session-only preference</strong>
                No diagnosis or personal profile is created.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <div className="sr-status" role="status" aria-live="polite">
        {statusMessage}
      </div>
    </div>
  );
}
