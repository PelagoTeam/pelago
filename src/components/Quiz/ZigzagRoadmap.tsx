"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Lock, Sailboat } from "lucide-react";

type Module = {
  module_id: string;
  title?: string;
  stage_number: number;
  module_number: number;
};

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

  // Layout constants
  const NODE = 72;        // px circle diameter
  const STEP_Y = 135;     // vertical distance between rows (px)
  const OFFSET_X = 110;   // narrower zig-zag so nodes stay in the river
  const LINE_THICK = 12;  // slightly thicker for readability

  const sorted = useMemo(
    () =>
      [...modules].sort((a, b) =>
        a.stage_number === b.stage_number
          ? a.module_number - b.module_number
          : a.stage_number - b.stage_number,
      ),
    [modules],
  );

  type State = "done" | "current" | "locked";
  const stateForModule = (m: Module): State => {
    if (m.stage_number < progress.stage_number) return "done";
    if (m.stage_number > progress.stage_number) return "locked";
    if (m.module_number < progress.module_number) return "done";
    if (m.module_number === progress.module_number) return "current";
    return "locked";
  };

  const isEdgeDone = (prev: Module) => {
    if (prev.stage_number < progress.stage_number) return true;
    if (prev.stage_number > progress.stage_number) return false;
    return prev.module_number < progress.module_number;
  };
  const isEdgeCurrent = (prev: Module) => {
    if (prev.stage_number !== progress.stage_number) return false;
    return prev.module_number === progress.module_number;
  };

  // Zig-zag positions
  const nodes = useMemo(() => {
    return sorted.map((m, i) => {
      const y = i * STEP_Y;
      const x = i === 0 ? 0 : i % 2 === 1 ? +OFFSET_X : -OFFSET_X;
      return { m, x, y };
    });
  }, [sorted]);

  const containerHeight = (sorted.length - 1) * STEP_Y + NODE;

  const goto = (moduleId: string, disabled: boolean) => {
    if (!disabled) router.push(`/home/quiz?module=${moduleId}`);
  };

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
            {Math.min(progress.module_number, totalModules)}/{totalModules} completed
          </Badge>
          <div className="rounded-md bg-white/60 backdrop-blur-md p-1">
            <Progress
              value={(progress.module_number / Math.max(1, totalModules)) * 100}
              className="w-36"
            />
          </div>
        </div>
      </div>

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
            const clickable = st !== "locked";

            return (
              <button
                key={m.module_id}
                onClick={() => goto(m.module_id, !clickable)}
                className={`
                  absolute grid place-items-center rounded-full border
                  transition shadow-xl focus:outline-none focus-visible:ring-4
                  w-[72px] h-[72px]
                  ${st === "done" &&
                  "bg-primary text-primary-foreground border-primary/50 shadow-primary/30"}
                  ${st === "current" &&
                  "bg-accent text-accent-foreground border-accent/50 shadow-accent/30 ring-accent/30 hover:scale-[1.02] active:scale-[0.99]"}
                  ${st === "locked" &&
                  "bg-white/95 text-muted-foreground border-white/80 backdrop-blur-md"}
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
              >
                {st === "current" && (
                  <span className="absolute -top-10 rounded-md bg-white/95 backdrop-blur px-3 py-1.5 text-xs font-semibold text-secondary-foreground border border-black/10 shadow-sm">
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
    </div>
  );
}
