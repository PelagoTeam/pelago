"use client";

import { useMemo, useState } from "react";

export type ComposeToken = { id: string; text: string };
export type ComposeData = {
  tokens: ComposeToken[];
  answer_order: string[];
  explanation: string;
};

type Props = {
  prompt: string;
  data: ComposeData;
  locked?: boolean;
  onSubmit: (result: { correct: boolean }) => void;
};

export default function ComposeQuiz({
  prompt,
  data,
  locked = false,
  onSubmit,
}: Props) {
  const [answer, setAnswer] = useState<string[]>([]); // token ids in clicked order

  const tokenMap = useMemo(() => {
    const m = new Map<string, string>();
    data.tokens.forEach((t) => m.set(t.id, t.text));
    return m;
  }, [data.tokens]);

  function toggleToken(id: string) {
    if (locked) return;
    setAnswer((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function removeToken(id: string) {
    if (locked) return;
    setAnswer((a) => a.filter((x) => x !== id));
  }

  function handleSubmit() {
    if (locked) return;
    const correct =
      answer.length === data.answer_order.length &&
      data.answer_order.every((id, i) => id === answer[i]);
    onSubmit({ correct });
  }

  function handleClear() {
    if (locked) return;
    setAnswer([]);
  }

  return (
    <div className="rounded-2xl border p-5 shadow-sm">
      <h2 className="text-lg font-medium mb-4">{prompt}</h2>

      {/* Fixed-position token bank (no movement) */}
      <div className="mb-4">
        <div className={`flex flex-wrap gap-2 ${locked ? "opacity-60" : ""}`}>
          {data.tokens.map((t) => {
            const idx = answer.indexOf(t.id);
            const selected = idx !== -1;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleToken(t.id)}
                disabled={locked}
                className={`relative rounded-full border px-3 py-1 text-sm transition
                  ${
                    selected
                      ? "border-black bg-gray-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }
                  ${locked ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {t.text}
                {selected && (
                  <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border text-xs">
                    {idx + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Your answer</p>
        <div className="flex flex-wrap items-center gap-2 border-b-2 pb-2">
          {answer.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => removeToken(id)}
              disabled={locked}
              className={`rounded-full border px-3 py-1 text-sm
                ${locked ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}
              `}
              title="Remove"
            >
              {tokenMap.get(id)}
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
