import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { topic, message } = await req.json();
  // If you have a real SEA‑LION endpoint, call it here.
  // For POC we return a contextual canned reply.
  const reply = `(${topic}) Noted: "${message}". Try a local phrase, e.g., in Thai: "ลดได้ไหมครับ/คะ?" (Can give discount?)`;
  return Response.json({ reply });
}
