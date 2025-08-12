"use client";

import ComposeQuiz from "@/components/Quiz/ComposeQuiz";
import MCQQuiz from "@/components/Quiz/MCQQuiz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthProfileContext";
import { createClient } from "@/lib/supabase/client";
import { Compose, MCQ, Question } from "@/lib/types";
import { Progress } from "@radix-ui/react-progress";
import { useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

type SubmitState = "idle" | "correct" | "wrong";

export default function PracticePage() {
  const { profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [course_id, setCourseId] = useState<string | null>(null);

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
      const { data: q, error: qErr } = await supabase
        .from("questions")
        .select("*")
        .eq("course_id", courseId)
        .eq("module", progress);

      if (qErr) console.error(qErr);

      setQuestions(q ?? []);
      setLoading(false);
    })();
  }, [profile, supabase]);

  const total = questions.length;
  const current = total > 0 ? questions[idx] : null;
  const pct = total > 0 ? (idx / total) * 100 : 0;

  const handleSubmitResult = (ok: boolean) => {
    setSubmitState(ok ? "correct" : "wrong");
  };

  const advance = async () => {
    if (!profile || !course_id) return;
    if (submitState !== "correct") return;
    setIdx(idx + 1);
  };

  if (!profile) return <p className="px-4">Please sign in to continue.</p>;
  if (!course_id) return <p className="px-4">No course selected.</p>;
  if (loading) return <p className="px-4 text-muted-foreground">Loading…</p>;
  if (!current) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>All done 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>You have completed all questions in this course.</p>
          <Button onClick={() => router.push("/home/leaderboard")}>
            View Leaderboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formId = current.type === "mcq" ? "mcq-form" : "compose-form";

  return (
    <Card className="shadow-md">
      <CardHeader className="flex items-center justify-between gap-4">
        <CardTitle>
          Practice •{" "}
          <span className="font-normal text-muted-foreground">
            {current.type.toUpperCase()}
          </span>
        </CardTitle>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {Math.min(idx + 1, total)}/{total}
          </Badge>
          <Progress value={pct} className="w-40" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-lg font-medium">{current.prompt}</p>
        {current.hint && (
          <p className="text-sm text-muted-foreground">Hint: {current.hint}</p>
        )}

        {current.type === "mcq" ? (
          <MCQQuiz
            payload={current.payload as MCQ}
            submitState={submitState}
            onSubmit={handleSubmitResult}
          />
        ) : (
          <ComposeQuiz
            payload={current.payload as Compose}
            submitState={submitState}
            onSubmit={handleSubmitResult}
          />
        )}

        <div className="flex gap-3">
          {submitState === "correct" ? (
            <Button onClick={advance}>
              {idx + 1 >= total ? "Finish" : "Next"}
            </Button>
          ) : (
            <Button form={formId} type="submit">
              Submit
            </Button>
          )}
          {submitState === "wrong" && (
            <span className="self-center text-sm text-destructive">
              Wrong. Try again.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
