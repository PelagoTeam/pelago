import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { model } from "@/lib/sealion";
import { Theme } from "@/lib/types";
import { z } from "zod";
import { createServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RequestBody = {
  themeId: string;
  username: string;
};

const StarterSchema = z.object({
  native: z.string().min(1).max(200).default(""),
  romanization: z.string().max(200).default(""),
  english: z.string().min(1).max(200).default(""),
});

function getErrorMessage(e: unknown, fallback = "Unexpected error"): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e && "toString" in e) return String(e);
  return fallback;
}

const normalize = (s = "") => s.replace(/\s+/g, " ").trim();

function buildStarterPrompt({
  theme,
  username,
}: {
  theme: Theme;
  username: string;
}) {
  return `
  You are a friendly ${theme.language} conversation partner in a short role-play.

  Context:
  - Theme: ${theme.title}.
  - User: ${username ?? "Learner"}.
  - Learner level: ${theme.difficulty}.
  - Desired tone/emotion: ${theme.emotion}

  ${theme.prompt}

  Objectives:
  - Open the conversation in ${theme.language} with 2-3 short, natural lines.
  - End with ONE inviting question that fits the theme so the user can reply.
  - Keep it approachable for the given level. Avoid long paragraphs.
  
  Generate ONLY the first message to start the conversation.
  Requirements:
  - 2-3 short, natural lines in ${theme.language}.
  - End with ONE inviting question that fits the theme.
  - Keep it simple and natural for the given difficulty.
  - No teaching tips, no example answers.
  - Do not give any dynamic values and expect me to fill it up, whatever you give me, I will be displaying to user.
  Return JSON ONLY (no code fences or markdown). Start with "{" and end with "}".
  Exact schema:
  { "native": string, "romanization": string, "english": string }
  `.trim();
}

export async function POST(req: NextRequest) {
  const { themeId, username } = (await req.json()) as RequestBody;
  const supabase = await createServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: theme, error: themeErr } = await supabase
    .from("themes")
    .select("theme_id, title, language, prompt, difficulty, emotion")
    .eq("theme_id", themeId)
    .single();

  if (themeErr) {
    return NextResponse.json({ error: themeErr.message }, { status: 500 });
  }

  if (!theme) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  const prompt = buildStarterPrompt({ theme, username });

  console.log("generating", prompt);
  let obj: { native: string; romanization: string; english: string };
  try {
    const { object } = await generateObject({
      model: model,
      prompt: prompt,
      mode: "json",
      schema: StarterSchema,
    });
    obj = object;
  } catch (e: unknown) {
    return NextResponse.json(
      {
        error: "Failed to parse model JSON output",
        details: getErrorMessage(e),
      },
      { status: 502 },
    );
  }

  console.log("generatedStarterMessage", obj);

  const native = normalize(obj.native);
  const romanization = normalize(obj.romanization ?? "");
  const english = normalize(obj.english);

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .upsert({
      user_id: user.id,
      theme_id: theme.theme_id,
      title: theme.title,
      language: theme.language,
      difficulty: theme.difficulty,
    })
    .select("conversation_id")
    .single();

  if (convErr) {
    return NextResponse.json({ error: convErr.message }, { status: 500 });
  }

  const starting_text = `${native}\n${romanization}\n${english}`;

  const { error: msgErr } = await supabase.from("messages").insert({
    conversation_id: conv.conversation_id,
    role: "assistant",
    content: starting_text,
    user_id: user.id,
  });

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }
  return NextResponse.json(
    {
      conversation_id: conv.conversation_id,
    },
    { status: 200 },
  );
}
