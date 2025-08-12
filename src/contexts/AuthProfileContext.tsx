"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  username: string | null;
  created_at?: string;
  current_course: string;
};

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
        .from("Users")
        .select("id, username, current_course")
        .eq("id", u.id)
        .maybeSingle();

      if (error) {
        console.error("[Auth] loadProfile error:", error);
        setProfile(null);
        return;
      }
      setProfile(data ?? null);
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("[Auth] getUser error:", error);
      if (!mounted) return;
      setUser(data.user ?? null);
      await loadProfile(data.user ?? null);
      if (mounted) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        setLoading(true);
        await loadProfile(nextUser);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.getUser();
    if (error) console.error("[Auth] refresh getUser error:", error);
    const fresh = data.user ?? null;
    setUser(fresh);
    await loadProfile(fresh);
    setLoading(false);
  }, [supabase, loadProfile]);

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[Auth] signOut error:", error);
    }
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
