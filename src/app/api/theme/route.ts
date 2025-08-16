import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { model } from "@/lib/sealion";
import { Theme } from "@/lib/types";
import { z } from "zod";
import { createServer } from "@/lib/supabase/server";

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
  
  Generate ONLY the first message to start the conversation.
  Requirements:
  - 2-3 short, natural lines in ${theme.language}.
  - End with ONE inviting question that fits the theme.
  - Keep it simple and natural for the given difficulty.
  - No teaching tips, no example answers.
  - Do not give any dynamic values and expect me to fill it up, whatever you give me, I will be displaying to user.
  Return ONLY a JSON object with exactly these fields:
{ "native": string, "romanization": string, "english": string }
`.trim();
}

export async function POST(req: NextRequest) {
  const { themeId, username } = await req.json();
  const supabase = await createServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: theme } = await supabase
    .from("themes")
    .select("id, title, language, starter_prompt, difficulty")
    .eq("id", themeId)
    .single();

  if (!theme) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  const prompt = buildStarterPrompt({ theme, username });

  console.log("generating", prompt);
  const { object } = await generateObject({
    model: model,
    prompt: prompt,
    mode: "json",
    schema: z.object({
      native: z.string(),
      romanization: z.string(),
      english: z.string(),
    }),
  });

  console.log("generatedStarterMessage", object);
  console.log("saving...");

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .upsert({
      user_id: user.id,
      theme_id: theme.id,
      title: theme.title,
    })
    .select("id")
    .single();

  if (convErr) {
    return NextResponse.json({ error: convErr.message }, { status: 500 });
  }

  const starting_text =
    object.native + "\n" + object.romanization + "\n" + object.english;
  console.log("text generted");

  const { error: msgErr } = await supabase.from("messages").insert({
    conversation_id: conv.id,
    role: "assistant",
    content: starting_text,
    user_id: user.id,
  });

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }
  console.log("message saved");
  return NextResponse.json(
    {
      id: conv.id,
    },
    { status: 200 },
  );
}
