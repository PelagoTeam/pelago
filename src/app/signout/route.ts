import { createServer } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServer();
  await supabase.auth.signOut();
  return new Response(null, { status: 302, headers: { Location: "/login" } });
}
