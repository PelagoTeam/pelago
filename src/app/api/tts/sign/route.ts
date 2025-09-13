// app/api/tts/sign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server";

const BUCKET = "tts";
const EXP = 60 * 5;

function normalizeAudioPath(p: string) {
  const dec = decodeURIComponent(p.trim());
  if (/^https?:\/\//i.test(dec))
    throw new Error("Expected a storage path, not a URL");
  return dec.replace(/[?#].*$/, "");
}

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("path");
  if (!raw)
    return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const path = normalizeAudioPath(raw);

  const supabase = await createServer();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, EXP);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Could not sign URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: data.signedUrl }, { status: 200 });
}
