"use client";

import { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check, Lock, Star } from "lucide-react";

type Module = { module_id: string; title?: string };

type Props = {
  modules: Module[];
  progress: number; // number completed
  totalModules: number;
};

export default function ZigZagRoadmap({
  modules,
  progress,
  totalModules,
}: Props) {
  const router = useRouter();

  // layout constants (tweak to taste)
  const NODE = 72; // px circle diameter
  const STEP_Y = 135; // vertical distance between rows (px)
  const OFFSET_X = 120; // left/right horizontal offset from center (px)
  const LINE_THICK = 10; // connector thickness (px)

  // compute positions in a centered coordinate system (x in px from center)
  const nodes = useMemo(() => {
    return modules.map((m, i) => {
      const y = i * STEP_Y;
      let x = 0;
      if (i > 0) x = i % 2 === 1 ? +OFFSET_X : -OFFSET_X; // R, L, R, L…
      return { i, m, x, y };
    });
  }, [modules]);

  const containerHeight = (modules.length - 1) * STEP_Y + NODE;

  const stateFor = (idx: number): "done" | "current" | "locked" => {
    if (idx < progress) return "done";
    if (idx === progress) return "current";
    return "locked";
  };

  const goto = (moduleId: string, disabled: boolean) => {
    if (!disabled) router.push(`/home/quiz?module=${moduleId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Header (unchanged) */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Course Roadmap</h2>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {Math.min(progress, totalModules)}/{totalModules} completed
          </Badge>
          <Progress
            value={(progress / Math.max(1, totalModules)) * 100}
            className="w-40"
          />
        </div>
      </div>

      {/* Stage */}
      <div
        className="relative mx-auto w-full max-w-[520px] rounded-2xl bg-card p-6"
        style={{ height: containerHeight + 48 }}
      >
        {/* Connectors (diagonal lines) */}
        {nodes.slice(1).map((n, k) => {
          const prev = nodes[k];
          const dx = n.x - prev.x;
          const dy = n.y - prev.y;
          const length = Math.hypot(dx, dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const cx = (n.x + prev.x) / 2;
          const cy = (n.y + prev.y) / 2;

          const doneEdge = prev.i < progress;
          const currentEdge = prev.i === progress;

          return (
            <div
              key={`edge-${n.i}`}
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
              {/* base track */}
              <div className="h-full w-full rounded-full bg-border" />
              {/* done overlay */}
              {doneEdge && (
                <div className="absolute inset-0 rounded-full bg-primary" />
              )}
              {/* current overlay (hint) */}
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
        {nodes.map(({ i, m, x, y }) => {
          const st = stateFor(i);
          const clickable = st !== "locked";

          return (
            <button
              key={m.module_id}
              onClick={() => goto(m.module_id, !clickable)}
              className={cn(
                "absolute grid place-items-center rounded-full border-2 transition shadow-sm",
                "focus:outline-none focus-visible:ring-4",
                "w-[72px] h-[72px]",
                st === "done" &&
                  "bg-primary text-primary-foreground border-primary/40 focus-visible:ring-primary/25",
                st === "current" &&
                  "bg-accent text-accent-foreground border-accent/40 focus-visible:ring-accent/30 cursor-pointer",
                st === "locked" &&
                  "bg-muted text-muted-foreground border-border cursor-not-allowed"
              )}
              style={{
                left: `calc(50% + ${x}px)`,
                top: y,
                transform: `translate(-50%, 0)`,
              }}
              aria-label={m.title ?? `Module ${i + 1}`}
            >
              {st === "current" && (
                <span className="absolute -top-10 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground border-2 border-primary/40">
                  START
                </span>
              )}

              {st === "done" ? (
                <Check className="w-6 h-6" />
              ) : st === "current" ? (
                <Star className="w-6 h-6 fill-current" />
              ) : (
                <Lock className="w-5 h-5 opacity-70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
