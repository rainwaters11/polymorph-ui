import { describe, expect, it } from "vitest";
import { rateLimitingLesson } from "@/content/rate-limiting-lesson";

describe("rate-limiting lesson fixture", () => {
  it("uses unique, stable identifiers and anchors", () => {
    const sectionIds = rateLimitingLesson.sections.map((section) => section.id);
    const anchors = rateLimitingLesson.sections.map(
      (section) => section.anchor,
    );
    const blockIds = rateLimitingLesson.sections.flatMap((section) =>
      section.blocks.map((block) => block.id),
    );
    const glossaryIds = rateLimitingLesson.glossary.map((term) => term.id);

    expect(new Set(sectionIds).size).toBe(sectionIds.length);
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(new Set(blockIds).size).toBe(blockIds.length);
    expect(new Set(glossaryIds).size).toBe(glossaryIds.length);
    expect(rateLimitingLesson.quiz.id).toBe("quiz-retry-strategy-01");
  });

  it("contains the complete local demonstration content pack", () => {
    const serialized = JSON.stringify(rateLimitingLesson);

    expect(serialized).toContain("429 Too Many Requests");
    expect(serialized).toContain("Retry-After");
    expect(serialized).toContain("Exponential backoff");
    expect(serialized).toContain("Jitter");
    expect(serialized).toContain("requestWithBackoff");
    expect(rateLimitingLesson.glossary.length).toBeGreaterThanOrEqual(5);
    expect(rateLimitingLesson.quiz.options).toHaveLength(3);
  });
});
