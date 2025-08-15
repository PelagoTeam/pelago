import { z } from "zod";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/sealion";

export const runtime = "edge"; // switch to "nodejs" if you use Node-only tools

export async function POST(req: NextRequest) {
  const reqJson = await req.json();
  console.log("req", reqJson);
  const { theme, username, history } = reqJson;

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

  return NextResponse.json(
    {
      native: response.native,
      romanization: response.romanization,
      english: response.english,
      remarks: remarks.remarks,
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
  const prompt = `
You are a friendly ${language} conversation partner in a short role-play.
Theme: ${title}. User: ${username ?? "Learner"}. Level: ${difficulty}.

Continue naturally in ${language}, no teaching tips or meta. End with ONE inviting question.
`;

  const { object } = await generateObject({
    model: model,
    system: prompt,
    messages: history,
    mode: "json",
    schema: z.object({
      native: z.string(),
      romanization: z.string(),
      english: z.string(),
    }),
  });

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

  const prompt = `
You are a friendly ${language} language teacher teaching ${language} at ${difficulty} level.
Your student is in a short role-play session with a partner.
The theme of the role-play is "${title}".
Your task is to give remarks on your student's response to their partner.
Give useful advice to help your student improve, keep it to 50 words maximum.

Conversation so far:
${recent}
`;

  const { object } = await generateObject({
    model: model,
    prompt: prompt,
    mode: "json",
    schema: z.object({
      remarks: z.string(),
    }),
  });

  console.log("generateResponse:", object);

  return object;
}
