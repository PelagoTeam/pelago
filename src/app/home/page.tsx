"use client";

import { useAuth } from "@/contexts/AuthProfileContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";
import ZigZagRoadmap from "@/components/Quiz/ZigzagRoadmap";
import { Button } from "@/components/ui/button";
import { Module, Stages } from "@/lib/types";
import { ArrowRight, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ComingSoon from "@/components/Quiz/ComingSoon";

export default function HomePage() {
  const { profile, user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [course_id, setCourseId] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState({ module: 0, stage: 0 });
  const [stages, setStages] = useState<Stages[]>([]);

  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [authLoading, user, profile, router]);

  useEffect(() => {
    if (!profile) return;

    (async () => {
      setLoading(true);
      const courseId = profile.current_course;
      setCourseId(courseId);
      const { data: uc } = await supabase
        .from("user_courses")
        .select("module, stage")
        .eq("user_id", profile.id)
        .eq("course_id", courseId)
        .single();

      const progress = uc ?? { module: 0, stage: 0 };
      setUserProgress(progress);

      const { data: stages } = await supabase
        .from("stages")
        .select("id, stage_number, course_id, title")
        .eq("course_id", courseId)
        .order("stage_number", { ascending: true });
      if (!stages || !stages.length) {
        setStages([]);
        setLoading(false);
        return;
      }
      setStages(stages);

      const { data: qs, error: qErr } = await supabase
        .from("modules")
        .select("module_id, order, course_id")
        .eq("course_id", courseId)
        .eq(
          "stage_id",
          stages?.filter((s) => s.stage_number === progress.stage + 1)[0]?.id
        );

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

  if (!course_id) return <p className="px-4">No course selected.</p>;
  if (loading) return <p className="px-4 text-muted-foreground">Loading…</p>;
  if (stages.length === 0) return <ComingSoon />;

  const totalModules = modules.length;
  const idx = Math.max(0, Math.min(userProgress.stage, stages.length - 1));
  const stage = stages[idx];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-xl border bg-card text-card-foreground p-4 sm:p-5 mb-4">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-28 w-28 rounded-full bg-accent/10 blur-2xl" />

        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Flag className="h-6 w-6" />
          </div>

          {/* text */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none"
              >
                Current
              </Badge>
              <span className="text-xs text-muted-foreground">
                Stage {idx + 1} of {stages.length}
              </span>
            </div>
            <h3 className="mt-1 truncate text-base font-semibold">
              Stage {idx + 1}: {stage?.title ?? "—"}
            </h3>
          </div>

          {/* CTA */}
          <Button
            onClick={() => router.push("/home/stages")}
            size="sm"
            className="shrink-0"
          >
            View stages
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
      <ZigZagRoadmap
        modules={modules}
        progress={userProgress.module}
        totalModules={totalModules}
      />
    </div>
  );
}
