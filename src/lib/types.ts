export type QuizQuestion = {
  id: string;
  prompt: string;
  answers: { id: string; text: string; correct?: boolean }[];
  hint?: string;
  language: string;
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

export type Profile = {
  id: string;
  username: string | null;
  current_course: string | null; // ← safer
};

export type Module = {
  module_id: string;
  order: number;
  course_id: string;
  stage_number: number;
};

export type Stages = {
  id: string;
  title: string;
  stage_number: number;
  course_id: string;
};

// TYPES ----------------------------------------------------------------------

export type ConversationType = {
  id: string;
  title: string;
};

export type Theme = {
  id: string;
  title: string;
  language: string;
  starter_prompt: string;
  culture_tips?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
};
