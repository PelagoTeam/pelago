import { createOpenAI } from "@ai-sdk/openai";

const sealion = createOpenAI({
  apiKey: process.env.NEXT_PUBLIC_SEALION_API_KEY,
  baseURL: process.env.NEXT_PUBLIC_SEALION_API_BASE,
});
export const model = sealion.chat(
  process.env.NEXT_PUBLIC_SEALION_MODEL as string,
);
