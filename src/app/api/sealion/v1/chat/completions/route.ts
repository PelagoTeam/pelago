// app/api/sealion/v1/chat/completions/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
} from "@aws-sdk/client-sagemaker-runtime";

export const runtime = "nodejs"; // SigV4 requires Node runtime

const REGION = process.env.AWS_REGION || "us-east-1";
const ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT_NAME!;
const smrt = new SageMakerRuntimeClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// --- helpers to normalize fenced JSON ---
function stripFences(t: string) {
  return t
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
function extractJsonFromFence(text: string): string | null {
  const reJson = /```json\s*\r?\n(\{[\s\S]*?\})\s*\r?\n```/i;
  const rePlain = /```\s*\r?\n(\{[\s\S]*?\})\s*\r?\n```/i;
  const m = text.match(reJson) ?? text.match(rePlain);
  return m ? m[1].trim() : null;
}
function extractJsonLoose(text: string): string {
  let t = stripFences(text);
  const m = t.match(/\{[\s\S]*\}/);
  return (m ? m[0] : t).trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // From Vercel AI SDK (OpenAI shape)
    const {
      messages = [],
      temperature = 0.7,
      max_tokens = 256,
      response_format,
    } = body ?? {};

    // Build prompt
    const systemParts = messages
      .filter((m: any) => m.role === "system")
      .map((m: any) => String(m.content));
    const chatParts = messages
      .filter((m: any) => m.role !== "system")
      .map((m: any) => `${m.role}: ${m.content}`);

    // If JSON requested, add a hard guard line
    const jsonGuard =
      response_format?.type === "json_schema"
        ? 'Return JSON ONLY. No code fences or markdown. Start with "{" and end with "}".'
        : "";

    const prompt = [...systemParts, jsonGuard, chatParts.join("\n")]
      .filter(Boolean)
      .join("\n\n");

    const payload = {
      inputs: prompt,
      parameters: {
        temperature,
        max_new_tokens: max_tokens,
        // discourage code fences
        stop: ["```"],
      },
    };

    const res = await smrt.send(
      new InvokeEndpointCommand({
        EndpointName: ENDPOINT_NAME,
        ContentType: "application/json",
        Accept: "application/json",
        Body: Buffer.from(JSON.stringify(payload)),
      }),
    );

    const raw = Buffer.from(res.Body as Uint8Array).toString("utf-8");

    // Normalize container outputs -> plain text
    let generated = raw;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed[0]?.generated_text) {
        generated = parsed[0].generated_text;
      } else if ((parsed as any)?.generated_text) {
        generated = (parsed as any).generated_text;
      } else if ((parsed as any)?.text) {
        generated = (parsed as any).text;
      } else if ((parsed as any)?.outputs?.[0]?.text) {
        generated = (parsed as any).outputs[0].text;
      } else if (typeof parsed === "string") {
        generated = parsed;
      } else {
        generated = JSON.stringify(parsed);
      }
    } catch {
      /* keep raw string */
    }

    // If JSON mode requested: clean to a **pure JSON string** (no fences, no prose)
    if (response_format?.type === "json_schema") {
      const fenced = extractJsonFromFence(generated);
      const jsonStr = fenced ?? extractJsonLoose(generated);
      // Optional: verify it is valid JSON before returning (safer for upstream parser)
      try {
        JSON.parse(jsonStr);
        generated = jsonStr; // return clean JSON
      } catch {
        // If parsing fails, still return the stripped text; the caller may fallback
        generated = jsonStr;
      }
    }

    const now = Math.floor(Date.now() / 1000);
    return NextResponse.json(
      {
        id: `cmpl_${now}`,
        object: "chat.completion",
        created: now,
        model: ENDPOINT_NAME,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: generated },
            finish_reason: "stop",
          },
        ],
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("SageMaker proxy error:", err);
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 },
    );
  }
}
