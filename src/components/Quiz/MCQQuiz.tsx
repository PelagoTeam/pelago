"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MCQ } from "@/lib/types";

type SubmitState = "idle" | "correct" | "wrong";

export default function MCQQuiz({
  payload,
  submitState,
  onSubmit,
}: {
  payload: MCQ;
  submitState: SubmitState;
  onSubmit: (ok: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (submitState === "idle") setSelectedId(null);
  }, [submitState]);

  useEffect(() => {
    if (submitState === "wrong") {
      const t = setTimeout(() => setSelectedId(null), 800);
      return () => clearTimeout(t);
    }
  }, [submitState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    onSubmit(selectedId === payload.answer);
  };

  return (
    <form id="mcq-form" onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        {payload.options.map((opt) => {
          const isChosen = selectedId === opt.id;
          const disabled = submitState === "correct"; // lock after correct, awaiting Next
          return (
            <Button
              key={opt.id}
              type="button"
              variant={isChosen ? "default" : "secondary"}
              className="justify-start h-auto py-4 text-left"
              onClick={() => setSelectedId(opt.id)}
              disabled={disabled}
              aria-pressed={isChosen}
            >
              {opt.text}
            </Button>
          );
        })}
      </div>

      {submitState === "correct" && payload.explanation && (
        <p className="text-sm text-muted-foreground">{payload.explanation}</p>
      )}
    </form>
  );
}
