// ZigZagRoadmap.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
import { BookOpen, Check, Lock, Play, Sailboat } from "lucide-react";
import { Separator } from "../ui/separator";
import { Module } from "@/lib/types";

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
  const stateForModule = useCallback(
    (m: Module): State => {
      if (m.stage_number < progress.stage_number) return "done";
      if (m.stage_number > progress.stage_number) return "locked";
      if (m.module_number < progress.module_number) return "done";
      if (m.module_number === progress.module_number) return "current";
      return "locked";
    },
    [progress],
  );

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

  const gotoIndex = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= sorted.length) return;
      const m = sorted[idx];
      setSelected(m);
      setSelectedIndex(idx);
      setSelectedState(stateForModule(m));
    },
    [sorted, stateForModule],
  );

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
  }, [open, selectedIndex, sorted.length, gotoIndex]);

  return (
    <div className="relative min-h-screen">
      {/* FULL-PAGE BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/quiz/quiz-bg.png"
          alt=""
          fill
          className="object-cover pointer-events-none select-none will-change-transform"
          priority
        />

        {/* Lighter global wash (was /25 → /5) so art shows through */}
        <div className="absolute inset-0 bg-white/5" />

        {/* Subtle vignette to calm edges */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_28%,transparent_42%,rgba(0,0,0,0.07)_100%)] pointer-events-none" />

        {/* River lane brightener (a touch stronger + slightly narrower) */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse 50% 110% at 50% 45%, black 55%, transparent 78%)",
            maskImage:
              "radial-gradient(ellipse 50% 110% at 50% 45%, black 55%, transparent 78%)",
            background: "rgba(255,255,255,0.24)",
          }}
        />

        {/* Top→bottom gradient for navbar/readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/28 via-transparent to-white/12" />
      </div>

      <div className="mx-auto flex w-full max-w-[720px] items-center justify-between rounded-xl bg-white/45 backdrop-blur-md px-4 py-2.5 shadow-sm">
        <h2 className="text-lg font-semibold">Course Roadmap</h2>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-white/70 backdrop-blur-md">
            {Math.min(progress.module_number, totalModules)}/{totalModules}{" "}
            completed
          </Badge>
          <div className="rounded-md bg-white/60 backdrop-blur-md p-1">
            <Progress
              value={(progress.module_number / Math.max(1, totalModules)) * 100}
              className="w-36"
              aria-label="Course completion progress"
            />
          </div>
        </div>
      </div>

      {/* Roadmap */}
      {/* CONTENT */}
      <div className="space-y-6 px-4 py-6 sm:px-6 pt-10 sm:pt-12">
        {/* Roadmap canvas */}
        <div
          className="relative mx-auto w-full max-w-[520px] rounded-2xl p-6 overflow-visible"
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
                {/* Base track: semi-white with inner shadow so it reads on blue water */}
                <div className="h-full w-full rounded-full bg-white/70 shadow-[inset_0_0_4px_rgba(0,0,0,0.15)]" />
                {/* Completed: strong primary with soft glow */}
                {doneEdge && (
                  <div className="absolute inset-0 rounded-full bg-primary/85 shadow-[0_0_10px_rgba(0,0,0,0.12)]" />
                )}
                {/* Current: animated-looking sweep */}
                {!doneEdge && currentEdge && (
                  <div
                    className="absolute inset-0 rounded-full bg-primary/75"
                    style={{
                      maskImage:
                        "linear-gradient(90deg,#000 0 55%,transparent 100%)",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Nodes */}
          {nodes.map(({ m, x, y }) => {
            const st = stateForModule(m);
            const isActive = selected?.module_id === m.module_id;

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
                aria-label={
                  m.title ??
                  `Stage ${m.stage_number} • Module ${m.module_number}`
                }
                title={
                  m.title ??
                  `Stage ${m.stage_number} • Module ${m.module_number}`
                }
                type="button"
              >
                {st === "current" && (
                  <span className="absolute -top-10 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground border-2 border-primary/40">
                    BEGIN
                  </span>
                )}

                {st === "done" ? (
                  <Check className="w-6 h-6" />
                ) : st === "current" ? (
                  <Sailboat className="w-8 h-8 fill-current" />
                ) : (
                  <Lock className="w-5 h-5 opacity-70" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lesson Details Sheet */}
      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setSelected(null);
            setSelectedIndex(null);
          }
        }}
      >
        <SheetContent
          side="right"
          aria-describedby="lesson-description"
          className="
      sm:max-w-md p-0 overflow-hidden
      bg-background text-foreground
      border-l border-border
      shadow-2xl
    "
        >
          {/* Header */}
          <div className="px-6 py-5 text-primary-foreground bg-gradient-to-br from-primary to-primary/80 shadow-md">
            <SheetHeader className="space-y-3">
              <SheetTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                {selected?.title ??
                  (selected &&
                    `Stage ${selected.stage_number + 1} • Module ${selected.module_number + 1}`) ??
                  "Lesson"}
              </SheetTitle>

              {/* A11y helper */}
              <SheetDescription className="sr-only">
                Lesson details and metadata
              </SheetDescription>
            </SheetHeader>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div
              id="lesson-description"
              className="rounded-[var(--radius-xl)] border border-border bg-card text-card-foreground p-4 shadow-sm"
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Overview
              </h3>
              <Separator className="mb-3" />
              <div className="prose prose-sm dark:prose-invert text-left max-h-[46vh] overflow-y-auto pr-1 no-scrollbar">
                {selected?.description ? (
                  <p>{selected.description}</p>
                ) : (
                  <p className="text-muted-foreground">
                    No description provided for this lesson.
                  </p>
                )}
              </div>
            </div>

            {(selected?.difficulty || selected?.est_minutes) && (
              <div className="grid grid-cols-2 gap-3">
                {selected?.difficulty && (
                  <div className="rounded-[var(--radius-lg)] border border-border bg-muted/30 p-3 shadow-xs">
                    <div className="text-xs text-muted-foreground">
                      Difficulty
                    </div>
                    <div className="mt-1 font-medium capitalize">
                      {selected.difficulty}
                    </div>
                  </div>
                )}
                {typeof selected?.est_minutes === "number" && (
                  <div className="rounded-[var(--radius-lg)] border border-border bg-muted/30 p-3 shadow-xs">
                    <div className="text-xs text-muted-foreground">
                      Estimated time
                    </div>
                    <div className="mt-1 font-medium">
                      {selected.est_minutes} mins
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />
          <SheetFooter className="px-6 py-4 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
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
                className="shadow-2xs"
              >
                ← Prev
              </Button>

              <Button
                onClick={beginLesson}
                disabled={selectedState === "locked"}
                type="button"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[var(--radius-lg)] shadow motion-safe:animate-in motion-safe:fade-in-10 motion-safe:zoom-in-95"
              >
                {selectedState === "locked" ? (
                  <>
                    <Lock className="mr-2 h-4 w-4" /> Locked
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" /> Start Lesson
                  </>
                )}
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
                className="shadow-2xs"
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
