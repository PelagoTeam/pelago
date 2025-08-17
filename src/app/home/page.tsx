"use client";

import { useAuth } from "@/contexts/AuthProfileContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

import { useEffect, useMemo, useState } from "react";
import ZigZagRoadmap from "@/components/Quiz/ZigzagRoadmap";
import { Button } from "@/components/ui/button";
import { Module, Stages } from "@/lib/types";
import { ArrowRight, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ComingSoon from "@/components/Quiz/ComingSoon";

export default function HomePage() {
  const { profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [userProgress, setUserProgress] = useState({ module: 0, stage: 0 });
  const [stages, setStages] = useState<Stages[]>([]);
  const router = useRouter();

  const search = useSearchParams();
  const stage_id = search.get("stage");

  useEffect(() => {
    const checkStageId = async () => {
      if (!stage_id && profile) {
        const { data: uc } = await supabase
          .from("user_courses")
          .select("stage")
          .eq("course_id", profile.current_course)
          .single();
        const progress = uc ?? { stage: 0 };
        const { data: stage } = await supabase
          .from("stages")
          .select("id")
          .eq("course_id", profile.current_course)
          .eq("stage_number", progress.stage)
          .single();
        router.replace(`/home?stage=${stage?.id}`);
      }
    };
    checkStageId();
  }, [stage_id, router, profile, supabase]);

  useEffect(() => {
    if (!profile || !stage_id) return;
    (async () => {
      setLoading(true);
      const courseId = profile.current_course;
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
        .eq("stage_id", stage_id);
      if (qErr) {
        console.error("[Roadmap] questions error:", qErr);
        setModules([]);
        setLoading(false);
        return;
      }
      const modules =
        qs.map((q) => {
          return {
            module_id: q.module_id,
            order: q.order,
            stage_number:
              stages.find((s) => s.id === stage_id)?.stage_number ?? 0,
            course_id: q.course_id,
          };
        }) ?? [];
      setModules(modules);
      setLoading(false);
    })();
  }, [profile, supabase, stage_id]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground animate-pulse">
            Fetching your roadmap...
          </p>
          <p className="mt-1 text-xs text-muted-foreground animate-pulse">
            This might take a few seconds
          </p>
        </div>
      </div>
    );
  }
  if (stages.length === 0) return <ComingSoon />;

  const totalModules = modules.length;
  const idx = stages.findIndex((s) => s.id === stage_id);
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
        progress={userProgress}
        totalModules={totalModules}
      />
    </div>
  );
}
