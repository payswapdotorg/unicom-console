# AGENTS.md — laws for every coding agent working this repo

These laws are binding for all lanes (C1 connectors, C2 commander, C3 governance) and for the TL at integration time. Violations are defects, not style issues.

## 1. Frozen files — do not touch

| Frozen asset | Why |
| --- | --- |
| `prisma/schema.prisma` | Canonical model, TL-owned. Need a change? Describe it in your COMPLETION REPORT; the TL applies it centrally. |
| `package.json`, `bun.lock` | No new dependencies in Wave 1. Everything you need is installed. Work around it. |
| `src/lib/product/**` | The operator-approved UI contract (types = API response shapes, store actions = API calls). Backend conforms to the UI, never the reverse. |
| `src/components/**` | Operator-approved UI. Zero changes. |
| `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` | Operator-approved UI shell. |
| `src/app/api/health/route.ts` | TL-owned liveness ping. |
| `src/server/display.ts` | TL-owned humanization helpers (arch doc §3). Import them; don't reimplement. |
| `src/server/connectors/types.ts` | Frozen connector interface (arch doc §2.1). |
| `src/server/connectors/execute.ts` | Signature frozen; C1 owns the body (arch doc §2.3). |
| `tests/display.test.ts` | Canonical test example; keep green. |

If your feature seems to require a frozen-file change, that is a design smell — re-read `docs/BACKEND-ARCHITECTURE.md` and find the lane-clean path. If it genuinely can't work, document it in your report.

## 2. Lane ownership — write only in your lane

The exact file paths each lane owns are in `docs/BACKEND-ARCHITECTURE.md` §1. Other lanes' files are read-only for you. The shared kernel is Prisma models + the two frozen interfaces (`ConnectorAdapter`, `LLMClient`) — code against them, don't modify them.

## 3. Product laws

1. **Approval gate is absolute.** The only code path that may execute a write op against a store is decision-resolution (approve → execute payload). The agent NEVER writes directly. Skills marked `read-only` never propose writes.
2. **Evidence-first.** Every meaningful server-side action (sync run, decision packed/resolved, skill installed, mission spawned, heal) records a `WatchEvent`.
3. **Honest degradation.** Empty DB → 200 with empty arrays / sensible defaults, never a 500. No LLM key → `"agentMode": "offline"` template replies, never a crash. Demo stores behave like real ones through the same connector interface.
4. **Secrets hygiene.** Credentials encrypt via `src/server/crypto.ts` (AES-256-GCM, `APP_ENCRYPTION_KEY`). Never log, echo, commit, or return plaintext credential material. Never commit `.env`.
5. **`z-ai-web-dev-sdk` is server-only.** Import it only in `src/server/**` or route handlers. Never in client components.
6. **TypeScript strict, no suppressions.** No `any` where a type exists, no `@ts-ignore`, no `eslint-disable` without a one-line justification comment.
7. **Tests are contract tests.** They must pass offline: inject a fake `fetch` (dependency injection) — never hit real platform APIs, never hit the LLM, never depend on wall-clock (inject `now`).

## 4. Verification battery (all four, every delivery)

```bash
bun install
bun run db:push
bun run lint        # 0 errors
bun run typecheck   # 0 errors
bun test            # all green
```

Plus a dev smoke: `bun run dev` boots, `curl localhost:3000/api/health` → `{"ok":true,...}`, and your lane's routes respond correctly on a fresh DB.

## 5. Git delivery

- Branch: `work/<your-lane-slug>` off `main`. Push early, push often.
- Never force-push `main`. Never commit secrets or `.env`.
- Commit messages: imperative, explain the why in the body when non-obvious.

## 6. COMPLETION REPORT (final commit message body or PR description)

```
COMPLETION REPORT — <lane id>
Base: <merge-base sha with main>  Tip: <branch head sha>
Battery: lint <n> errors | typecheck <n> errors | <n>/<n> tests passed (denominator from a real run)
Smoke: <routes you curled + status codes>
Scenarios: <each acceptance scenario from the work order: PASS/FAIL + one-line evidence>
Frozen-file conflicts: none | <list + justification>
Honest gaps: <what you did not do, flaky bits, TODOs handed to the TL>
```
