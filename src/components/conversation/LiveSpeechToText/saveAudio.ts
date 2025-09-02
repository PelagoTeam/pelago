import { SupabaseClient } from "@supabase/supabase-js";

export async function uploadRecordingAndGetUrl({
  supabase,
  blob,
  userId,
  conversationId,
  signedSeconds = 3600, // 1h
}: {
  supabase: SupabaseClient;
  blob: Blob;
  userId: string;
  conversationId: string;
  signedSeconds?: number;
}) {
  const fileName = `${crypto.randomUUID()}.${extFromMime(blob.type)}`;
  const path = `${userId}/${conversationId}/${fileName}`;

  const { error: uploadErr } = await supabase.storage
    .from("audio")
    .upload(path, blob, {
      contentType: blob.type || "application/octet-stream",
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadErr) throw uploadErr;

  // optional: get a short-lived URL right now (for immediate playback)
  const { data: signed, error: signErr } = await supabase.storage
    .from("audio")
    .createSignedUrl(path, signedSeconds);

  if (signErr) throw signErr;

  return {
    audio_bucket: "audio",
    audio_url: path, // <-- save these two in Postgres
    signed_url: signed.signedUrl, // short-lived; DON'T store permanently
    mime: blob.type || "application/octet-stream",
    bytes: (blob as any).size ?? 0,
  };
}

function extFromMime(mime?: string) {
  if (!mime) return "bin";
  if (mime.startsWith("audio/")) return mime.split("/")[1] || "webm";
  return "bin";
}
