"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import type { QuizQuestion } from "@/lib/types";

const seed: QuizQuestion[] = [
  {
    id: "q1",
    language: "Thai",
    prompt: "How do you say ‘Thank you’ in Thai?",
    answers: [
      { id: "a1", text: "Xin chào" },
      { id: "a2", text: "Khop khun krub/ka", correct: true },
      { id: "a3", text: "Salamat" },
      { id: "a4", text: "Terima kasih" },
    ],
    hint: "Starts with Khop…",
  },
  {
    id: "q2",
    language: "Vietnamese",
    prompt: "Translate: ‘How much is this?’",
    answers: [
      { id: "b1", text: "Bao nhiêu tiền?", correct: true },
      { id: "b2", text: "Berapa harga ini?" },
      { id: "b3", text: "Magkano ito?" },
      { id: "b4", text: "Ni hao ma?" },
    ],
  },
  {
    id: "q3",
    language: "Singlish",
    prompt: "Pick the most natural reply: ‘Can help carry this?’",
    answers: [
      { id: "c1", text: "Yes, I can assist you." },
      { id: "c2", text: "Can lah.", correct: true },
      { id: "c3", text: "Sure thing, mate." },
      { id: "c4", text: "Affirmative." },
    ],
  },
];

export default function PracticeQuiz() {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const total = seed.length;
  const q = useMemo(() => seed[idx], [idx]);

  useEffect(() => setSelected(null), [idx]);

  const submit = () => {
    if (!selected) return;
    const correct = q.answers.find((a) => a.correct)?.id === selected;
    setScore((s) => s + (correct ? 1 : 0));
    if (idx < total - 1) setIdx(idx + 1);
  };

  const reset = () => {
    setIdx(0);
    setSelected(null);
    setScore(0);
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
        <div className="grid sm:grid-cols-2 gap-3">
          {q.answers.map((a) => (
            <Button
              key={a.id}
              variant={selected === a.id ? "default" : "secondary"}
              className="justify-start h-auto py-4 text-left"
              onClick={() => setSelected(a.id)}
            >
              {a.text}
            </Button>
          ))}
        </div>
        <div className="flex gap-3">
          <Button onClick={submit} disabled={!selected}>
            {idx === total - 1 ? "Finish" : "Next"}
          </Button>
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>
        {idx === total - 1 && selected && (
          <p className="text-sm text-muted-foreground">
            Final score (if correct):{" "}
            {score +
              (q.answers.find((a) => a.correct)?.id === selected ? 1 : 0)}{" "}
            / {total}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
