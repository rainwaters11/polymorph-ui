import type { AdaptiveModeComponentProps } from "@/lib/adaptation/registry";

export function FocusReader({ sourceSection }: AdaptiveModeComponentProps) {
  return (
    <section className="adaptive-panel focus-reader" data-adaptive-mode="focus">
      <div className="mode-chip">
        <span aria-hidden="true">01</span>
        Focus
      </div>
      <p className="adaptive-overline">One section · reduced competition</p>
      <h2>{sourceSection.title}</h2>
      <p className="focus-reader-summary">{sourceSection.summary}</p>
      <div className="focus-reader-cue">
        <span aria-hidden="true">→</span>
        <p>
          Start with this section&apos;s main idea. The full wording remains one
          control away.
        </p>
      </div>
    </section>
  );
}
