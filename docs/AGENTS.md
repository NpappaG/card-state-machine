# Repository Guidelines

## Project Structure & Module Organization
The root contains `README.md` (game brief) and `docs/XSTATE_DOCS.md` (implementation reference); keep both updated when adding mechanics. Place production code under `src/`, grouping domain modules by concern (e.g., `src/machines/turnCycleMachine.ts`, `src/services/deck.ts`). Keep presentational layers in `src/ui/` when React components arrive, and house shared constants under `src/config/`. Put unit and integration tests in `tests/` mirroring the `src` tree (`tests/machines/turnCycleMachine.test.ts`). Any supporting diagrams or flow specs should live in `docs/` so the design narrative stays co-located with the XState cheat sheet.

## Build, Test, and Development Commands
Use Bun for everything once `package.json` lands:

- `bun install` — installs and locks dependencies; run whenever `package.json` or `bun.lockb` changes.
- `bun run dev` — start the local playground or UI shell with hot reload.
- `bun test` — executes the Vitest suite in `tests/`.
- `bun run lint` — run ESLint + Prettier to enforce formatting before commit.
- `bun run typecheck` — invoke `tsc --noEmit` to confirm machine schemas and guards stay type-safe.

## Coding Style & Naming Conventions
Write all runtime code in TypeScript with two-space indentation and semicolons enabled. Name states and events in SCREAMING_SNAKE_CASE (`WAITING_FOR_PLAY`, `PLAY_CARD`), actions/guards in lowerCamelCase (`logCard`, `hasPlayableCard`), and actor files in kebab-case. Keep machine definitions pure, delegating side effects to helpers. Prefer small context objects (`hand`, `discardTop`, `timerMs`) and comment only when logic is non-obvious. Formatting is handled via ESLint + Prettier using the default Bun config.

## Testing Guidelines
Adopt Vitest for unit coverage and target critical decision paths: guard truth tables, multi-card selection flows, and timer expirations. Name specs after the module under test (`turnCycleMachine.test.ts`) and arrange them in `describe` blocks mirroring state names. Aim for ≥90% statement coverage on `src/machines/` and include at least one integration test that spins up an actor with `createActor`. Run `bun test --coverage` before submitting a PR and attach failing snapshots or logs when reporting regressions.

## Commit & Pull Request Guidelines
The existing history (`Init with readme`, `Initial commit`) sets the precedent: use short, imperative titles (`Add draw-state guard`). Reference issue numbers in the body, outline machine changes, and mention affected files. PRs must include: concise summary, testing evidence (`bun test` output), screenshots or GIFs for UI changes, and notes on statechart updates referencing `docs/`. Request a review from a game-logic owner whenever transitioning a machine to or from a final state.
