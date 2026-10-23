"use client";

// UNiCOM client state (zustand). Two modes:
//  - Mock (default): the operator-approved behavior — local seeds and reducers.
//  - Live (NEXT_PUBLIC_LIVE_BACKEND=1): the same actions talk to the real
//    backend (see ./api.ts), hydrating from it and degrading gracefully back
//    to seeds whenever a call fails.
import { create } from "zustand";
import {
  type Decision,
  type Mission,
  type Skill,
  type StoreConnection,
  type WatchEvent,
  SEED_DECISIONS,
  SEED_MISSIONS,
  SEED_SKILLS,
  SEED_STORES,
  SEED_WATCH_EVENTS,
} from "./data";
import {
  LIVE,
  type Brief,
  type ChatTurn,
  createDemoStore,
  fetchBrief,
  fetchChatHistory,
  fetchChatMessage,
  fetchDecisions,
  fetchMissions,
  fetchSkills,
  fetchStores,
  fetchWatch,
  installSkillRemote,
  resolveDecisionRemote,
  sendChatTurn,
} from "./api";

export type Section =
  | "command"
  | "stores"
  | "missions"
  | "chat"
  | "decisions"
  | "watch"
  | "skills";

type ResolvedDecision = {
  decision: Decision;
  verdict: "approved" | "declined";
  at: number;
};

type ChatMessage = {
  id: string;
  role: "merchant" | "agent";
  text: string;
  plan?: string[];
  planDone?: number;
  evidence?: string[];
};

interface ProductState {
  section: Section;
  live: boolean;
  hydrated: boolean;
  brief: Brief | null;
  stores: StoreConnection[];
  connecting: { platform: string; step: number } | null;
  missions: Mission[];
  decisions: Decision[];
  resolved: ResolvedDecision[];
  skills: Skill[];
  watchEvents: WatchEvent[];
  chat: ChatMessage[];
  chatThinking: boolean;
  toastQueue: { title: string; desc: string }[];

  hydrate: () => Promise<void>;
  setSection: (s: Section) => void;
  startConnect: (platform: string) => void;
  advanceConnect: () => void;
  submitConnect: (platform: string, name: string, domain: string) => Promise<void>;
  finishConnect: (
    store: Omit<StoreConnection, "installedSkills"> & { installedSkills?: string[] },
  ) => void;
  cancelConnect: () => void;
  resolveDecision: (id: string, verdict: "approved" | "declined") => Promise<void> | void;
  toggleSkill: (skillId: string, storeId: string) => void;
  sendChat: (text: string) => Promise<void> | void;
  pollChat: (msgId: string) => Promise<boolean>;
  tickPlan: (msgId: string) => void;
  pushToast: (title: string, desc: string) => void;
}

const CONNECT_STEPS = 3;

export const useProduct = create<ProductState>((set, get) => ({
  section: "command",
  live: LIVE,
  hydrated: false,
  brief: null,
  stores: SEED_STORES,
  connecting: null,
  missions: SEED_MISSIONS,
  decisions: SEED_DECISIONS,
  resolved: [],
  skills: SEED_SKILLS,
  watchEvents: SEED_WATCH_EVENTS,
  chat: [
    {
      id: "c-0",
      role: "agent",
      text: "Morning. All three stores are connected and green — Mountain Reads self-healed a rate-limit at 07:04Z, nothing needs you urgently. Ask me anything, or say things like “reprice the linen throw” or “why did Etsy jump 24%?”",
    },
  ],
  chatThinking: false,
  toastQueue: [],

  hydrate: async () => {
    if (!LIVE || get().hydrated) return;
    const [storesR, missionsR, decisionsR, skillsR, watchR, briefR, historyR] =
      await Promise.all([
        fetchStores(),
        fetchMissions(),
        fetchDecisions(),
        fetchSkills(),
        fetchWatch(),
        fetchBrief(),
        fetchChatHistory(),
      ]);
    if (!storesR && !decisionsR) return; // backend absent — stay on seeds
    set({
      hydrated: true,
      ...(storesR?.stores?.length ? { stores: storesR.stores } : {}),
      ...(missionsR?.missions?.length ? { missions: missionsR.missions } : {}),
      ...(decisionsR?.decisions ? { decisions: decisionsR.decisions } : {}),
      ...(skillsR?.skills?.length ? { skills: skillsR.skills } : {}),
      ...(watchR?.events?.length ? { watchEvents: watchR.events } : {}),
      ...(briefR?.brief ? { brief: briefR.brief } : {}),
      ...(historyR?.messages?.length
        ? {
            chat: historyR.messages.map((m: ChatTurn) => ({
              id: m.id,
              role: m.role,
              text: m.text,
              plan: m.plan,
              planDone: m.planDone,
              evidence: m.evidence,
            })),
          }
        : {}),
    });
  },

  setSection: (section) => set({ section }),

  startConnect: (platform) =>
    set({ connecting: { platform, step: 0 } }),

  advanceConnect: () =>
    set((s) => {
      if (!s.connecting) return {};
      const step = Math.min(s.connecting.step + 1, CONNECT_STEPS);
      return { connecting: { ...s.connecting, step } };
    }),

  // Live wizard completion: the backend owns the store record.
  submitConnect: async (platform, name, domain) => {
    if (!LIVE) return;
    const res = await createDemoStore(platform, name || undefined, domain || undefined);
    if (res?.store) {
      get().finishConnect(res.store);
    } else {
      set({ connecting: null });
      get().pushToast(
        "Connect failed",
        "The backend rejected the connection — check the console for details.",
      );
    }
  },

  finishConnect: (store) => {
    set((s) => ({
      stores: [...s.stores, { ...store, installedSkills: store.installedSkills ?? [] }],
      connecting: null,
      watchEvents: [
        {
          id: `e-${Date.now()}`,
          ts: new Date().toISOString().slice(11, 16) + "Z",
          kind: "heal" as const,
          actor: "connector",
          text: `${store.name} connected — initial catalog sync queued (${store.products} products)`,
        },
        ...s.watchEvents,
      ],
    }));
    get().pushToast("Store connected", `${store.name} joined the watch ring.`);
  },

  cancelConnect: () => set({ connecting: null }),

  resolveDecision: (id, verdict) => {
    const d = get().decisions.find((x) => x.id === id);
    if (!d) return;
    const apply = () => {
      set((s) => ({
        decisions: s.decisions.filter((x) => x.id !== id),
        resolved: [...s.resolved, { decision: d, verdict, at: Date.now() }],
        watchEvents: [
          {
            id: `e-${Date.now()}`,
            ts: new Date().toISOString().slice(11, 16) + "Z",
            kind: "review" as const,
            actor: "you",
            text: `${verdict === "approved" ? "Approved" : "Declined"} — ${d.title}`,
          },
          ...s.watchEvents,
        ],
      }));
      get().pushToast(
        verdict === "approved" ? "Decision approved" : "Decision declined",
        d.title,
      );
    };
    if (LIVE) {
      void resolveDecisionRemote(id, verdict).then((r) => {
        if (r?.decision) apply();
        else
          get().pushToast(
            "Resolve failed",
            "The backend could not record the verdict — try again.",
          );
      });
      return;
    }
    apply();
  },

  toggleSkill: (skillId, storeId) => {
    const skill = get().skills.find((s) => s.id === skillId);
    const store = get().stores.find((s) => s.id === storeId);
    if (!skill || !store) return;
    const has = skill.installedOn.includes(storeId);
    const apply = () => {
      set((s) => ({
        skills: s.skills.map((sk) =>
          sk.id === skillId
            ? {
                ...sk,
                installedOn: has
                  ? sk.installedOn.filter((x) => x !== storeId)
                  : [...sk.installedOn, storeId],
              }
            : sk,
        ),
        stores: s.stores.map((st) =>
          st.id === storeId
            ? {
                ...st,
                installedSkills: has
                  ? st.installedSkills.filter((x) => x !== skillId)
                  : [...st.installedSkills, skillId],
              }
            : st,
        ),
        watchEvents: has
          ? s.watchEvents
          : [
              {
                id: `e-${Date.now()}`,
                ts: new Date().toISOString().slice(11, 16) + "Z",
                kind: "dispatch" as const,
                actor: skillId,
                text: `${skill.name} installed on ${store.name} — initial sweep queued`,
              },
              ...s.watchEvents,
            ],
      }));
      get().pushToast(
        has ? "Skill removed" : "Skill installed",
        `${skill.name} ${has ? "removed from" : "installed on"} ${store.name}.`,
      );
    };
    if (LIVE) {
      void installSkillRemote(skillId, storeId, !has).then((r) => {
        if (r?.skill) apply();
        else
          get().pushToast("Install failed", "The backend could not toggle the skill.");
      });
      return;
    }
    apply();
  },

  sendChat: (text) => {
    const id = `c-${Date.now()}`;
    set((s) => ({
      chat: [...s.chat, { id, role: "merchant" as const, text }],
      chatThinking: true,
    }));
    if (LIVE) {
      void sendChatTurn(text).then((r) => {
        set((s) => ({
          chat: r?.message
            ? [
                ...s.chat,
                {
                  id: r.message.id,
                  role: "agent" as const,
                  text: r.message.text,
                  plan: r.message.plan,
                  planDone: r.message.planDone,
                  evidence: r.message.evidence ?? [],
                },
              ]
            : [
                ...s.chat,
                {
                  id: `${id}-a`,
                  role: "agent" as const,
                  text: "The backend is unreachable — showing you the mock flow instead. Try again in a moment.",
                },
              ],
          chatThinking: false,
        }));
      });
      return;
    }
    // Mock: the agent replies with a plan that ticks off (approved UX).
    setTimeout(() => {
      set((s) => ({
        chat: [
          ...s.chat,
          {
            id: `${id}-a`,
            role: "agent" as const,
            text: "On it. Here's my plan — I'll report evidence as each step lands.",
            plan: [
              "Pull the last 30 days across your connected stores",
              "Identify the SKU / listing in question",
              "Draft the change as a decision packet for you",
              "Attach evidence (diff, model, confidence)",
            ],
            planDone: 0,
            evidence: [],
          },
        ],
        chatThinking: false,
      }));
    }, 700);
  },

  // Live: pull a message's paced plan progress until it completes.
  pollChat: async (msgId) => {
    if (!LIVE) return true;
    const r = await fetchChatMessage(msgId);
    if (r?.message) {
      const m = r.message;
      set((s) => ({
        chat: s.chat.map((c) =>
          c.id === msgId
            ? { ...c, planDone: m.planDone, evidence: m.evidence ?? c.evidence }
            : c,
        ),
      }));
      return m.planDone >= (m.plan?.length ?? 0);
    }
    return true;
  },

  tickPlan: (msgId) =>
    set((s) => ({
      chat: s.chat.map((m) =>
        m.id === msgId && m.plan && m.planDone !== undefined
          ? { ...m, planDone: Math.min(m.planDone + 1, m.plan.length) }
          : m,
      ),
    })),

  pushToast: (title, desc) => set((s) => ({ toastQueue: [...s.toastQueue, { title, desc }] })),
}));
