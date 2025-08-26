"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Profile } from "@/lib/types";

type Ctx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  profile: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (u: User | null) => {
      if (!u) {
        setProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("user_id, username, current_course, language")
        .eq("user_id", u.id)
        .maybeSingle<Profile>();
      if (error) {
        console.error("[Auth] loadProfile error:", error);
        setProfile(null);
        return;
      }
      setProfile(data ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        const u = session?.user ?? null;
        setUser(u);
        await loadProfile(u);
      } catch (e) {
        console.error("[Auth] boot error:", e);
        setUser(null);
        setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.getUser();
    if (error) console.error("[Auth] refresh getUser error:", error);
    const u = data.user ?? null;
    setUser(u);
    await loadProfile(u);
    setLoading(false);
  }, [supabase, loadProfile]);

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) console.error("[Auth] signOut error:", error);
    setUser(null);
    setProfile(null);
    setLoading(false);
  }, [supabase]);

  return (
    <AuthCtx.Provider value={{ user, profile, loading, refresh, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
