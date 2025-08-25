"use client";

import { Compose } from "@/lib/types";
import { useMemo, useState } from "react";

export default function ComposeQuiz({
  prompt,
  data,
  locked = false,
  onSubmit,
}: {
  prompt: string;
  data: Compose;
  locked?: boolean;
  onSubmit: (result: { correct: boolean }) => void;
}) {
  const [answer, setAnswer] = useState<string[]>([]); // token ids in clicked order

  const tokenMap = useMemo(() => {
    const m = new Map<string, string>();
    data.tokens.forEach((t) => m.set(t.token_id, t.text));
    return m;
  }, [data.tokens]);

  function toggleToken(token_id: string) {
    if (locked) return;
    setAnswer((prev) =>
      prev.includes(token_id)
        ? prev.filter((x) => x !== token_id)
        : [...prev, token_id],
    );
  }

  function removeToken(token_id: string) {
    if (locked) return;
    setAnswer((a) => a.filter((x) => x !== token_id));
  }

  function handleSubmit() {
    if (locked) return;
    const correct =
      answer.length === data.answer_order.length &&
      data.answer_order.every((token_id, i) => token_id === answer[i]);
    onSubmit({ correct });
  }

  function handleClear() {
    if (locked) return;
    setAnswer([]);
  }

  return (
    <div className="rounded-2xl border p-5 shadow-sm bg-primary-foreground">
      <h2 className="text-lg font-medium mb-4">{prompt}</h2>
      <div className="mb-4">
        <div className={`flex flex-wrap gap-2 ${locked ? "opacity-60" : ""}`}>
          {data.tokens.map((t) => {
            const idx = answer.indexOf(t.token_id);
            const selected = idx !== -1;
            return (
              <button
                key={t.token_id}
                type="button"
                onClick={() => toggleToken(t.token_id)}
                disabled={locked}
                className={`relative rounded-full border px-3 py-1 text-md transition
                  ${
                    selected
                      ? "bg-gray-50 text-transparent pointer-events-none"
                      : "border-gray-200 hover:bg-gray-50"
                  }
                  ${locked ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {t.text}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Your answer</p>
        <div className="flex flex-wrap items-center gap-2 border-b-2 pb-2">
          {answer.map((token_id) => (
            <button
              key={token_id}
              type="button"
              onClick={() => removeToken(token_id)}
              disabled={locked}
              className={`rounded-full border px-3 py-1 text-md
                ${locked ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}
              `}
              title="Remove"
            >
              {tokenMap.get(token_id)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={locked || answer.length === 0}
          className={`rounded-xl px-4 py-2 ${
            locked || answer.length === 0
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-black text-white"
          }`}
        >
          Submit
        </button>
        <button
          onClick={handleClear}
          disabled={locked}
          className={`rounded-xl border px-4 py-2 ${
            locked ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
