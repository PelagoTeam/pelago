"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { Compose, Question } from "@/lib/types";

type Token = { id: string; text: string };
type ComposeQuestion = {
  id: string;
  language: string;
  prompt: string;
  tokens: Token[];
  correct: string[];
  hint?: string;
};

const seed: ComposeQuestion[] = [
  {
    id: "q1",
    language: "Japanese (romaji)",
    prompt: "Arrange to say: “I want to drink water.”",
    tokens: [
      { id: "t1", text: "Mizu" },
      { id: "t2", text: "wo" },
      { id: "t3", text: "nomi" },
      { id: "t4", text: "tai" },
      { id: "d1", text: "taberu" },
      { id: "d2", text: "desu" },
      { id: "d3", text: "kudasai" },
    ],
    correct: ["t1", "t2", "t3", "t4"],
    hint: "Object marker follows the noun; 'nomi' + 'tai' = want to drink.",
  },
  {
    id: "q2",
    language: "Malay",
    prompt: "Arrange to say: “Where is the toilet?”",
    tokens: [
      { id: "m1", text: "Di" },
      { id: "m2", text: "mana" },
      { id: "m3", text: "tandas" },
      { id: "m4", text: "ini" },
      { id: "m5", text: "berapa" },
    ],
    correct: ["m1", "m2", "m3"],
  },
  {
    id: "q3",
    language: "Indonesian",
    prompt: "Arrange to say: “I want to eat fried rice.”",
    tokens: [
      { id: "i1", text: "Saya" },
      { id: "i2", text: "mau" },
      { id: "i3", text: "makan" },
      { id: "i4", text: "nasi" },
      { id: "i5", text: "goreng" },
      { id: "i6", text: "minum" },
      { id: "i7", text: "air" },
    ],
    correct: ["i1", "i2", "i3", "i4", "i5"],
  },
];

type Phase = "answering" | "correct" | "wrong";

export default function ComposeQuiz({
  payload,
  submitState,
  onSubmit,
}: {
  payload: Compose;
  submitState: string;
  onSubmit: (ok: boolean) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [attempt, setAttempt] = useState(0); // reshuffle bank per attempt

  const total = seed.length;
  const q = useMemo(() => seed[idx], [idx]);

  // Deterministic shuffle per question + attempt so each retry reorders tokens
  const bankOrder = useMemo(() => {
    const ids = q.tokens.map((t) => t.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(hash(`${q.id}-${attempt}-${i}`) % (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  }, [q, attempt]);

  useEffect(() => {
    setSelected([]);
    setPhase("answering");
    setAttempt(0);
  }, [idx]);

  const bankTokens = bankOrder
    .map((id) => q.tokens.find((t) => t.id === id)!)
    .filter((t) => !selected.includes(t.id));

  const selectedTokens = selected.map(
    (id) => q.tokens.find((t) => t.id === id)!
  );

  const isExactMatch = arraysEqual(selected, q.correct);

  const WRONG_RESET_DELAY = 1000; // ms

  const submit = () => {
    if (selected.length === 0 || phase !== "answering") return;

    if (isExactMatch) {
      setPhase("correct");
      setScore((s) => s + 1);
    } else {
      setPhase("wrong");
      // auto-restart the same question after a short feedback window
      setTimeout(() => {
        setSelected([]);
        setPhase("answering");
        setAttempt((a) => a + 1); // reshuffle bank
      }, WRONG_RESET_DELAY);
    }
  };

  const next = () => {
    if (phase !== "correct") return;
    if (idx < total - 1) {
      setIdx((i) => i + 1);
    } else {
      // Finished — restart entire quiz (or navigate elsewhere)
      setIdx(0);
      setSelected([]);
      setScore(0);
      setPhase("answering");
      setAttempt(0);
    }
  };

  const clearToken = (id: string) => {
    if (phase !== "answering") return;
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  const addToken = (id: string) => {
    if (phase !== "answering") return;
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>
          Practice •{" "}
          <span className="font-normal text-muted-foreground">
            {q.language}
          </span>
        </CardTitle>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {idx + 1}/{total}
          </Badge>
          <Progress value={(idx / total) * 100} className="w-40" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-lg font-medium">{q.prompt}</p>

        {/* Answer builder */}
        <div className="space-y-3">
          <div
            className={[
              "min-h-14 rounded-xl border px-3 py-2 flex flex-wrap items-center gap-2",
              "transition",
              phase === "wrong"
                ? "border-destructive/60 bg-destructive/5"
                : "border-dashed bg-muted/40",
            ].join(" ")}
            aria-label="Your answer"
          >
            {selectedTokens.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Tap tokens below to build your sentence…
              </span>
            ) : (
              selectedTokens.map((t) => (
                <Button
                  key={t.id}
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => clearToken(t.id)}
                  disabled={phase !== "answering"}
                  title="Remove token"
                >
                  {t.text}
                </Button>
              ))
            )}
          </div>

          {/* Word bank */}
          <div className="flex flex-wrap gap-2">
            {bankTokens.map((t) => (
              <Button
                key={t.id}
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => addToken(t.id)}
                disabled={phase !== "answering"}
              >
                {t.text}
              </Button>
            ))}
          </div>

          {/* Optional hint */}
          {q.hint && (
            <p className="text-sm text-muted-foreground">Hint: {q.hint}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          {phase !== "correct" && (
            <Button onClick={submit} disabled={selected.length === 0}>
              Submit
            </Button>
          )}
          {phase === "correct" && (
            <Button onClick={next}>
              {idx === total - 1 ? "Finish" : "Next"}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setSelected([])}
            disabled={phase !== "answering" || selected.length === 0}
          >
            Clear selection
          </Button>
        </div>

        {/* Feedback */}
        {phase === "wrong" && (
          <p className="text-sm text-destructive">Wrong. Try again…</p>
        )}
        {phase === "correct" && (
          <p className="text-sm text-green-600">Correct!</p>
        )}

        {/* Final score preview on last question */}
        {idx === total - 1 && phase === "correct" && (
          <p className="text-sm text-muted-foreground">
            Final score: {score} / {total}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- helpers ---------- */

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Deterministic pseudo-random
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}
