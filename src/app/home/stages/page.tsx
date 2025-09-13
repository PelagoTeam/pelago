"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthProfileContext";
import type { Stages } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Lock, PlayCircle } from "lucide-react";

export default function StagePage() {
  const { profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [stages, setStages] = useState<Stages[]>([]);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    (async () => {
      setLoading(true);
      try {
        const [{ data: sData, error: sErr }, { data: uc, error: ucErr }] =
          await Promise.all([
            supabase
              .from("stages")
              .select("stage_id, title, stage_number, course_id")
              .eq("course_id", profile.current_course)
              .order("stage_number", { ascending: true }),
            supabase
              .from("user_courses")
              .select("stage_number")
              .eq("user_id", profile.user_id)
              .eq("course_id", profile.current_course)
              .single(),
          ]);

        if (sErr) throw sErr;
        if (ucErr) throw ucErr;

        setStages(sData ?? []);
        setCurrentStage(uc?.stage_number ?? 0);
      } catch (e) {
        console.error("[Stages] load error:", e);
        setStages([]);
        setCurrentStage(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile, supabase]);

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="h-6 w-44 rounded bg-muted animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border">
              <div className="h-40 rounded-lg bg-muted animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const goToStage = (stageId: string) => {
    router.push(`/home?stage=${stageId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Stages</h2>
        <Badge variant="secondary">
          {Math.min(
            // count done as strictly below current
            stages.filter((s) => s.stage_number < currentStage).length,
            stages.length,
          )}
          /{stages.length} completed
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.map((stage) => {
          const state: "done" | "current" | "locked" =
            stage.stage_number < currentStage
              ? "done"
              : stage.stage_number === currentStage
                ? "current"
                : "locked";

          const isLocked = state === "locked";
          const isCurrent = state === "current";
          const isDone = state === "done";

          return (
            <Card
              key={stage.stage_id}
              className={`
                "relative overflow-hidden border transition
                ${isDone && "bg-secondary/60"} 
                ${isCurrent && "ring-2 ring-primary/30"}
                ${isLocked && "opacity-90"}
              `}
            >
              {/* Accent bar on top */}
              <div
                className={`
                  "absolute inset-x-0 top-0 h-1",
                  ${isDone ? "bg-primary" : isCurrent ? "bg-accent" : "bg-border"}
                `}
              />

              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="truncate">
                    Stage {stage.stage_number + 1}: {stage.title}
                  </span>
                  {isDone && <Badge variant="secondary">Completed</Badge>}
                  {isCurrent && <Badge>Current</Badge>}
                  {isLocked && <Badge variant="outline">Locked</Badge>}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isDone ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Done</span>
                    </>
                  ) : isCurrent ? (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      <span>In progress</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Locked</span>
                    </>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={isLocked ? "outline" : "default"}
                  disabled={isLocked}
                  onClick={() => goToStage(stage.stage_id)}
                >
                  {isDone ? "Review" : isCurrent ? "Continue" : "Locked"}
                </Button>
              </CardContent>

              {/* Soft background flourish using theme tokens */}
              <div
                className={`
                  pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full blur-2xl
                  ${
                    isDone
                      ? "bg-primary/15"
                      : isCurrent
                        ? "bg-accent/20"
                        : "bg-muted/40"
                  }
                `}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
