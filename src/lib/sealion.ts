import { createOpenAI } from "@ai-sdk/openai";

const sealion = createOpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  baseURL: "https://api.sea-lion.ai/v1",
});
export const model = sealion.chat(
  process.env.NEXT_PUBLIC_SEALION_MODEL as string,
);
