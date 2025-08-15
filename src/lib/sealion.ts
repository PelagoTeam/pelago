import { createOpenAI } from "@ai-sdk/openai";

const sealion = createOpenAI({
  apiKey: process.env.SEALION_API_KEY,
  baseURL: process.env.SEALION_API_BASE,
});
export const model = sealion.chat(process.env.SEALION_MODEL as string);
