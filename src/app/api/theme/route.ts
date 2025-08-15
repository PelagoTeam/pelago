import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { model } from "@/lib/sealion";

export const runtime = "edge"; // or "nodejs"

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  const { text } = await generateText({
    model: model,
    prompt,
  });

  return NextResponse.json({ text: text }, { status: 200 });
}
