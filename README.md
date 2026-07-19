# Polymorph UI

Polymorph UI is an adaptive technical-documentation reader MVP. It will respond to privacy-safe, aggregated signs
of reading friction with controlled, reversible presentation changes; it does not diagnose learners or execute
model-generated code.

## Local setup

1. Use Node.js 20.9 or newer.
2. Copy the example environment file: `cp .env.example .env.local`.
3. Add an OpenAI API key to `.env.local` only when a later server-side adaptation feature requires it.
4. Install dependencies: `npm install`.
5. Start the development server: `npm run dev`.
6. Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Start the Next.js development server.                  |
| `npm run lint`         | Run ESLint for the application and test files.         |
| `npm run typecheck`    | Run strict TypeScript checking without emitting files. |
| `npm test`             | Run the Vitest test suite.                             |
| `npm run build`        | Create a production Next.js build.                     |
| `npm run format:check` | Verify Prettier formatting.                            |

## Dependencies

Production dependencies are intentionally limited to the MVP architecture:

- `next`, `react`, and `react-dom` provide the Next.js App Router application runtime.
- `zod` will validate typed boundaries, including future server responses.
- `openai` is the official OpenAI JavaScript/TypeScript SDK for the future server-only adaptation route.

Development dependencies provide Tailwind CSS, linting, formatting, strict TypeScript, and the Vitest/Testing Library
test foundation. Exact resolved versions are recorded in `package-lock.json`.

## Architecture and contribution guidance

- [Working agreement](./AGENTS.md)
- [MVP design specification](./DESIGN.md)
- [Issue roadmap](./ISSUE_ROADMAP.md)
- [Repository-scoped Codex skills](./.agents/skills)

The repository currently contains only the foundation scaffold. The documentation reader, telemetry, deterministic
classifier, AI endpoint, adaptive UI, authentication, database, and deployment are intentionally deferred to their
dedicated issues.
