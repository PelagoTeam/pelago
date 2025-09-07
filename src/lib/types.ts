export type Question =
  | {
      question_id: string;
      module_id: string;
      position: number;
      type: "MCQ";
      prompt: string;
      payload: MCQ;
    }
  | {
      question_id: string;
      module_id: string;
      position: number;
      type: "Compose";
      prompt: string;
      payload: Compose;
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
  language: string | null;
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
  emotion: string;
};
