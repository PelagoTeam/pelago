import { z } from "zod";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/sealion";
import { createServer } from "@/lib/supabase/server";

export const runtime = "edge"; // switch to "nodejs" if you use Node-only tools

export async function POST(req: NextRequest) {
  const { theme, username, history, conversation_id, audio_url } =
    await req.json();
  const supabase = await createServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [response, remarks] = await Promise.all([
    generateResponse({
      title: theme.title,
      language: theme.language,
      difficulty: theme.difficulty,
      username,
      history,
    }),
    generateRemarks({
      title: theme.title,
      language: theme.language,
      difficulty: theme.difficulty,
      history,
    }),
  ]);

  const rows = [
    {
      conversation_id: conversation_id,
      role: "user",
      content: history[history.length - 1].content,
      user_id: user.id,
      remarks: remarks.remarks,
      audio_url: audio_url ?? null,
    },
    {
      conversation_id: conversation_id,
      role: "assistant",
      content: `${response.native}\n${response.romanization}\n${response.english}`,
      user_id: user.id,
      emotion: response.emotion,
    },
  ];

  const { data, error } = await supabase
    .from("messages")
    .upsert(rows)
    .select("message_id, role");

  const messageIds: {
    user: { message_id: string; role: string } | null;
    assistant: { message_id: string; role: string } | null;
  } = {
    user: null,
    assistant: null,
  };

  if (error === null) {
    messageIds.user = data.find((m) => m.role === "user")?.message_id;
    messageIds.assistant = data.find((m) => m.role === "assistant")?.message_id;
  }

  return NextResponse.json(
    {
      native: response.native,
      romanization: response.romanization,
      english: response.english,
      remarks: remarks.remarks,
      messageIds: messageIds,
    },
    { status: 200 },
  );
}

async function generateResponse({
  title,
  language,
  difficulty,
  username,
  history,
}: {
  title: string;
  language: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  username?: string;
  history: { role: "user" | "assistant"; content: string }[];
}) {
  const recent = (history ?? [])
    .slice(-6)
    .map((m) => `${m.role === "user" ? "student" : "partner"}: ${m.content}`)
    .join("\n");

  const lastStudentUtterance =
    [...(history ?? [])].reverse().find((m) => m.role === "user")?.content ??
    "";

  // System prompt (rules), same structure as generateRemarks
  const system = `
You are a friendly ${language} conversation partner running a short role-play (theme: "${title}").
User: ${username ?? "Learner"}. Level: ${difficulty}.

Write ONLY the next assistant turn, following these rules:
- Speak naturally in ${language}.
- End with EXACTLY ONE inviting question.
- No meta-teaching or explanations in the reply.

Also choose ONE emotion tag for the NEXT scene UI:
- straight-face
- shocked
- friendly

Output JSON ONLY with fields:
- native: reply in ${language}
- romanization: romanized reply ("" if not applicable)
- english: faithful English translation
- emotion: one of "straight-face" | "shocked" | "friendly"

No markdown, no extra fields.
`.trim();

  const userPrompt = `
Conversation so far (latest last):
${recent || "(no prior turns)"}

Student's latest reply:
${lastStudentUtterance || "(none)"}
`.trim();

  const { object } = await generateObject({
    model,
    system,
    prompt: userPrompt,
    mode: "json",
    schema: z.object({
      native: z.string().min(1).max(500),
      romanization: z.string().max(700).optional().default(""),
      english: z.string().min(1).max(700),
      emotion: z.enum(["straight-face", "shocked", "friendly"]),
    }),
  });

  if (!["straight-face", "shocked", "friendly"].includes(object.emotion)) {
    object.emotion = "straight-face";
    console.log("Emotion straight face fall back used.");
  }

  console.log("generateResponse:", object);
  return object;
}

async function generateRemarks({
  title,
  language,
  difficulty,
  history,
}: {
  title: string;
  language: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  username?: string;
  history: { role: "user" | "assistant"; content: string }[];
}) {
  const recent = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "student" : "partner"}: ${m.content}`)
    .join("\n");

  const system = `
You are a friendly ${language} teacher coaching a ${difficulty} learner during a short role-play (theme: "${title}").
Write concise feedback on the student's **latest reply** only.
Requirements:
- 1-2 actionable tips.
- Reference actual errors/opportunities (tone, vocab, grammar, politeness) relevant to ${language}.
- **Maximum 50 words.**
- No markdown, no preambles, no emojis, no extra fields.
- Output JSON ONLY.
`.trim();

  const lastStudentUtterance =
    [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  const userPrompt = `
Conversation (latest last):
${recent || "(no prior turns)"}

Student’s latest reply:
${lastStudentUtterance || "(none)"}
`.trim();

  const { object } = await generateObject({
    model: model,
    system: system,
    prompt: userPrompt,
    mode: "json",
    schema: z.object({
      remarks: z.string().max(400, "Keep the feedback brief."),
    }),
  });

  console.log("generateResponse:", object);

  const capWords = (s: string, maxWords = 50) => {
    const words = s.trim().split(/\s+/);
    if (words.length <= maxWords) return s.trim();
    return (
      words
        .slice(0, maxWords)
        .join(" ")
        .replace(/[,.!?;:]*$/, "") + "…"
    );
  };

  const sanitized = (object?.remarks ?? "")
    .replace(/`+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const remarks = capWords(sanitized, 50);

  return { remarks };
}
