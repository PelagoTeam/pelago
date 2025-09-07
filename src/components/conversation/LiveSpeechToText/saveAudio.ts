import { SupabaseClient } from "@supabase/supabase-js";

const AUDIO_BUCKET = "audio" as const;

type UploadResult = {
  audio_bucket: string;
  audio_url: string;
  signed_url?: string;
  mime: string;
  bytes: number;
};

export async function uploadRecordingAndGetUrl({
  supabase,
  blob,
  userId,
  conversationId,
  signedSeconds = 3600,
}: {
  supabase: SupabaseClient;
  blob: Blob;
  userId: string;
  conversationId: string;
  signedSeconds?: number;
}): Promise<UploadResult> {
  if (!blob || blob.size <= 0) {
    throw new Error("Audio blob is empty.");
  }

  // 1) Normalize MIME & extension (strip any ;codecs=...)
  const rawMime = (blob.type || "application/octet-stream").toLowerCase();
  const mime = sanitizeMime(rawMime);
  const ext = extFromMime(mime);

  // 2) Build a clean storage key (no ;codecs in filename)
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `${userId}/${conversationId}/${fileName}`;

  // 3) Upload with correct contentType
  const { error: uploadErr } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, blob, {
      upsert: false,
      cacheControl: "3600",
      contentType: mime,
    });

  if (uploadErr) {
    throw new Error(`Upload failed: ${uploadErr.message}`);
  }

  const result: UploadResult = {
    audio_bucket: AUDIO_BUCKET,
    audio_url: path,
    mime,
    bytes: blob.size,
  };

  // 4) Optional: return a short-lived signed URL for immediate playback
  if (signedSeconds && signedSeconds > 0) {
    const { data: signed, error: signErr } = await supabase.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(path, signedSeconds);

    if (!signErr && signed?.signedUrl) {
      result.signed_url = signed.signedUrl;
    }
  }

  return result;
}

/** Strip codecs, map to a standard audio MIME most browsers accept. */
function sanitizeMime(mime: string): string {
  // Remove any parameters like ;codecs=opus
  const base = mime.split(";")[0].trim();

  // Common normalizations
  if (base === "audio/x-m4a") return "audio/mp4"; // iOS often uses x-m4a
  if (base === "audio/aac") return "audio/mp4"; // serve AAC as audio/mp4
  // Leave webm/mp3/ogg as-is
  return base || "application/octet-stream";
}

/** Map MIME to extension (keep it simple & predictable). */
function extFromMime(mime: string): string {
  switch (mime) {
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
      return "m4a";
    case "audio/webm":
      return "webm";
    case "audio/ogg":
      return "ogg";
    default:
      const guess = mime.split("/")[1]?.split("+")[0] ?? "bin";
      return guess;
  }
}
