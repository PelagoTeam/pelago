// app/api/continue/route.ts
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/sealion";
export const runtime = "edge"; // switch to "nodejs" if you use Node-only tools

function buildContinuationPrompt({
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
  const recent = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
  return `
You are a friendly ${language} conversation partner in a short role-play.
Theme: ${title}. User: ${username ?? "Learner"}. Level: ${difficulty}.

Continue naturally in ${language}, no teaching tips or meta. End with ONE inviting question.

Return ONLY valid JSON:
{
  "native": (...)
  "romanization": (...),
  "english": (...)
}

Conversation so far:
${recent}
`;
}

export async function POST(req: NextRequest) {
  const { theme, username, history } = await req.json();

  const prompt = buildContinuationPrompt({
    title: theme.title,
    language: theme.language,
    difficulty: theme.difficulty,
    username,
    history,
  });

  const { text } = await generateText({
    model: model,
    prompt,
  });
  const cleaned = JSON.parse(text);
  const native = cleaned["native"];
  const romanization = cleaned["romanization"];
  const english = cleaned["english"];
  console.log("cleaned", cleaned);

  return NextResponse.json({ native, romanization, english }, { status: 200 });
}
