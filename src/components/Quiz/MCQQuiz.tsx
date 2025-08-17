"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Lock, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";

export type MCQOption = { id: string; text: string };
export type MCQData = {
  answer: string;
  options: MCQOption[];
  explanation: string;
};

type Props = {
  prompt: string;
  data: MCQData;
  locked?: boolean;
  onSubmit: (result: { correct: boolean }) => void;
};

export default function MCQQuiz({
  prompt,
  data,
  locked = false,
  onSubmit,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const letters = useMemo(
    () => ["A", "B", "C", "D", "E", "F", "G"].slice(0, data.options.length),
    [data.options.length],
  );

  const answered = selected !== null;

  function handleSubmit() {
    if (locked || !answered) return;
    onSubmit({ correct: selected === data.answer });
  }

  function handleClear() {
    if (locked) return;
    setSelected(null);
  }

  return (
    <Card className="border-none shadow-sm bg-card to-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">{prompt}</CardTitle>
        {locked && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            This attempt is locked
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {data.options.map((opt, idx) => {
            const isActive = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={locked}
                onClick={() => !locked && setSelected(opt.id)}
                className={`roup relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40
                  ${
                    isActive
                      ? "border-primary/60 bg-primary/5 shadow-sm"
                      : "border-border hover:bg-muted/60"
                  }
                  ${locked && "opacity-60 cursor-not-allowed"}`}
                aria-pressed={isActive}
              >
                <div
                  className={`mt-0.5 grid h-7 w-7 place-items-center rounded-full border text-xs font-medium
                    ${
                      isActive
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground group-hover:text-foreground"
                    }
                  `}
                >
                  {letters[idx]}
                </div>

                <div className="flex-1 leading-relaxed">{opt.text}</div>

                {isActive && (
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                )}

                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent group-hover:ring-border/60" />
              </button>
            );
          })}
        </div>
        <Separator className="my-4" />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!answered || locked}
            className={`rounded-xl ${
              !answered || locked
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-black text-white"
            }`}
          >
            Submit
          </Button>
          <Button
            variant={"outline"}
            onClick={handleClear}
            disabled={locked}
            className={`rounded-xl ${
              locked && "opacity-60 cursor-not-allowed"
            }`}
          >
            <X className="mr-1.5 h-4 w-4" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
