"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthProfileContext";
import { createClient } from "@/lib/supabase/client";
import { Progress } from "@radix-ui/react-progress";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { useEffect, useMemo, useState } from "react";

type Module = {
  id: string;
  order: number;
  course_id: string;
};

export default function PracticePage() {
  const { profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [course_id, setCourseId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const router = useRouter();

  useEffect(() => {
    if (!profile) return;

    (async () => {
      setLoading(true);
      const courseId = profile.current_course;
      setCourseId(courseId);
      const { data: uc } = await supabase
        .from("user_courses")
        .select("progress")
        .eq("id", profile.id)
        .eq("course_id", courseId)
        .maybeSingle();

      const progress = uc?.progress ?? 0;
      setProgress(progress);
      const { data: qs, error: qErr } = await supabase
        .from("lessons")
        .select("id, order, course_id")
        .eq("course_id", courseId);

      if (qErr) {
        console.error("[Roadmap] questions error:", qErr);
        setModules([]);
        setLoading(false);
        return;
      }

      setModules(qs ?? []);
      setLoading(false);
    })();
  }, [profile, supabase]);
  console.log("modules", modules);

  if (!profile) return <p className="px-4">Please sign in to continue.</p>;
  if (!course_id) return <p className="px-4">No course selected.</p>;
  if (loading) return <p className="px-4 text-muted-foreground">Loading…</p>;

  const totalModules = modules.length;
  const pct =
    totalModules > 0
      ? (Math.min(progress, totalModules) / totalModules) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Course Roadmap</h2>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {Math.min(progress, totalModules)}/{totalModules} completed
          </Badge>
          <Progress value={pct} className="w-40" />
        </div>
      </div>

      {/* Roadmap grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module, index) => {
          let state: "done" | "current" | "locked" = "locked";
          if (index < progress) state = "done";
          else if (index === progress) state = "current";

          return (
            <Card
              key={index}
              className={cn(
                "transition border",
                state === "done" &&
                  "border-green-200 bg-green-50/50 dark:bg-green-950/20",
                state === "current" && "border-primary/30",
                state === "locked" && "opacity-90"
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Module {index}</span>
                  {state === "done" && (
                    <Badge variant="secondary">Completed</Badge>
                  )}
                  {state === "current" && <Badge>In progress</Badge>}
                  {state === "locked" && (
                    <Badge variant="outline">Locked</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant={state === "locked" ? "outline" : "default"}
                  onClick={() => router.push(`/home/quiz?module=${module.id}`)}
                >
                  {state === "done"
                    ? "Review"
                    : state === "current"
                    ? "Continue"
                    : "Start"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
