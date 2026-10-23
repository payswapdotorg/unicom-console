// UNiCOM Console — live-backend API client (TL integration layer).
// Typed against docs/BACKEND-ARCHITECTURE.md §3 contracts. All fetchers are
// fail-soft: network/route errors return null and the store keeps its seeds
// (the approved mock behavior remains the graceful fallback).
import type {
  Decision,
  Mission,
  Skill,
  StoreConnection,
  WatchEvent,
} from "./data";

export const LIVE = process.env.NEXT_PUBLIC_LIVE_BACKEND === "1";

export type ChatTurn = {
  id: string;
  role: "merchant" | "agent";
  text: string;
  plan?: string[];
  planDone: number;
  evidence?: string[];
  agentMode?: "llm" | "offline";
  createdAt?: string;
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---- C1: stores & connect ----

export const fetchStores = () => getJson<{ stores: StoreConnection[] }>("/api/stores");

export const createDemoStore = (platform: string, name?: string, domain?: string) =>
  postJson<{ store: StoreConnection }>("/api/stores/demo", { platform, name, domain });

export const syncStore = (id: string) =>
  postJson<{ syncRun: { id: string; status: string } }>(`/api/stores/${id}/sync`, {});

// ---- C2: commander ----

export const sendChatTurn = (text: string) =>
  postJson<{ message: ChatTurn }>("/api/commander/chat", { text });

export const fetchChatHistory = () =>
  getJson<{ messages: ChatTurn[] }>("/api/commander/history?limit=50");

export const fetchChatMessage = (id: string) =>
  getJson<{ message: ChatTurn }>(`/api/commander/messages/${id}`);

// ---- C3: governance ----

export const fetchDecisions = () =>
  getJson<{ decisions: Decision[] }>("/api/decisions?status=open");

export const resolveDecisionRemote = (id: string, verdict: "approved" | "declined") =>
  postJson<{ decision: { id: string; status: string } }>(
    `/api/decisions/${id}/resolve`,
    { verdict },
  );

export const fetchMissions = () => getJson<{ missions: Mission[] }>("/api/missions");

export const fetchWatch = () =>
  getJson<{ events: WatchEvent[] }>("/api/watch?limit=50");

export const fetchSkills = () => getJson<{ skills: Skill[] }>("/api/skills");

export const installSkillRemote = (skillId: string, storeId: string, on: boolean) =>
  postJson<{ skill: Skill }>(`/api/skills/${skillId}/install`, { storeId, on });

export type Brief = {
  date: string;
  summary: string;
  checks: string[];
  numbers: { label: string; value: string; delta: string; up: boolean | null }[];
};

export const fetchBrief = () => getJson<{ brief: Brief }>("/api/brief");

export type Heartbeat = {
  storesHealthy: number;
  storesTotal: number;
  openDecisions: number;
  runningMissions: number;
  ts: string;
};

export const fetchHeartbeat = () => getJson<Heartbeat>("/api/heartbeat");
