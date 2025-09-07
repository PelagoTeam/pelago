// app/api/sealion/v1/chat/completions/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
} from "@aws-sdk/client-sagemaker-runtime";

export const runtime = "nodejs";

const REGION = process.env.AWS_REGION || "us-east-1";
const ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT_NAME!;
const smrt = new SageMakerRuntimeClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/* ---------- Types ---------- */
type ChatRole = "user" | "assistant";
interface ChatMessage {
  role: ChatRole;
  content: string;
}
interface RequestBody {
  messages?: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type?: string };
}

type HFArrayGenerated = Array<{ generated_text?: string }>;
type HFObjectGenerated = {
  generated_text?: string;
  text?: string;
  outputs?: Array<{ text?: string }>;
};

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
  const t = stripFences(text);
  const m = t.match(/\{[\s\S]*\}/);
  return (m ? m[0] : t).trim();
}

function tryParseJSON<T = unknown>(s: string): T | undefined {
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

function getErrorMessage(e: unknown, fallback = "Unexpected error"): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e && "toString" in e) return String(e);
  return fallback;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    // From Vercel AI SDK (OpenAI shape)
    const {
      messages = [],
      temperature = 0.7,
      max_tokens = 256,
      response_format,
    } = body;

    // Build prompt
    const chatParts = messages.map((m) => `${m.role}: ${m.content}`);

    // If JSON requested, add a hard guard line
    const jsonGuard =
      response_format?.type === "json_schema"
        ? 'Return JSON ONLY. No code fences or markdown. Start with "{" and end with "}".'
        : "";

    const prompt = [jsonGuard, chatParts.join("\n")]
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

    const bytes =
      res.Body instanceof Uint8Array
        ? res.Body
        : new Uint8Array(res.Body as ArrayBufferLike);
    const raw = Buffer.from(bytes).toString("utf-8");

    // Normalize container outputs -> plain text
    let generated = raw;

    const arrShape = tryParseJSON<HFArrayGenerated>(raw);
    if (
      Array.isArray(arrShape) &&
      typeof arrShape[0]?.generated_text === "string"
    ) {
      generated = arrShape[0]!.generated_text!;
    } else {
      // 2) Try "object" shape
      const objShape = tryParseJSON<HFObjectGenerated>(raw);
      if (objShape && typeof objShape.generated_text === "string") {
        generated = objShape.generated_text;
      } else if (objShape && typeof objShape.text === "string") {
        generated = objShape.text;
      } else if (
        objShape?.outputs &&
        typeof objShape.outputs[0]?.text === "string"
      ) {
        generated = objShape.outputs[0]!.text!;
      } else {
        // 3) Fallback: if it was valid JSON but not one of the shapes, stringify it;
        // otherwise, if JSON.parse failed entirely, leave the original raw string.
        const anyJson = tryParseJSON<unknown>(raw);
        if (typeof anyJson === "string") {
          generated = anyJson;
        } else if (anyJson !== undefined) {
          generated = JSON.stringify(anyJson);
        }
      }
    }

    if (response_format?.type === "json_schema") {
      const fenced = extractJsonFromFence(generated);
      const jsonStr = fenced ?? extractJsonLoose(generated);
      const ok = tryParseJSON(jsonStr);
      generated = ok !== undefined ? jsonStr : jsonStr;
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
  } catch (err: unknown) {
    const message = getErrorMessage(err, "SageMaker proxy error");
    console.error("SageMaker proxy error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
