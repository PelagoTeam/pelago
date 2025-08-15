import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { model } from "@/lib/sealion";
import { Theme } from "@/lib/types";

export const runtime = "edge"; // or "nodejs"

function buildStarterPrompt({
  theme,
  username,
}: {
  theme: Theme;
  username: string;
}) {
  return `
  You are a friendly ${theme.language} conversation partner in a short role-play.
  Theme: ${theme.title}.
  User: ${username ?? "Learner"}.
  Learner level: ${theme.difficulty}.

  Objectives:
  - Open the conversation in ${theme.language} with 2-3 short, natural lines.
  - End with ONE inviting question that fits the theme so the user can reply.
  - Keep it approachable for the given level. Avoid long paragraphs.
  - Avoid IPA or overly technical grammar jargon.
  
  Generate ONLY the first message to start the conversation.
  Requirements:
  - 2-3 short, natural lines in ${theme.language}.
  - End with ONE inviting question that fits the theme.
  - Keep it simple and natural for the given difficulty.
  - No teaching tips, no example answers, no meta commentary.

  Output format:
  {
    "native": (...)
    "romanization": (...),
    "english": (...)
  }
  `;
}

export async function POST(req: NextRequest) {
  const { theme, username } = await req.json();

  const prompt = buildStarterPrompt({ theme, username });

  console.log("generating text...");
  const { text } = await generateText({
    model: model,
    prompt,
  });

  const cleaned = JSON.parse(text);
  const native = cleaned["native"];
  const romanization = cleaned["romanization"];
  const english = cleaned["english"];

  return NextResponse.json({ native, romanization, english }, { status: 200 });
}
