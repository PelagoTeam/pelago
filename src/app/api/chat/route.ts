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
  console.log("history", history);
  console.log("username", username);
  console.log("title", title);
  console.log("language", language);
  console.log("difficulty", difficulty);
  const recent = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
  console.log("recent", recent);
  return `
You are a friendly ${language} conversation partner in a short role-play.
Theme: ${title}. User: ${username ?? "Learner"}. Level: ${difficulty}.

Continue naturally in ${language}, no teaching tips or meta. End with ONE inviting question.

Return ONLY valid JSON:
{{
  "native": (...)
  "romanization": (...),
  "english": (...)
}}

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

  // // Parse JSON safely
  // const text = result?.content?.toString?.() ?? "";
  // const start = text.indexOf("{");
  // const end = text.lastIndexOf("}");
  // const json = start !== -1 && end !== -1 ? text.slice(start, end + 1) : "{}";

  // let payload;
  // try {
  //   payload = JSON.parse(json);
  // } catch {
  //   payload = {
  //     lines: [
  //       {
  //         thai: "ยินดีต้อนรับค่ะ เชิญดูเมนูได้เลยนะคะ",
  //         romanization: "yin-dee tôn-ráp khâ, choen duu menu dâai loei ná-khá",
  //         english: "Welcome! Please have a look at the menu.",
  //       },
  //     ],
  //     question: {
  //       thai: "คุณอยากสั่งอะไรดีคะ?",
  //       romanization: "khun yàak sàng à-rai dii khá?",
  //       english: "What would you like to order?",
  //     },
  //   };
  // }
  console.log(text);

  return NextResponse.json(text, { status: 200 });
}
