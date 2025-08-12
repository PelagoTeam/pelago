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
import ZigZagRoadmap, {
  SerpentineRoadmap,
} from "@/components/Quiz/ZigzagRoadmap";

type Module = {
  module_id: string;
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
        .eq("user_id", profile.id)
        .eq("course_id", courseId)
        .maybeSingle();

      const progress = uc?.progress ?? 0;
      setProgress(progress);
      const { data: qs, error: qErr } = await supabase
        .from("modules")
        .select("module_id, order, course_id")
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

  if (!profile) return <p className="px-4">Please sign in to continue.</p>;
  if (!course_id) return <p className="px-4">No course selected.</p>;
  if (loading) return <p className="px-4 text-muted-foreground">Loading…</p>;

  const totalModules = modules.length;

  return (
    <ZigZagRoadmap
      modules={modules}
      progress={progress}
      totalModules={totalModules}
    />
  );
}
