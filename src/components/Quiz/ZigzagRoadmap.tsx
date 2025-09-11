// ZigZagRoadmap.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Check, Lock, Star } from "lucide-react";

export type Module = {
  module_id: string;
  title?: string;
  stage_number: number;
  module_number: number;
  description?: string;
  est_minutes?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
};

type State = "done" | "current" | "locked";

export default function ZigZagRoadmap({
  modules,
  progress,
  totalModules,
}: {
  modules: Module[];
  progress: { module_number: number; stage_number: number };
  totalModules: number;
}) {
  const router = useRouter();

  // ===== Sheet / selection state =====
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Module | null>(null);
  const [selectedState, setSelectedState] = useState<State>("locked");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Layout constants
  const NODE = 72;
  const STEP_Y = 135;
  const OFFSET_X = 120;
  const LINE_THICK = 10;

  // Sort modules by stage then module number
  const sorted = useMemo(
    () =>
      [...modules].sort((a, b) =>
        a.stage_number === b.stage_number
          ? a.module_number - b.module_number
          : a.stage_number - b.stage_number,
      ),
    [modules],
  );

  // Node state
  const stateForModule = (m: Module): State => {
    if (m.stage_number < progress.stage_number) return "done";
    if (m.stage_number > progress.stage_number) return "locked";
    if (m.module_number < progress.module_number) return "done";
    if (m.module_number === progress.module_number) return "current";
    return "locked";
  };

  // Edge state (based on previous node)
  const isEdgeDone = (prev: Module) => {
    if (prev.stage_number < progress.stage_number) return true;
    if (prev.stage_number > progress.stage_number) return false;
    return prev.module_number < progress.module_number;
  };
  const isEdgeCurrent = (prev: Module) => {
    if (prev.stage_number !== progress.stage_number) return false;
    return prev.module_number === progress.module_number;
  };

  // Compute positions (centered zig-zag)
  const nodes = useMemo(() => {
    return sorted.map((m, i) => {
      const y = i * STEP_Y;
      const x = i === 0 ? 0 : i % 2 === 1 ? +OFFSET_X : -OFFSET_X;
      return { m, x, y } as const;
    });
  }, [sorted]);

  const containerHeight = (sorted.length - 1) * STEP_Y + NODE;

  // Handlers
  const onSelectNode = (m: Module) => {
    const idx = sorted.findIndex((x) => x.module_id === m.module_id);
    const st = stateForModule(m);
    setSelected(m);
    setSelectedIndex(idx >= 0 ? idx : null);
    setSelectedState(st);
    setOpen(true);
  };

  const gotoIndex = (idx: number) => {
    if (idx < 0 || idx >= sorted.length) return;
    const m = sorted[idx];
    setSelected(m);
    setSelectedIndex(idx);
    setSelectedState(stateForModule(m));
  };

  const beginLesson = () => {
    if (!selected) return;
    if (selectedState === "locked") return;
    router.push(`/home/quiz?module=${selected.module_id}`);
  };

  // Arrow key navigation while sheet is open (bounded)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (selectedIndex == null) return;
      if (e.key === "ArrowLeft" && selectedIndex > 0) {
        e.preventDefault();
        gotoIndex(selectedIndex - 1);
      }
      if (e.key === "ArrowRight" && selectedIndex < sorted.length - 1) {
        e.preventDefault();
        gotoIndex(selectedIndex + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selectedIndex, sorted.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Course Roadmap</h2>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {Math.min(progress.module_number, totalModules)}/{totalModules}{" "}
            completed
          </Badge>
          <Progress
            value={(progress.module_number / Math.max(1, totalModules)) * 100}
            className="w-40"
            aria-label="Course completion progress"
          />
        </div>
      </div>

      {/* Roadmap */}
      <div
        className="relative mx-auto w-full max-w-[520px] rounded-2xl bg-background p-6"
        style={{ height: containerHeight + 48 }}
      >
        {/* Edges */}
        {nodes.slice(1).map((n, k) => {
          const prev = nodes[k];
          const dx = n.x - prev.x;
          const dy = n.y - prev.y;
          const length = Math.hypot(dx, dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const cx = (n.x + prev.x) / 2;
          const cy = (n.y + prev.y) / 2;
          const doneEdge = isEdgeDone(prev.m);
          const currentEdge = isEdgeCurrent(prev.m);

          return (
            <div
              key={`edge-${k}`}
              style={{
                position: "absolute",
                left: `calc(50% + ${cx}px)`,
                top: cy + NODE / 2,
                width: length,
                height: LINE_THICK,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              }}
              className="pointer-events-none"
              aria-hidden
            >
              <div className="h-full w-full rounded-full bg-border" />
              {doneEdge && (
                <div className="absolute inset-0 rounded-full bg-primary" />
              )}
              {!doneEdge && currentEdge && (
                <div
                  className="absolute inset-0 rounded-full bg-primary/70"
                  style={{
                    maskImage:
                      "linear-gradient(90deg,#000 0 60%,transparent 100%)",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Nodes */}
        {nodes.map(({ m, x, y }) => {
          const st = stateForModule(m);
          const isActive = selected?.module_id === m.module_id; // <-- highlight when selected

          return (
            <button
              key={m.module_id}
              onClick={() => onSelectNode(m)}
              className={`
                absolute grid place-items-center rounded-full border-2 transition 
                shadow-sm focus:outline-none w-[72px] h-[72px]
                ${
                  st === "done" &&
                  "bg-primary text-primary-foreground border-primary/40"
                }
                ${
                  st === "current" &&
                  "bg-accent text-accent-foreground border-accent/40 cursor-pointer"
                }
                ${st === "locked" && "bg-muted text-muted-foreground border-border"}
                ${isActive ? "border-primary ring-4 ring-primary/40 ring-offset-2 ring-offset-background" : ""}
              `}
              style={{
                left: `calc(50% + ${x}px)`,
                top: y,
                transform: `translate(-50%, 0)`,
              }}
              aria-selected={isActive}
              aria-label={
                m.title ?? `Stage ${m.stage_number} • Module ${m.module_number}`
              }
              title={
                m.title ?? `Stage ${m.stage_number} • Module ${m.module_number}`
              }
              type="button"
            >
              {st === "current" && (
                <span className="absolute -top-10 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground border-2 border-primary/40">
                  BEGIN
                </span>
              )}

              {st === "done" ? (
                <Check className="h-6 w-6" />
              ) : st === "current" ? (
                <Star className="h-6 w-6 fill-current" />
              ) : (
                <Lock className="h-5 w-5 opacity-70" />
              )}
            </button>
          );
        })}
      </div>

      {/* Lesson Details Sheet */}
      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            // Clear selection when sheet closes so highlight goes away
            setSelected(null);
            setSelectedIndex(null);
          }
        }}
      >
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {selected?.title ??
                (selected &&
                  `Stage ${selected.stage_number} • Module ${selected.module_number}`) ??
                "Lesson"}
            </SheetTitle>
            {(selected?.difficulty || selected?.est_minutes) && (
              <SheetDescription>
                {selected?.difficulty && (
                  <span className="capitalize">{selected.difficulty}</span>
                )}
                {selected?.difficulty && selected?.est_minutes ? " • " : ""}
                {selected?.est_minutes ? `${selected.est_minutes} mins` : ""}
              </SheetDescription>
            )}
          </SheetHeader>

          {/* Centered description area */}
          <div className="mt-6 flex flex-1 items-start justify-center">
            <div className="prose prose-sm dark:prose-invert text-center">
              {selected?.description ?? (
                <p className="text-muted-foreground">
                  No description provided for this lesson.
                </p>
              )}
            </div>
          </div>

          {/* Footer: bounded navigation with Start in the middle */}
          <SheetFooter className="mt-8">
            <div className="grid w-full grid-cols-3 items-center gap-2">
              <Button
                variant="outline"
                disabled={selectedIndex === 0 || selectedIndex == null}
                onClick={() =>
                  selectedIndex != null &&
                  selectedIndex > 0 &&
                  gotoIndex(selectedIndex - 1)
                }
                type="button"
              >
                ← Prev
              </Button>

              <Button
                onClick={beginLesson}
                disabled={selectedState === "locked"}
                type="button"
              >
                {selectedState === "locked" ? "Locked" : "Start Lesson"}
              </Button>

              <Button
                variant="outline"
                disabled={
                  selectedIndex == null || selectedIndex === sorted.length - 1
                }
                onClick={() =>
                  selectedIndex != null &&
                  selectedIndex < sorted.length - 1 &&
                  gotoIndex(selectedIndex + 1)
                }
                type="button"
              >
                Next →
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
