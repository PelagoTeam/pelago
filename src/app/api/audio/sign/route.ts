// app/api/audio/sign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server";

const AUDIO_BUCKET = "audio";
const EXP = 60 * 5;

function normalizeAudioPath(p: string) {
  // decode %3B etc, then drop anything after the extension
  const dec = decodeURIComponent(p);
  return dec.replace(/(\.(webm|mp3|m4a|mp4|ogg|oga))[^/]*$/i, "$1");
}

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("path");
  if (!raw)
    return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const path = normalizeAudioPath(raw);

  const supabase = await createServer();
  // (optional) ownership check:
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user || !path.startsWith(`${user.id}/`)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(path, EXP);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Could not sign URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: data.signedUrl }, { status: 200 });
}
