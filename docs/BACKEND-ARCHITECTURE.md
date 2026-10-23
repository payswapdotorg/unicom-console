# UNiCOM Console — Backend Architecture (Wave 1)

Wave 1 adds the backend behind the operator-approved UI. The UI is the contract:
**API response shapes are the types in `src/lib/product/data.ts`**, and **API routes are the actions in `src/lib/product/store.ts`**. The backend conforms to the UI — never the reverse.

Reading order for workers: `README.md` → this document → `AGENTS.md` (laws) → `src/lib/product/data.ts` + `store.ts` (UI contract) → your lane's work order.

---

## 0. Product thesis (why each piece exists)

The app distills zcode's proven interaction patterns into commerce:

- **Commander chat** — agentic plan → act → evidence, with read-only tools.
- **Decisions** — the approval gate: every mutating op is a packet a human approves. Nothing auto-executes. Ever.
- **Missions** — multi-lane orchestrated work with per-lane progress + evidence.
- **Watch** — a resident event ring (heartbeat / anomaly / heal / review / dispatch).
- **Skills** — installable capability packs with honest risk tiers (`read-only` / `acts-with-approval` / `autonomous`; in Wave 1 nothing is truly autonomous).
- **Demo mode** — every flow must work end-to-end without real platform credentials: demo stores behave like real ones through the same connector interface.

---

## 1. System map & lane ownership

```
src/server/
  display.ts                BASE (frozen) — humanization helpers (§3), used by all API layers
  crypto.ts                  C1  AES-256-GCM credential encryption
  connectors/
    types.ts                 BASE (frozen) — ConnectorAdapter interface + shared types
    execute.ts               BASE STUB — C1 replaces with registry-backed impl
    registry.ts              C1  getAdapter(platform) + adapter wiring
    demo.ts                  C1  the demo platform (deterministic fabrication)
    shopify.ts               C1  Admin API (REST, key/token auth)
    woocommerce.ts           C1  wc/v3 REST (key+secret)
    etsy.ts                  C1  Open API v3 (OAuth2)
    amazon.ts                C1  SP-API (LWA token + reports/products)
    squarespace.ts           C1  v1.1 REST (API key header)
    bigcommerce.ts           C1  v3 REST (access token header)
    sync.ts                  C1  runSync(storeId, kind) — catalog/orders pulls
  seed/
    stores.ts                C1  seedStores() — fixed ids, matches SEED_STORES
  llm/
    index.ts                 C2  LLMClient interface + getLLMClient() + llmStatus()
    zai.ts                   C2  z-ai-web-dev-sdk driver (server-only)
    openrouter.ts            C2  OpenRouter REST driver (portable, Vercel-friendly)
  agent/
    system-prompt.ts         C2  the Commander persona (evidence-first, gated writes)
    tools.ts                 C2  read-only commerce tools + propose_decision
    planner.ts               C2  intent → plan (LLM or honest offline template)
    runner.ts                C2  executes plan steps, accumulates evidence
  governance/
    decisions.ts             C3  decision lifecycle + resolution + execution seam
    missions.ts              C3  mission CRUD + lane progress
    watch.ts                 C3  watch-event queries + recording helpers
    skills.ts                C3  skill registry + installs
    brief.ts                 C3  morning-brief computation (template v1)
    seed.ts                  C3  seedGovernance() — skills/missions/decisions/events

src/app/api/
  health/route.ts            BASE (frozen)
  stores/route.ts            C1  GET list · (POST demo is separate)
  stores/demo/route.ts       C1  POST — create a demo store
  stores/[id]/route.ts       C1  GET detail · DELETE
  stores/[id]/sync/route.ts  C1  POST — run a sync
  connect/start/route.ts     C1  POST — key-mode verify or oauth redirect
  connect/verify/route.ts    C1  POST — oauth callback completion
  commander/chat/route.ts    C2  POST — merchant turn → agent reply
  commander/history/route.ts C2  GET — message history
  commander/messages/[id]/route.ts  C2  GET — single message (paced plan reveal)
  decisions/route.ts         C3  GET open decisions (auto-expires stale)
  decisions/[id]/resolve/route.ts  C3  POST approve/decline
  missions/route.ts          C3  GET list · POST spawn
  watch/route.ts             C3  GET event ring
  heartbeat/route.ts         C3  GET the heartbeat strip payload
  skills/route.ts            C3  GET skills with installs
  skills/[id]/install/route.ts  C3  POST install/uninstall on a store
  brief/route.ts             C3  GET morning brief

tests/
  display.test.ts            BASE (frozen) — canonical bun-test example
  connectors.test.ts         C1
  stores-api.test.ts         C1
  agent.test.ts              C2
  commander-api.test.ts      C2
  governance.test.ts         C3
```

**Cross-lane imports are only allowed through frozen seams:**

| Seam | Owner | Consumers may import |
| --- | --- | --- |
| `@/server/connectors/types` | base (frozen) | everyone |
| `@/server/connectors/execute` (`executeDecisionPayload`) | C1 (replaces base stub) | C3 only |
| `@/lib/db` (Prisma client) | base | everyone |
| Prisma models | TL (schema frozen) | everyone, directly |

C2 does not import C3 and vice-versa. Shared state flows through Prisma tables (`Decision`, `WatchEvent`), not module calls.

---

## 2. Frozen interfaces

### 2.1 `src/server/connectors/types.ts` (in base commit — do not modify)

```ts
export type PlatformId =
  | "shopify" | "woocommerce" | "etsy" | "amazon"
  | "squarespace" | "bigcommerce";

export type ConnectMode = "oauth" | "key" | "demo";

export interface ConnectInput {
  platform: PlatformId;
  mode: ConnectMode;
  fields: Record<string, string>; // e.g. { domain, key, secret, token }
}

export interface CredentialAuth {
  method: "oauth2" | "key" | "token" | "demo";
  secrets: Record<string, string>; // decrypted secret material
  meta: Record<string, string>;    // non-secret context (shop, scopes, endpoints)
}

export interface NormalizedProduct {
  remoteId: string;
  handle?: string;
  title: string;
  status: string;          // "active" | "draft" | "archived"
  priceCents: number;
  compareAtCents?: number;
  sku?: string;
  inventory: number;
  imageUrl?: string;
  url?: string;
  raw?: unknown;
}

export interface NormalizedOrder {
  remoteId: string;
  number: string;
  status: string;          // "open" | "fulfilled" | "refunded" | "cancelled"
  totalCents: number;
  currency: string;
  buyerEmail?: string;
  placedAt: string;        // ISO 8601
  raw?: unknown;
}

export type VerifyResult =
  | { ok: true; meta: Record<string, string> }
  | { ok: false; error: string; hint?: string };

export interface WriteResult { ok: true } | { ok: false; error: string } — see file.

export interface ConnectorAdapter {
  id: PlatformId;
  // Verify credentials against the real platform (or fabricate for demo).
  verify(input: ConnectInput, fetchImpl: FetchLike): Promise<VerifyResult>;
  fetchProducts(auth: CredentialAuth, fetchImpl: FetchLike, cursor?: string):
    Promise<{ items: NormalizedProduct[]; nextCursor?: string }>;
  fetchOrders(auth: CredentialAuth, fetchImpl: FetchLike, since?: string):
    Promise<{ items: NormalizedOrder[] }>;
  // The ONLY write op in Wave 1. Executed exclusively by decision resolution.
  applyPriceChange(auth: CredentialAuth, fetchImpl: FetchLike,
    input: { remoteId: string; priceCents: number }): Promise<WriteResult>;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
```

(If the committed file differs trivially in formatting, the committed file wins. `FetchLike` injection is how tests fake the network — production call sites pass `fetch`.)

### 2.2 `src/server/llm/index.ts` (C2-owned, but this public surface is frozen for consumers)

```ts
export type LLMStatus = {
  driver: "zai" | "openrouter" | "none";
  ready: boolean;
  detail: string; // human-readable, no secrets
};
export interface LLMMessage { role: "system" | "user" | "assistant"; content: string }
export interface LLMClient {
  chat(messages: LLMMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string>;
}
export function getLLMClient(): LLMClient | null; // null ⇒ offline mode
export function llmStatus(): LLMStatus;
```

### 2.3 `src/server/connectors/execute.ts` (base stub — C1 replaces the body, C3 imports the signature)

```ts
export type ExecutionResult = { ok: true } | { ok: false; error: string };
export async function executeDecisionPayload(input: {
  storeId: string | null;
  payload: unknown; // parsed Decision.payload JSON
}): Promise<ExecutionResult>;
```

C3 calls only this. C1's replacement routes `payload.op` (Wave 1: `"price_change"` with `{ remoteId, priceCents }`) to the store's adapter `applyPriceChange`; demo stores simulate deterministically and always succeed.

---

## 3. API contracts

All routes: `export const dynamic = "force-dynamic"`. Errors return `{ error: string, hint?: string }` with proper status codes. Empty DB → 200 + empty arrays, never 500. All list routes newest-first where ordering matters.

**Humanization (server-side, in the API layer — the UI renders these strings as-is):**
- `lastSync`: `"just now"` (<60s), `"N min ago"`, `"N h ago"`, `"yesterday HH:MMZ"`.
- `lastAudit` / `started` (missions): `"HH:MMZ"` today, else `"yesterday HH:MMZ"` (UTC).
- WatchEvent `ts`: `"HH:MMZ"` UTC. Decision `expires`: `"expires HH:MMZ"`.
- `revenue7d` raw USD number (e.g. `28450`); `delta7d` signed percent (e.g. `-4.1`); `apiUsage` 0–100 int.

### 3.1 C1 — stores & connect

**`GET /api/stores`** → `{ "stores": StoreConnection[] }`

```ts
StoreConnection = {
  id, name, domain, platform: PlatformId,
  health: "healthy" | "attention" | "syncing",
  lastSync: string, lastAudit: string,       // humanized
  products: number,                          // count from Product table
  orders7d: number,                          // Order count, last 7d
  revenue7d: number, delta7d: number,        // Order sums, last 7d vs prior 7d
  apiUsage: number,                          // 0-100 (sync-call volume estimate)
  installedSkills: string[]                  // SkillInstall joins
}
```

**`POST /api/stores/demo`** `{ "platform": PlatformId, "name"?: string, "domain"?: string }`
→ `{ "store": StoreConnection }` — creates Store (`demo:true`, fixed-suffix domain like `demo-shop.example.com` if omitted), demo Credential, fabricates catalog + 7d orders via the demo adapter (deterministic), runs initial sync synchronously, records WatchEvent `kind:"heal"` actor `"connector"` text `"<name> connected — initial catalog sync queued (<n> products)"`.

**`POST /api/connect/start`** `{ "platform": PlatformId, "mode": "key"|"oauth", "fields": {...} }`
- key mode: verify immediately against the real platform (real HTTP). Success → create store + credential + initial sync → `{ "store": StoreConnection }`. Failure → `422 { error, hint }` (actionable, e.g. "WooCommerce REST API keys rejected — check the Key/Secret and that the domain serves /wp-json/wc/v3").
- oauth mode: if the platform's OAuth app is configured (env), → `{ "redirectUrl": string }`; else → `501 { error: "oauth-not-configured", hint: "Add <PLATFORM>_CLIENT_ID/SECRET to .env, or connect with API keys instead" }`.

**`POST /api/connect/verify`** `{ "platform": PlatformId, "code": string, "state"?: string }` → `{ "store": StoreConnection }` (oauth token exchange + initial sync).

**`GET /api/stores/[id]`** → `{ "store": StoreConnection, "recentProducts": Product[](≤20), "recentOrders": Order[](≤20) }` (raw model rows, ISO dates).

**`POST /api/stores/[id]/sync`** `{ "kind"?: "full" | "incremental" }` → `{ "syncRun": { id, status, stats } }` — performs the sync synchronously (demo) or best-effort with bounded retries (real; 429 → backoff, ≥2 retries; final failure → SyncRun `failed` + honest error).

**`DELETE /api/stores/[id]`** → `{ "ok": true }` (cascade).

**Demo adapter semantics (the contract that makes the whole app demo-able):**
- Deterministic: seeded RNG keyed on store id — the same store id always fabricates the same catalog.
- `fetchProducts`: ~40–120 products/store, realistic names per platform (e.g. Shopify: "Linen Throw", "Waffle Robe"… reuse SEED flavor), priceCents 1200–24800, inventory 0–240.
- `fetchOrders(since?)`: orders spread over the last 14d; **when the store is a seed store, the last-7d revenue sum must land within ±5% of the UI seed targets** (halcyon 28450 / mountain-reads 8120 / kaia 4390). Incremental syncs add only orders newer than `since`.
- `applyPriceChange`: always `{ ok: true }` (simulated), mutating nothing external.
- Seed function `seedStores()` (in `src/server/seed/stores.ts`): upserts the three UI seed stores with **fixed ids** `halcyon`, `mountain-reads`, `kaia` (platforms shopify/woocommerce/etsy, domains/names from `SEED_STORES`), fabricating to the same targets. Idempotent.

**Real adapters (implement against current documented REST APIs):**
- Shopify Admin API REST (`/admin/api/2024-10/products.json`, `/orders.json`), `X-Shopify-Access-Token` header auth (custom-app token = key mode; OAuth = mode oauth), `Link`-header pagination.
- WooCommerce REST API v3 (`/wp-json/wc/v3/products`, `/orders`), Basic auth key:secret, `?per_page=100&page=n`.
- Etsy Open API v3 (`/v3/application/shops/me`, `/v3/application/shops/{shop_id}/listings/active`), OAuth2 bearer, `x-api-key` header.
- Amazon SP-API (LWA token at `api.amazon.com/auth/o2/token`, then product-listings reports / orders via the Selling Partner API; sandbox-able via `endpoint` meta).
- Squarespace Commerce API v1.1 (`/api/1.1/commerce/products`, `/orders`), `Authorization: Bearer <api-key>`.
- BigCommerce V3 REST (`/api/v3/catalog/products`, `/v2/orders`), `X-Auth-Token` + `X-Auth-Client` headers.
All adapters: 10s fetch timeout per call, bounded pagination (≤10 pages per fetch call in Wave 1), never throw raw — map to `VerifyResult`/`WriteResult` with actionable errors.

### 3.2 C2 — commander

**`POST /api/commander/chat`** `{ "text": string }` → `{ "message": ChatMessage }`

```ts
ChatMessage = {
  id, role: "merchant" | "agent", text: string,
  plan?: string[],          // ≥3 steps when action-y, evidence-flavored phrasing
  planDone: number,         // DB ends at plan.length; see pacing below
  evidence?: string[],      // one chip per executed step
  agentMode?: "llm" | "offline",
  createdAt: string
}
```

Flow: persist merchant message → planner (LLM if `getLLMClient()` non-null, else offline template) produces `{ reply, plan }` → persist agent message (planDone 0) → runner executes steps (read tools against the DB; each step appends evidence; `propose_decision` on write-intent creates a `Decision` row + WatchEvent) → persist final planDone=plan.length. All within the request (bounded: ≤5 tool calls, 10s budget — exceeding either ends the plan early with an honest evidence chip).

**`GET /api/commander/history?limit=50`** → `{ "messages": ChatMessage[] }` oldest→newest.

**`GET /api/commander/messages/[id]`** → `{ "message": ChatMessage }` — **paced plan reveal:** `planDone` returned = `min(dbPlanDone, 1 + floor(elapsedMs / 1500))` where `elapsedMs = now - createdAt`. Execution is already finished server-side; the pacing preserves the approved UI's step-tick animation statelessly (works on serverless). After `elapsed >= plan.length * 1500`, returns full progress.

**Planner (offline template)** — intent keywords: price/reprice/discount → price plan; listing/rewrite/tags → listing plan; why/jump/drop/spike → analysis plan; refund/return → support plan; default → survey plan. Templates: 4 steps each, phrased evidence-first ("Pull the last 30 days across your connected stores", …). Reply text acknowledges scope + names the stores involved (from DB).

**LLM planner** — one `chat()` call returning strict JSON `{ "reply": string, "plan": string[] }` (instruct + retry-once-on-malformed, then fall back to offline template + mark `agentMode:"offline"` honestly).

**Tools (all read Prisma directly; no connector HTTP in Wave 1):** `list_products(storeId, q?, limit?)`, `get_orders(storeId, days?)`, `summarize_store(storeId)` (7d revenue/orders/delta + health + top products), `compare_prices(storeId, skuOrTitle)`, `propose_decision({kind, title, storeId, risk, impact, evidence[], detail[], payload})` — writes Decision `status:"open"`, `proposedBy:"Commander"`, WatchEvent `kind:"anomaly"` actor `"commander"`. **`propose_decision` never executes anything.**

**System prompt persona:** the resident operator-agent. Concise, evidence-first, never promises actions it can't take, always surfaces which stores it looked at, ends write-intents by pointing at the Decisions queue. No emojis.

### 3.3 C3 — governance

**`GET /api/decisions?status=open`** → `{ "decisions": Decision[] }` — before responding, any `open` decision with `expiresAt < now` flips to `expired` (single sweep).

```ts
Decision = {
  id, kind: "price"|"listing"|"refund"|"campaign",
  title, store: string,          // store id (UI maps to name)
  proposedBy, risk: "low"|"medium"|"high", impact,
  evidence: string[], detail: { label, value }[],
  expires: string                // humanized
}
```

**`POST /api/decisions/[id]/resolve`** `{ "verdict": "approved" | "declined" }` → `{ "decision": { id, status } }`
- approved + payload present → `executeDecisionPayload(...)` (the C1 seam) → status `executed` | `failed` (+ `executionError`); demo stores succeed.
- approved + no payload → status `approved` (ack-only).
- declined → status `declined`.
- Records WatchEvent `kind:"review"` actor `"you"` text `"Approved — <title>"` / `"Declined — <title>"`. Already-resolved → `409 { error: "already-resolved" }`.

**`GET /api/missions`** → `{ "missions": Mission[] }` (UI shape; lanes ordered by `position`; stores = store ids).

**`POST /api/missions`** `{ "title", "brief", "storeIds": string[], "lanes": [{ "name", "worker" }] }` → `{ "mission": Mission }` — WatchEvent `kind:"dispatch"` actor `"orchestrator"`.

**`GET /api/watch?limit=50`** → `{ "events": WatchEvent[] }` newest-first.

**`GET /api/heartbeat`** → `{ "storesHealthy": n, "storesTotal": n, "openDecisions": n, "runningMissions": n, "ts": "HH:MMZ" }` — the always-visible strip.

**`GET /api/skills`** → `{ "skills": Skill[] }` (UI shape; `installedOn` = store ids from SkillInstall).

**`POST /api/skills/[id]/install`** `{ "storeId": string, "on": boolean }` → `{ "skill": Skill }` — install records WatchEvent `kind:"dispatch"` actor=skill id text `"<name> installed on <store> — initial sweep queued"`; uninstall is silent.

**`GET /api/brief`** → `{ "brief": MorningBrief }`

```ts
MorningBrief = {
  date: "YYYY-MM-DD",
  summary: string,   // template v1, honest, built from the last 24h ring
  checks: string[],  // 3-5 lines: stores audited, heals, open decisions count, running missions
  numbers: { label, value, delta, up: boolean | null }[]  // revenue/orders 7d, open decisions, watch events 24h
}
```
Template v1 is deterministic — no LLM dependency in Wave 1.

**Seed `seedGovernance()`** (`src/server/governance/seed.ts`): upserts the six `SEED_SKILLS` (fixed slug ids), `SEED_MISSIONS`-flavored demo missions (fixed ids `m-1`,`m-2`,`m-3` referencing seed store ids), `SEED_DECISIONS`-flavored open decisions (fixed ids `d-1`,`d-2`,`d-3`, `expiresAt` = now + 6h/3h/1h), and the `SEED_WATCH_EVENTS` ring (ts = today's clock, staggered backwards). Idempotent.

---

## 4. Seeds & the golden path

After `bun run db:push`, a fresh dev environment reaches the approved-UI golden path via:

```
bun -e "import('./src/server/seed/stores').then(m=>m.seedStores())"
bun -e "import('./src/server/governance/seed').then(m=>m.seedGovernance())"
```

(TL will chain both in `scripts/seed.ts` at integration.) Seed order: stores first, governance second (it references store ids). Connect a NEW store via `POST /api/stores/demo` — the wizard's flow works identically for demo and real stores.

## 5. Test rules

- `bun test`, files under `tests/*.test.ts`. No network, no wall-clock, no LLM.
- Fake `fetch` via `FetchLike` injection; fake `now` via an injectable clock (`() => Date.now()` parameter defaulting to the real one).
- Route-handler tests: import the route's `GET`/`POST` and call with a `Request` — assert status + body. Use a scratch SQLite file (`DATABASE_URL=file:./tests/tmp-<name>.db` set before Prisma client instantiation, or `bun test` per-file env).
- Denominators in every report come from a real run, never estimates.

## 6. Integration & deploy (TL-owned — informative for lanes)

1. Merge order: C1 → C2 → C3 (the execute-seam makes any order safe; this one is natural). TL re-runs the full battery per merge.
2. TL rewires `src/lib/product/store.ts` behind `NEXT_PUBLIC_LIVE_BACKEND=1`: hydration actions calling the APIs above, graceful fallback to seeds when unreachable (the sandbox preview stays mock-capable).
3. TL adds `scripts/seed.ts` chaining both seed functions.
4. Vercel deploy: Neon Postgres (`DATABASE_URL`), provider swap in schema at build (TL concern), `LLM_DRIVER=openrouter` + key, `APP_ENCRYPTION_KEY`.
5. Sandbox `:3000` flips to live-backend mode against the same repo.
