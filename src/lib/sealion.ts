import { createOpenAI } from "@ai-sdk/openai";

const baseURL =
  process.env.AI_PROXY_BASE_URL ??
  `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/api/sealion/v1`;

const sealion = createOpenAI({
  apiKey: "dummy",
  baseURL,
});

export const model = sealion.chat("sealion-sagemaker");
