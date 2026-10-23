"use client";

// UNiCOM client state (zustand). UI-only phase: all actions are local;
// the backend will replace the reducers with real API calls later.
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

  setSection: (s: Section) => void;
  startConnect: (platform: string) => void;
  advanceConnect: () => void;
  finishConnect: (store: Omit<StoreConnection, "installedSkills">) => void;
  cancelConnect: () => void;
  resolveDecision: (id: string, verdict: "approved" | "declined") => void;
  toggleSkill: (skillId: string, storeId: string) => void;
  sendChat: (text: string) => void;
  tickPlan: (msgId: string) => void;
  pushToast: (title: string, desc: string) => void;
}

const CONNECT_STEPS = 3;

export const useProduct = create<ProductState>((set, get) => ({
  section: "command",
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

  setSection: (section) => set({ section }),

  startConnect: (platform) =>
    set({ connecting: { platform, step: 0 } }),

  advanceConnect: () =>
    set((s) => {
      if (!s.connecting) return {};
      const step = Math.min(s.connecting.step + 1, CONNECT_STEPS);
      return { connecting: { ...s.connecting, step } };
    }),

  finishConnect: (store) => {
    set((s) => ({
      stores: [...s.stores, { ...store, installedSkills: [] }],
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
  },

  toggleSkill: (skillId, storeId) => {
    const skill = get().skills.find((s) => s.id === skillId);
    const store = get().stores.find((s) => s.id === storeId);
    if (!skill || !store) return;
    const has = skill.installedOn.includes(storeId);
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
  },

  sendChat: (text) => {
    const id = `c-${Date.now()}`;
    set((s) => ({
      chat: [...s.chat, { id, role: "merchant" as const, text }],
      chatThinking: true,
    }));
    // The agent replies with a plan that ticks off (UI mock; the backend
    // will stream real agent actions through here).
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
