export type Question = {
  question_id: string;
  created_at: string;
  explanation: string | null;
  hint: string;
  payload: MCQ | Compose;
  position: number;
  prompt: string;
  type: "MCQ" | "Compose";
};

export type MCQ = {
  answer: string;
  options: { option_id: string; text: string }[];
  explanation: string | null;
};

export type Compose = {
  tokens: { token_id: string; text: string }[];
  explanation: string | null;
  answer_order: string[];
};

export type Profile = {
  user_id: string;
  username: string | null;
  current_course: string | null;
};

export type Module = {
  module_id: string;
  module_number: number;
  course_id: string;
  stage_number: number;
};

export type Stages = {
  stage_id: string;
  title: string;
  stage_number: number;
  course_id: string;
};

export type ConversationType = {
  conversation_id: string;
  title: string;
};

export type Theme = {
  theme_id: string;
  title: string;
  language: string;
  prompt: string;
  culture_tips?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
};
