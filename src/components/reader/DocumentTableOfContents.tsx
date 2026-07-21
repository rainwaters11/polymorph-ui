"use client";

import { useState } from "react";
import type {
  DocumentSection,
  SectionNavigationCallback,
} from "@/lib/contracts/document";

type DocumentTableOfContentsProps = {
  sections: DocumentSection[];
  activeSectionId: string;
  onNavigate: SectionNavigationCallback;
};

export function DocumentTableOfContents({
  sections,
  activeSectionId,
  onNavigate,
}: DocumentTableOfContentsProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <aside id="region-table-of-contents" className="document-toc">
      <button
        className="toc-mobile-trigger"
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="lesson-contents"
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span>
          <small>On this page</small>
          Lesson contents
        </span>
        <span aria-hidden="true">{mobileOpen ? "−" : "+"}</span>
      </button>

      <nav
        id="lesson-contents"
        aria-label="Lesson contents"
        className={mobileOpen ? "toc-nav is-open" : "toc-nav"}
      >
        <p className="toc-label">On this page</p>
        <ol>
          {sections.map((section, index) => {
            const active = activeSectionId === section.id;
            return (
              <li key={section.id}>
                <a
                  aria-current={active ? "location" : undefined}
                  className={active ? "is-active" : undefined}
                  href={`#${section.anchor}`}
                  onClick={() => {
                    onNavigate({
                      sectionId: section.id,
                      anchor: section.anchor,
                      source: "table-of-contents",
                    });
                    setMobileOpen(false);
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </a>
              </li>
            );
          })}
        </ol>
        <div className="toc-meta">
          <span>6 sections</span>
          <span>14 min</span>
        </div>
      </nav>
    </aside>
  );
}
