export type QuizQuestion = {
  id: string;
  prompt: string;
  answers: { id: string; text: string; correct?: boolean }[];
  hint?: string;
  language: string; // e.g., "Thai", "Vietnamese"
};

export type Question = {
  id: string;
  created_at: string;
  explanation: string | null;
  hint: string;
  payload: MCQ | Compose;
  position: number;
  prompt: string;
  type: "mcq" | "compose";
};

export type MCQ = {
  answer: string;
  options: { id: string; text: string }[];
  explanation: string | null;
};

export type Compose = {
  tokens: { id: string; text: string }[];
  explanation: string | null;
  answer_order: string[];
};
