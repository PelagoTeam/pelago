// app/api/tts/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
} from "@aws-sdk/client-sagemaker-runtime";
import { createServer } from "@/lib/supabase/server";

/* ---------------- AWS client ---------------- */
const smClient = new SageMakerRuntimeClient({
  region: process.env.AWS_REGION! || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/* ------------- Supabase clients ------------- */
const TTS_BUCKET = "tts";

/* ------------------ Helpers ----------------- */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

function floatToWavPCM16(float32: Float32Array, sampleRate: number): Buffer {
  const len = float32.length;
  const pcm16 = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const blockAlign = 2; // 16-bit mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm16.byteLength;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // audio format PCM
  header.writeUInt16LE(1, 22); // channels = 1
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, Buffer.from(pcm16.buffer)]);
}

/* ------------------- Route ------------------ */

export async function POST(req: NextRequest) {
  try {
    const { text, userId, conversationId, messageId } = await req.json();
    console.log("TTS request", text, userId, conversationId, messageId);

    if (!text || !userId || !conversationId || !messageId) {
      return NextResponse.json(
        { error: "text, userId, conversationId, messageId required" },
        { status: 400 },
      );
    }

    // 1) Invoke SageMaker (default HF server expects "inputs")
    const cmd = new InvokeEndpointCommand({
      EndpointName: process.env.TTS_ENDPOINT_NAME || "mms-tts-tha-female",
      ContentType: "application/json",
      Accept: "application/json",
      Body: Buffer.from(JSON.stringify({ inputs: text })),
    });
    const resp = await smClient.send(cmd);
    const payloadText = Buffer.from(resp.Body!).toString("utf-8");
    const payload = JSON.parse(payloadText);
    console.log("TTS generated");

    let wavBuffer: Buffer;

    if (payload.audio && payload.sampling_rate) {
      const audio = Array.isArray(payload.audio[0])
        ? payload.audio[0]
        : payload.audio;
      const sr = Number(payload.sampling_rate) || 16000;
      wavBuffer = floatToWavPCM16(Float32Array.from(audio as number[]), sr);
    } else if (payload.audio_base64_wav) {
      wavBuffer = Buffer.from(payload.audio_base64_wav, "base64");
    } else {
      return NextResponse.json(
        { error: "Unexpected TTS response shape", raw: payload },
        { status: 502 },
      );
    }

    const storagePath = `${userId}/${conversationId}/${messageId}.wav`;
    const supabase = await createServer();
    const [storageRes, messageRes] = await Promise.all([
      supabase.storage.from(TTS_BUCKET).upload(storagePath, wavBuffer, {
        upsert: true,
        cacheControl: "3600",
        contentType: "audio/wav",
      }),
      supabase
        .from("messages")
        .update({ speech_url: storagePath })
        .eq("message_id", messageId),
    ]);

    if (storageRes.error) {
      console.error("Supabase upload error:", storageRes.error);
      return NextResponse.json(
        { error: storageRes.error.message },
        { status: 502 },
      );
    }

    if (messageRes.error) {
      console.error("Supabase update error:", messageRes.error);
      return NextResponse.json(
        { error: messageRes.error.message },
        { status: 502 },
      );
    }

    return NextResponse.json({ speech_url: storagePath }, { status: 200 });
  } catch (err: unknown) {
    console.error("TTS route error:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
