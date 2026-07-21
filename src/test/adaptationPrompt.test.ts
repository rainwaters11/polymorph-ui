import { describe, expect, it } from "vitest";
import { ADAPTATION_SYSTEM_PROMPT } from "@/lib/ai/adaptationPrompt";

describe("adaptation planning prompt", () => {
  it("specifies a bounded, source-grounded Focus Mission for quiz retries", () => {
    expect(ADAPTATION_SYSTEM_PROMPT).toContain(
      'When reasonCodes includes "QUIZ_RETRY", design a Focus Mission',
    );
    expect(ADAPTATION_SYSTEM_PROMPT).toContain(
      'use "plain-language" as primaryMode',
    );
    expect(ADAPTATION_SYSTEM_PROMPT).toContain(
      "progressively more explicit, source-grounded steps",
    );
  });
});
