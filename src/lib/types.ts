export type QuizQuestion = {
  id: string;
  prompt: string;
  answers: { id: string; text: string; correct?: boolean }[];
  hint?: string;
  language: string; // e.g., "Thai", "Vietnamese"
};
