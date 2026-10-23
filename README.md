# UNiCOM Console

**The merchant's multi-store command center.** Connect every store you run — Shopify, WooCommerce, Etsy, Amazon, Squarespace, BigCommerce — and command them all through agents that **watch, plan, act, and always leave evidence**, with a human approval gate in front of anything that mutates.

The interaction model distills the best features of zcode into commerce:

| zcode feature | UNiCOM surface |
| --- | --- |
| Agentic chat (plan → act → evidence) | **Commander** — ask anything; agents answer with evidence, not vibes |
| Human-in-the-loop frontier | **Decisions** — every write op is packed as an approval packet; nothing auto-executes |
| Multi-agent missions & lanes | **Missions** — orchestrated multi-step work with per-lane progress and evidence |
| Resident watch & heartbeats | **Watch** — a live event ring (heartbeat / anomaly / heal / review / dispatch) |
| Skills | **Skills** — installable capability packs with honest risk tiers |
| Morning brief | **Command** — the day starts with an evidence-first brief, not a dashboard hunt |

## Status

- **UI: complete and operator-approved** (mock-data phase). See `src/components/product/` + `src/lib/product/`.
- **Backend: Wave 1 in flight** — see `docs/BACKEND-ARCHITECTURE.md` for the lane map, frozen contracts, and API surface.

## Quickstart

```bash
bun install
cp .env.example .env            # fill APP_ENCRYPTION_KEY (see .env.example)
bun run db:push
bun run dev                     # http://localhost:3000
```

Verification battery (all lanes must pass all four):

```bash
bun run lint
bun run typecheck
bun test
bun run db:push
```

## Repo layout

```
prisma/schema.prisma      canonical data model (WAVE-1 FROZEN — TL-owned)
src/app/                  Next.js 16 App Router (single-page app shell + API routes)
src/components/product/   the operator-approved product UI (FROZEN during Wave 1)
src/components/ui/        shadcn/ui component set
src/lib/product/          UI types, seeds, zustand store (FROZEN during Wave 1)
src/server/               backend modules (lane-owned, see architecture doc)
docs/BACKEND-ARCHITECTURE.md   the Wave-1 contract packet
```

## Laws (short version — full version in AGENTS.md)

1. Nothing mutating ever runs without an approved **Decision**. No exceptions.
2. Evidence-first: every agent action leaves a trace in the watch ring.
3. Credentials are encrypted at rest (AES-256-GCM); plaintext secrets never touch the DB, logs, or git.
