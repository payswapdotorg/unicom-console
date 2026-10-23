"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileSearch, GitBranch, Play, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useProduct } from "@/lib/product/store";
import {
  type Mission,
  type MissionLane,
  storeName,
  platformOf,
} from "@/lib/product/data";

// Missions — the multi-agent task board. Lanes, workers, progress, and the
// evidence drawer: every lane leaves chips you can open and inspect.
export function MissionsSection() {
  const missions = useProduct((s) => s.missions);
  const stores = useProduct((s) => s.stores);
  const [open, setOpen] = useState<Mission | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Missions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Multi-step work, split into lanes and run by workers — reviewed by
          the orchestrator before anything touches a store.
        </p>
      </header>

      <div className="space-y-4">
        {missions.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">{m.title}</h2>
                      <MissionBadge status={m.status} />
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      {m.brief}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3 w-3" /> started {m.started}
                      </span>
                      <span>{m.eta}</span>
                      <span className="inline-flex items-center gap-1">
                        <GitBranch className="h-3 w-3" /> {m.lanes.length} lanes
                      </span>
                      <span>
                        {m.stores.map((s) => {
                          const st = stores.find((x) => x.id === s);
                          return st
                            ? `${storeName(s)} (${platformOf(st.platform).name})`
                            : s;
                        }).join(" · ")}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpen(m)}
                  >
                    <FileSearch className="mr-1 h-3.5 w-3.5" /> Evidence
                  </Button>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  {m.lanes.map((l) => (
                    <LaneChip key={l.id} lane={l} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && <EvidenceSheet mission={open} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MissionBadge({ status }: { status: Mission["status"] }) {
  const map: Record<Mission["status"], { label: string; cls: string }> = {
    running: { label: "running", cls: "border-primary/40 text-primary" },
    "in-review": { label: "in review", cls: "border-amber-500/50 text-amber-600 dark:text-amber-400" },
    "awaiting-approval": { label: "awaiting you", cls: "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    done: { label: "done", cls: "border-primary/40 bg-primary/10 text-primary" },
  };
  const m = map[status];
  return (
    <Badge variant="outline" className={`text-[10px] ${m.cls}`}>
      {status === "running" && <Play className="mr-1 h-2.5 w-2.5" />}
      {m.label}
    </Badge>
  );
}

function LaneChip({ lane }: { lane: MissionLane }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium">{lane.name}</p>
        <span
          className={`shrink-0 rounded-full border px-1.5 py-px font-mono text-[9px] ${
            lane.status === "done"
              ? "border-primary/40 text-primary"
              : lane.status === "in-review"
                ? "border-amber-500/50 text-amber-600 dark:text-amber-400"
                : "border-primary/30 text-primary"
          }`}
        >
          {lane.status}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Progress value={lane.progress} className="h-1" />
        <span className="font-mono text-[10px] text-muted-foreground">
          {lane.progress}%
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
        worker {lane.worker}
      </p>
    </div>
  );
}

function EvidenceSheet({ mission }: { mission: Mission }) {
  return (
    <>
      <SheetHeader className="px-1">
        <SheetTitle className="pr-6 text-left">{mission.title}</SheetTitle>
        <SheetDescription className="text-left">
          The evidence trail — every lane&apos;s chips, verbatim. Nothing is
          claimed without a record behind it.
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-4 px-1 pb-6">
        {mission.lanes.map((l) => (
          <div key={l.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{l.name}</p>
              <span className="font-mono text-[10px] text-muted-foreground">
                {l.worker}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {l.evidence.map((e) => (
                <li
                  key={e}
                  className="rounded border bg-muted/50 px-2 py-1 font-mono text-[11px] text-foreground/80"
                >
                  {e}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="rounded-lg border border-dashed p-3 font-mono text-[11px] text-muted-foreground">
          diff bundle 41f2c9 · tl-review PASS · ship-gates 8/8
        </div>
      </div>
    </>
  );
}
