"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Moon,
  Plus,
  Radar,
  Sparkles,
  Store,
  Sun,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useProduct, type Section } from "@/lib/product/store";
import { HeartbeatStrip } from "@/components/product/heartbeat";
import { CommandSection } from "@/components/product/command";
import { StoresSection, ConnectDialog } from "@/components/product/stores";
import { MissionsSection } from "@/components/product/missions";
import { ChatSection } from "@/components/product/chat";
import { DecisionsSection } from "@/components/product/decisions";
import { WatchSection } from "@/components/product/watch";
import { SkillsSection } from "@/components/product/skills";

const NAV: { id: Section; label: string; icon: typeof Radar }[] = [
  { id: "command", label: "Command", icon: LayoutDashboard },
  { id: "stores", label: "Stores", icon: Store },
  { id: "missions", label: "Missions", icon: ClipboardList },
  { id: "chat", label: "Commander", icon: MessageSquare },
  { id: "decisions", label: "Decisions", icon: CheckCircle2 },
  { id: "watch", label: "Watch", icon: Radar },
  { id: "skills", label: "Skills", icon: Sparkles },
];

export default function Home() {
  const { section, setSection, decisions, toastQueue, stores, hydrate } =
    useProduct();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [connectOpen, setConnectOpen] = useState(false);

  // live-backend hydration (no-op in mock mode; seeds remain the fallback)
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // drain the store's toast queue → shadcn toasts
  useEffect(() => {
    if (toastQueue.length === 0) return;
    const [first, ...rest] = toastQueue;
    useProduct.setState({ toastQueue: rest });
    toast({ title: first.title, description: first.desc });
  }, [toastQueue, toast]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setSection("command")}
            className="flex items-center gap-2.5"
            aria-label="UNiCOM home"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground"
              aria-hidden
            >
              U
            </span>
            <span className="hidden font-semibold tracking-tight sm:block">
              UNiCOM
            </span>
          </button>
          <span className="hidden text-xs text-muted-foreground md:block">
            multi-store command center
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant="outline"
              className="hidden gap-1.5 font-mono text-[10px] text-primary sm:flex"
            >
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              {stores.length} stores live
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <ConnectCta open={connectOpen} onOpenChange={setConnectOpen} />
          </div>
        </div>
        <HeartbeatStrip />
      </header>

      {/* Body: rail + content */}
      <div className="flex flex-1">
        {/* Desktop rail */}
        <nav
          className="sticky top-[5.3rem] hidden h-fit w-56 shrink-0 flex-col gap-1 border-r bg-sidebar p-3 lg:flex"
          aria-label="Primary"
        >
          {NAV.map((n) => (
            <RailButton
              key={n.id}
              active={section === n.id}
              label={n.label}
              icon={<n.icon className="h-4 w-4" />}
              badge={n.id === "decisions" ? decisions.length : 0}
              onClick={() => setSection(n.id)}
            />
          ))}
          <div className="mt-4 rounded-lg border border-dashed p-3 text-[10px] leading-relaxed text-muted-foreground">
            Every agent action leaves evidence. Every risky action needs your
            checkbox. That&apos;s the whole contract.
          </div>
        </nav>

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          <div className="mx-auto max-w-6xl">
            {section === "command" && <CommandSection />}
            {section === "stores" && <StoresSection />}
            {section === "missions" && <MissionsSection />}
            {section === "chat" && <ChatSection />}
            {section === "decisions" && <DecisionsSection />}
            {section === "watch" && <WatchSection />}
            {section === "skills" && <SkillsSection />}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden"
        aria-label="Primary mobile"
      >
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setSection(n.id)}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors ${section === n.id ? "text-primary" : "text-muted-foreground"}`}
            aria-current={section === n.id ? "page" : undefined}
          >
            <n.icon className="h-4 w-4" />
            <span className="truncate">{n.label}</span>
            {n.id === "decisions" && decisions.length > 0 && (
              <span className="absolute right-2 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[8px] font-bold text-amber-950">
                {decisions.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <footer className="mt-auto border-t bg-sidebar px-4 py-3 pb-16 sm:px-6 lg:pb-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            UNiCOM · every action leaves evidence · nothing risky ships
            without your checkbox
          </span>
          <span className="font-mono">
            watch ring green · powered by zcode
          </span>
        </div>
      </footer>
    </div>
  );
}

function RailButton({
  active,
  label,
  icon,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  badge: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-amber-950">
          {badge}
        </span>
      )}
    </button>
  );
}

function ConnectCta({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <>
      <Button size="sm" onClick={() => onOpenChange(true)}>
        <Plus className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">Connect a store</span>
        <span className="sm:hidden">Connect</span>
      </Button>
      <ConnectDialog open={open} onOpenChange={onOpenChange} />
    </>
  );
}
