"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthProfileContext";
import MCQQuiz, { MCQData } from "@/components/Quiz/MCQQuiz";
import ComposeQuiz, { ComposeData } from "@/components/Quiz/ComposeQuiz";
import { Button } from "@/components/ui/button";

type QuestionRow = {
  question_id: string;
  module_id: string;
  position: number;
  type: "mcq" | "compose";
  prompt: string | null;
  payload: MCQData | ComposeData;
};

type MCQQuestion = {
  question_id: string;
  position: number;
  type: "mcq";
  prompt: string;
  payload: MCQData;
};

type ComposeQuestion = {
  question_id: string;
  position: number;
  type: "compose";
  prompt: string;
  payload: ComposeData;
};

type Question = MCQQuestion | ComposeQuestion;

export default function QuizPage() {
  const router = useRouter();
  const search = useSearchParams();
  const moduleId = search.get("module");

  const { profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roundQueue, setRoundQueue] = useState<Question[]>([]);
  const [retryBucket, setRetryBucket] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(1);

  const [checked, setChecked] = useState<null | "correct" | "wrong">(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledOnce = useRef(false);

  // -------- fetch questions --------
  useEffect(() => {
    let active = true;

    async function run() {
      if (!moduleId) {
        setError("Missing module id in the URL.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const { data, error: qErr } = await supabase
          .from("questions")
          .select("question_id, module_id, position, type, prompt, payload")
          .eq("module_id", moduleId)
          .order("position", { ascending: true });
        if (qErr) throw qErr;

        const normalized: Question[] = (data ?? [])
          .map((r: QuestionRow) => {
            const prompt = (r.prompt ?? "").toString();
            if (r.type === "mcq") {
              return {
                question_id: r.question_id,
                position: r.position,
                type: "mcq",
                prompt,
                payload: r.payload,
              };
            }
            if (r.type === "compose") {
              return {
                question_id: r.question_id,
                position: r.position,
                type: "compose",
                prompt,
                payload: r.payload,
              };
            }
            return null;
          })
          .filter(Boolean) as Question[];

        if (normalized.length === 0) {
          setError("No questions found for this module.");
          setLoading(false);
          return;
        }

        if (!active) return;
        setRoundQueue(normalized);
        setRetryBucket([]);
        setIndex(0);
        setRound(1);
        setChecked(null);
      } catch (err: unknown) {
        if (!active) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load questions.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [moduleId, supabase]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: hasScrolledOnce.current ? "smooth" : "auto",
        block: "end",
      });
      hasScrolledOnce.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [checked]);

  const current = roundQueue[index];
  const explanation =
    current?.type === "mcq"
      ? current.payload.explanation
      : current?.type === "compose"
        ? current.payload.explanation
        : null;

  // -------- submit & next flow --------
  function onChildSubmit(res: { correct: boolean }) {
    setChecked(res.correct ? "correct" : "wrong");
  }

  function handleNext() {
    if (!current) return;

    if (checked === "wrong") {
      setRetryBucket((prev) => [...prev, current]);
    }

    if (index + 1 < roundQueue.length) {
      setIndex((i) => i + 1);
      setChecked(null);
      return;
    }

    if (retryBucket.length > 0 || checked === "wrong") {
      const nextRound = [
        ...retryBucket,
        ...(checked === "wrong" ? [current] : []),
      ];
      setRoundQueue(nextRound);
      setRetryBucket([]);
      setIndex(0);
      setRound((r) => r + 1);
      setChecked(null);
    } else {
      completeAndExit();
    }
  }

  async function completeAndExit() {
    try {
      if (profile?.id) {
        const { data: p, error: selErr } = await supabase
          .from("user_courses")
          .select("stage, module")
          .eq("user_id", profile.id)
          .eq("course_id", profile.current_course)
          .single();
        if (selErr) throw selErr;
        const currentModule = (p?.module ?? 0) as number;
        const currentStage = (p?.stage ?? 0) as number;

        const { data: s, error: stageErr } = await supabase
          .from("stages")
          .select("id")
          .eq("course_id", profile.current_course)
          .eq("stage_number", currentStage)
          .single();
        if (stageErr) throw stageErr;

        const stage_id = (s?.id ?? 0) as number;

        console.log("currentModule", currentModule);
        console.log("currentStage", currentStage);

        const { data: modules, error: moErr } = await supabase
          .from("modules")
          .select("order")
          .eq("stage_id", stage_id);
        if (moErr) throw moErr;
        const totalModules = (modules?.length ?? 0) as number;
        console.log("totalModules", totalModules);
        if (totalModules > currentModule + 1) {
          console.log("Updating progress...");
          const { error: updErr } = await supabase
            .from("user_courses")
            .update({ module: currentModule + 1 })
            .eq("user_id", profile.id)
            .eq("course_id", profile.current_course);
          if (updErr) throw updErr;
        } else {
          try {
            const { error } = await supabase.rpc("incrementuserstage", {
              module_number: currentModule,
              stage_number: currentStage,
              course_id: profile.current_course,
            });
            if (error) throw error;
          } catch (e) {
            console.error("Failed to update stage:", e);
          }
        }
      }
    } catch (e) {
      console.error("Failed to update progress:", e);
    } finally {
      try {
        console.log(profile?.id);
        const { error: updErr } = await supabase.rpc("increment_points", {
          x: 50,
          row_id: profile?.id,
        });
        if (updErr) throw updErr;
      } catch (e) {
        console.error("Failed to update module completion:", e);
      }
      router.back();
    }
  }

  // -------- UI --------
  if (loading) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="animate-pulse h-4 w-40 rounded bg-gray-200 mb-4" />
        <div className="animate-pulse h-6 w-64 rounded bg-gray-200 mb-6" />
        <div className="animate-pulse h-32 w-full rounded bg-gray-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          className="rounded-lg border px-4 py-2"
          onClick={() => router.replace("/home")}
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Header */}
      <Button onClick={() => router.back()}>Back</Button>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quiz</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Round {round}</p>
          <p className="text-sm">
            Question {index + 1} / {roundQueue.length}{" "}
          </p>
        </div>
      </div>

      <div key={`${current.question_id}-${round}-${index}`}>
        {current.type === "mcq" ? (
          <MCQQuiz
            prompt={current.prompt}
            data={current.payload}
            locked={checked !== null}
            onSubmit={onChildSubmit}
          />
        ) : (
          <ComposeQuiz
            prompt={current.prompt}
            data={current.payload}
            locked={checked !== null}
            onSubmit={onChildSubmit}
          />
        )}
      </div>

      {/* Feedback + Next */}
      {checked && (
        <div
          className={`mt-4 rounded-xl px-3 py-2 text-sm ${
            checked === "correct"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {checked === "correct" ? "Correct!" : "Incorrect!"}
          {explanation ? (
            <div className="mt-1 text-gray-600">{explanation}</div>
          ) : null}
        </div>
      )}

      <div className="mt-6">
        {checked && (
          <button
            onClick={handleNext}
            className="rounded-xl bg-black text-white px-4 py-2"
          >
            {index + 1 === roundQueue.length
              ? retryBucket.length > 0 || checked === "wrong"
                ? "Next"
                : "Finish"
              : "Next"}
          </button>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
