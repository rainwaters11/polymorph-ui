export function FoundationWelcome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section aria-labelledby="foundation-heading" className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Polymorph UI
        </p>
        <h1
          id="foundation-heading"
          className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl"
        >
          Foundation ready for the adaptive reader.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-700">
          The project scaffold is in place. Upcoming issues will add the
          documentation lesson, privacy-safe interaction summaries,
          deterministic friction scoring, and controlled adaptations.
        </p>
      </section>
    </main>
  );
}
