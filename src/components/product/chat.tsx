"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Send, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProduct } from "@/lib/product/store";

// Commander — the chat-first surface. You talk; the orchestrator plans,
// acts across every connected store, and reports evidence inline.
// Risky steps become decisions on the frontier, never silent actions.
export function ChatSection() {
  const { chat, chatThinking, sendChat, tickPlan } = useProduct();
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat, chatThinking]);

  // tick the newest agent plan forward
  useEffect(() => {
    const last = chat[chat.length - 1];
    if (!last?.plan || last.role !== "agent") return;
    if ((last.planDone ?? 0) >= last.plan.length) return;
    const t = setTimeout(() => tickPlan(last.id), 900);
    return () => clearTimeout(t);
  }, [chat, tickPlan]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    sendChat(text);
    setDraft("");
  };

  const suggestions = [
    "Why did Etsy revenue jump 24%?",
    "Reprice the linen throw",
    "Draft a recovery email for abandoned carts",
  ];

  return (
    <div className="flex h-[calc(100dvh-12.5rem)] flex-col space-y-4 lg:h-[calc(100dvh-11.5rem)]">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Commander</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One agent, every store. It plans first, shows evidence, and packs
          risky moves as decisions.
        </p>
      </header>

      <Card className="flex min-h-0 flex-1 flex-col">
        <div
          ref={scroller}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
          aria-live="polite"
        >
          {chat.map((m) =>
            m.role === "merchant" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-xl rounded-br-sm border bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[88%] space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md border bg-card">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      orchestrator
                    </span>
                  </div>
                  <div className="rounded-xl rounded-bl-sm border bg-card px-3.5 py-2.5 text-sm leading-relaxed">
                    {m.text}
                  </div>
                  {m.plan && (
                    <div className="rounded-xl border bg-muted/40 p-3">
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        plan
                      </p>
                      <ol className="space-y-1.5">
                        {m.plan.map((step, i) => {
                          const done = i < (m.planDone ?? 0);
                          const active = i === (m.planDone ?? 0);
                          return (
                            <li
                              key={step}
                              className={`flex items-center gap-2 text-xs transition-opacity ${done ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground opacity-60"}`}
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${done ? "border-primary bg-primary text-primary-foreground" : ""}`}
                                aria-hidden
                              >
                                {done ? <Check className="h-2.5 w-2.5" /> : null}
                              </span>
                              {step}
                              {active && (
                                <motion.span
                                  animate={{ opacity: [1, 0.4, 1] }}
                                  transition={{ repeat: Infinity, duration: 1.2 }}
                                  className="text-primary"
                                >
                                  ▍
                                </motion.span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
          {chatThinking && (
            <div className="flex items-center gap-2 pl-8 text-xs text-muted-foreground">
              <motion.span
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ repeat: Infinity, duration: 1.1 }}
              >
                orchestrator thinking…
              </motion.span>
            </div>
          )}
        </div>

        <div className="border-t p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendChat(s)}
                className="rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tell the agent what you need…"
              aria-label="Message the agent"
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="icon" disabled={!draft.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Plans → evidence → decisions. The agent never changes a store
            without your checkbox on the frontier.
          </p>
        </div>
      </Card>
    </div>
  );
}
