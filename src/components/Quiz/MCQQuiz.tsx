"use client";

import { useState } from "react";

export type MCQOption = { id: string; text: string };
export type MCQData = {
  answer: string;
  options: MCQOption[];
  explanation: string;
};

type Props = {
  prompt: string;
  data: MCQData;
  locked?: boolean; // when true, disable interactions after submit
  onSubmit: (result: { correct: boolean }) => void;
};

export default function MCQQuiz({
  prompt,
  data,
  locked = false,
  onSubmit,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const answered = selected !== null;

  function handleSubmit() {
    if (locked || !answered) return;
    const correct = selected === data.answer;
    onSubmit({ correct });
  }

  function handleClear() {
    if (locked) return;
    setSelected(null);
  }

  return (
    <div className="rounded-2xl border p-5 shadow-sm bg-primary-foreground">
      <h2 className="text-lg font-medium mb-4">{prompt}</h2>

      <div className="flex flex-col gap-2">
        {data.options.map((opt) => (
          <label
            key={opt.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition
              ${selected === opt.id ? "border-black" : "border-gray-200"}
              ${locked ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            <input
              type="radio"
              className="h-4 w-4"
              checked={selected === opt.id}
              onChange={() => !locked && setSelected(opt.id)}
              disabled={locked}
            />
            <span>{opt.text}</span>
          </label>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!answered || locked}
          className={`rounded-xl px-4 py-2 ${
            !answered || locked
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
