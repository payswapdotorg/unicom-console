// UNiCOM product model — types + seed data (UI-only phase; backend later).
// Every concept here maps to a proven zcode capability:
//   watch → resident watch with heartbeats
//   missions/lanes → multi-agent orchestration
//   decisions → the operator frontier (approve/require-changes)
//   evidence → evidence-first review (diffs, runs, durations)
//   skills → pluggable capability packs

export type PlatformId =
  | "shopify"
  | "woocommerce"
  | "etsy"
  | "amazon"
  | "squarespace"
  | "bigcommerce";

export type Platform = {
  id: PlatformId;
  name: string;
  glyph: string;
  tint: string; // tailwind text color class for the glyph
  catalog: string; // what it contributes once connected
};

export const PLATFORMS: Platform[] = [
  { id: "shopify", name: "Shopify", glyph: "S", tint: "text-emerald-500", catalog: "Products · Orders · Inventory · Customers" },
  { id: "woocommerce", name: "WooCommerce", glyph: "W", tint: "text-violet-400", catalog: "Products · Orders · Coupons · Media" },
  { id: "etsy", name: "Etsy", glyph: "E", tint: "text-orange-500", catalog: "Listings · Receipts · Reviews" },
  { id: "amazon", name: "Amazon", glyph: "a", tint: "text-amber-500", catalog: "Listings · Orders · FBA · Ads" },
  { id: "squarespace", name: "Squarespace", glyph: "◻", tint: "text-stone-400", catalog: "Products · Orders · Pages" },
  { id: "bigcommerce", name: "BigCommerce", glyph: "B", tint: "text-red-400", catalog: "Products · Orders · Carts" },
];

export type StoreHealth = "healthy" | "attention" | "syncing";

export type StoreConnection = {
  id: string;
  name: string;
  domain: string;
  platform: PlatformId;
  health: StoreHealth;
  lastSync: string; // humanized
  lastAudit: string;
  products: number;
  orders7d: number;
  revenue7d: number; // USD
  delta7d: number; // % vs previous week
  apiUsage: number; // 0-100
  installedSkills: string[];
};

export type MissionStatus =
  | "running"
  | "in-review"
  | "awaiting-approval"
  | "done";

export type MissionLane = {
  id: string;
  name: string;
  worker: string;
  status: "running" | "in-review" | "done";
  progress: number; // 0-100
  evidence: string[]; // evidence chips
};

export type Mission = {
  id: string;
  title: string;
  brief: string;
  stores: string[]; // store ids
  status: MissionStatus;
  eta: string;
  started: string;
  lanes: MissionLane[];
};

export type DecisionKind = "price" | "listing" | "refund" | "campaign";

export type Decision = {
  id: string;
  kind: DecisionKind;
  title: string;
  store: string; // store id
  proposedBy: string; // skill/agent name
  risk: "low" | "medium" | "high";
  impact: string; // one-line expected impact
  evidence: string[];
  detail: { label: string; value: string }[];
  expires: string;
};

export type WatchEvent = {
  id: string;
  ts: string;
  kind: "heartbeat" | "anomaly" | "heal" | "review" | "dispatch";
  actor: string; // skill or agent
  text: string;
};

export type Skill = {
  id: string;
  name: string;
  glyph: string;
  tagline: string;
  watches: string; // what it watches
  acts: string; // what it does
  risk: "read-only" | "acts-with-approval" | "autonomous";
  events7d: number;
  installedOn: string[]; // store ids
};

export const SEED_STORES: StoreConnection[] = [
  {
    id: "halcyon",
    name: "Halcyon Goods",
    domain: "halcyongoods.com",
    platform: "shopify",
    health: "healthy",
    lastSync: "2 min ago",
    lastAudit: "06:40Z",
    products: 412,
    orders7d: 318,
    revenue7d: 28450,
    delta7d: 12.4,
    apiUsage: 34,
    installedSkills: ["price-sentinel", "listing-optimizer", "cart-saver"],
  },
  {
    id: "mountain-reads",
    name: "Mountain Reads",
    domain: "mountainreads.co",
    platform: "woocommerce",
    health: "attention",
    lastSync: "11 min ago",
    lastAudit: "06:40Z",
    products: 1287,
    orders7d: 96,
    revenue7d: 8120,
    delta7d: -4.1,
    apiUsage: 61,
    installedSkills: ["price-sentinel", "review-responder"],
  },
  {
    id: "kaia",
    name: "Kaia Ceramics",
    domain: "kaiaceramics.etsy.com",
    platform: "etsy",
    health: "syncing",
    lastSync: "just now",
    lastAudit: "yesterday 21:12Z",
    products: 84,
    orders7d: 61,
    revenue7d: 4390,
    delta7d: 23.8,
    apiUsage: 12,
    installedSkills: ["listing-optimizer"],
  },
];

export const SEED_MISSIONS: Mission[] = [
  {
    id: "m-1",
    title: "Spring price audit across all stores",
    brief:
      "Reprice 61 SKUs flagged by Price Sentinel against competitor moves of the last 14 days. High-impact changes are packed as decisions for your approval.",
    stores: ["halcyon", "mountain-reads"],
    status: "awaiting-approval",
    eta: "2 lanes in review",
    started: "06:02Z",
    lanes: [
      { id: "l-1", name: "Competitor crawl + margin table", worker: "wkr-a7", status: "done", progress: 100, evidence: ["1,204 rows crawled", "margin-model v3 · 61 flagged", "run 41m 12s"] },
      { id: "l-2", name: "Reprice drafts + risk packing", worker: "wkr-c2", status: "in-review", progress: 100, evidence: ["61 drafts · 9 high-impact", "diff bundle 41f2c9", "TL review: 2 notes"] },
      { id: "l-3", name: "Apply approved changes", worker: "wkr-a7", status: "running", progress: 38, evidence: ["applying in batches of 10", "0 conflicts so far"] },
    ],
  },
  {
    id: "m-2",
    title: "Etsy listing refresh — Kaia Ceramics",
    brief:
      "Rewrite titles/tags for the 12 slowest listings using Listing Optimizer; A/B the top 4 against current copy.",
    stores: ["kaia"],
    status: "in-review",
    eta: "review by 12:00Z",
    started: "yesterday 22:47Z",
    lanes: [
      { id: "l-4", name: "Copy variants (12 listings × 3)", worker: "wkr-d9", status: "done", progress: 100, evidence: ["36 variants written", "keyword coverage +18%", "run 1h 04m"] },
      { id: "l-5", name: "A/B arm assignment", worker: "wkr-d9", status: "in-review", progress: 100, evidence: ["4 experiments staged", "traffic split 50/50"] },
    ],
  },
  {
    id: "m-3",
    title: "Abandoned-cart recovery funnel — Halcyon",
    brief:
      "Three-email sequence drafted from the buyer-thought teardowns; sends are packed as decisions before anything ships.",
    stores: ["halcyon"],
    status: "running",
    eta: "drafts ~11:30Z",
    started: "07:15Z",
    lanes: [
      { id: "l-6", name: "Sequence drafting", worker: "wkr-b1", status: "running", progress: 64, evidence: ["2 of 3 emails drafted"] },
      { id: "l-7", name: "Segment snapshot", worker: "wkr-b1", status: "done", progress: 100, evidence: ["1,847 carts in scope", "avg value $67.20"] },
    ],
  },
];

export const SEED_DECISIONS: Decision[] = [
  {
    id: "d-1",
    kind: "price",
    title: "Reprice 9 high-impact SKUs — Halcyon Goods",
    store: "halcyon",
    proposedBy: "Price Sentinel",
    risk: "medium",
    impact: "Est. +$1,840/mo margin at 95% confidence",
    evidence: ["margin-table v3", "competitor moves 14d", "elasticity model PASS"],
    detail: [
      { label: "SKU 8841 · Linen Throw", value: "$84 → $79 (−6.0%)" },
      { label: "SKU 2210 · Waffle Robe", value: "$118 → $126 (+6.8%)" },
      { label: "SKU 7702 · travel kit", value: "$52 → $49 (−5.8%)" },
      { label: "+ 6 more", value: "all within ±8%" },
    ],
    expires: "expires 18:00Z",
  },
  {
    id: "d-2",
    kind: "refund",
    title: "Refund order #MR-88113 — Mountain Reads",
    store: "mountain-reads",
    proposedBy: "Support Agent",
    risk: "low",
    impact: "Protects a 4× repeat buyer; order arrived damaged",
    evidence: ["photo evidence attached", "carrier scan shows damage", "buyer LTV $341"],
    detail: [
      { label: "Order", value: "#MR-88113 · $58.40" },
      { label: "Buyer", value: "repeat buyer · 4 orders" },
      { label: "Policy check", value: "within 30-day window" },
    ],
    expires: "expires 14:00Z",
  },
  {
    id: "d-3",
    kind: "listing",
    title: "Publish 12 rewritten Etsy listings — Kaia Ceramics",
    store: "kaia",
    proposedBy: "Listing Optimizer",
    risk: "medium",
    impact: "Projected +31% search impressions over 28 days",
    evidence: ["36 variants · A/B staged", "keyword coverage +18%", "no prohibited terms"],
    detail: [
      { label: "Titles", value: "12 rewritten (≤140 chars)" },
      { label: "Tags", value: "13/13 on every listing" },
      { label: "A/B arms", value: "top 4 listings, 50/50 split" },
    ],
    expires: "expires 12:00Z",
  },
];

export const SEED_WATCH_EVENTS: WatchEvent[] = [
  { id: "e-1", ts: "07:04Z", kind: "heal", actor: "inventory-sync", text: "Mountain Reads rate-limit recovered — backoff succeeded on retry 2 (self-healed, no action needed)" },
  { id: "e-2", ts: "06:58Z", kind: "anomaly", actor: "price-sentinel", text: "Competitor undercut detected on 3 Halcyon SKUs — packed as decision d-1" },
  { id: "e-3", ts: "06:40Z", kind: "review", actor: "tl-agent", text: "Overnight audit complete: 3 stores, 0 security findings, 2 margin flags" },
  { id: "e-4", ts: "06:02Z", kind: "dispatch", actor: "orchestrator", text: "Mission m-1 dispatched — 3 lanes, 2 workers assigned" },
  { id: "e-5", ts: "05:41Z", kind: "anomaly", actor: "cart-saver", text: "Abandoned-cart spike on Halcyon (+38% vs baseline) — mission m-3 spawned" },
];

export const SEED_SKILLS: Skill[] = [
  {
    id: "price-sentinel",
    name: "Price Sentinel",
    glyph: "⌖",
    tagline: "Watches competitor prices and your margins, 24/7.",
    watches: "competitor prices · cost changes · elasticity",
    acts: "drafts repricing decisions for your approval",
    risk: "acts-with-approval",
    events7d: 412,
    installedOn: ["halcyon", "mountain-reads"],
  },
  {
    id: "listing-optimizer",
    name: "Listing Optimizer",
    glyph: "✎",
    tagline: "Rewrites listings that stopped selling.",
    watches: "search rank · CTR · conversion per listing",
    acts: "drafts new titles/tags, A/B tests the top movers",
    risk: "acts-with-approval",
    events7d: 268,
    installedOn: ["halcyon", "kaia"],
  },
  {
    id: "cart-saver",
    name: "Cart Saver",
    glyph: "◔",
    tagline: "Catches abandoned carts before they cool.",
    watches: "cart events · checkout abandonment",
    acts: "drafts recovery emails (never sends without you)",
    risk: "acts-with-approval",
    events7d: 189,
    installedOn: ["halcyon"],
  },
  {
    id: "review-responder",
    name: "Review Responder",
    glyph: "☾",
    tagline: "Answers reviews in your voice, kindly and fast.",
    watches: "new reviews across all connected stores",
    acts: "drafts public replies; escalates the angry ones",
    risk: "acts-with-approval",
    events7d: 97,
    installedOn: ["mountain-reads"],
  },
  {
    id: "stock-scout",
    name: "Stock Scout",
    glyph: "▦",
    tagline: "Knows what you'll run out of, before you do.",
    watches: "inventory velocity · supplier lead times",
    acts: "read-only forecasts (restock packs coming soon)",
    risk: "read-only",
    events7d: 55,
    installedOn: [],
  },
  {
    id: "ad-watcher",
    name: "Ad Watcher",
    glyph: "◉",
    tagline: "Guards your ad spend like it's its own.",
    watches: "ROAS · burn rate · listing quality score",
    acts: "flags waste, never pauses campaigns without you",
    risk: "read-only",
    events7d: 31,
    installedOn: [],
  },
];

export const MORNING_BRIEF = {
  date: "2026-10-19",
  summary:
    "Night watch: all three stores healthy. One self-heal (Woo rate-limit), two margin flags packed as decisions, one recovery mission spawned.",
  checks: [
    "3 stores audited overnight — 0 security findings",
    "Mountain Reads rate-limit self-healed at 07:04Z",
    "2 margin flags → decision d-1 awaiting you",
    "Cart-saver spike +38% → mission m-3 running",
  ],
  numbers: [
    { label: "Revenue 7d", value: "$40,960", delta: "+9.2%", up: true },
    { label: "Orders 7d", value: "475", delta: "+6.1%", up: true },
    { label: "Open decisions", value: "3", delta: "2 urgent", up: null },
    { label: "Watch events", value: "854", delta: "all green", up: true },
  ],
};

export function storeName(id: string): string {
  return SEED_STORES.find((s) => s.id === id)?.name ?? id;
}

export function platformOf(id: PlatformId): Platform {
  return PLATFORMS.find((p) => p.id === id)!;
}
