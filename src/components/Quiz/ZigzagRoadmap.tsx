"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check, Lock, Star } from "lucide-react";

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

  const NODE = 72; // px circle diameter
  const STEP_Y = 135; // vertical distance between rows (px)
  const OFFSET_X = 120; // left/right horizontal offset from center (px)
  const LINE_THICK = 10; // connector thickness (px)

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
    // same stage
    if (m.module_number < progress.module_number) return "done";
    if (m.module_number === progress.module_number) return "current";
    return "locked";
  };

  // 3) Stage-aware edge states (based on PREVIOUS node in the path)
  const isEdgeDone = (prev: Module) => {
    if (prev.stage_number < progress.stage_number) return true;
    if (prev.stage_number > progress.stage_number) return false;
    return prev.module_number < progress.module_number;
  };
  const isEdgeCurrent = (prev: Module) => {
    if (prev.stage_number !== progress.stage_number) return false;
    return prev.module_number === progress.module_number;
  };

  // 4) Compute zigzag node positions (centered)
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
    <div className="space-y-6">
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
          />
        </div>
      </div>

      <div
        className="relative mx-auto w-full max-w-[520px] rounded-2xl bg-background p-6"
        style={{ height: containerHeight + 48 }}
      >
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

        {nodes.map(({ m, x, y }) => {
          const st = stateForModule(m);
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
                  "bg-muted text-muted-foreground border-border cursor-not-allowed",
              )}
              style={{
                left: `calc(50% + ${x}px)`,
                top: y,
                transform: `translate(-50%, 0)`,
              }}
              aria-label={
                m.title ?? `Stage ${m.stage_number} • Module ${m.module_number}`
              }
              title={
                m.title ?? `Stage ${m.stage_number} • Module ${m.module_number}`
              }
            >
              {st === "current" && (
                <span className="absolute -top-10 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground border-2 border-primary/40">
                  BEGIN
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
