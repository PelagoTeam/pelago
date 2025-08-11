"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Profile = { id: string; username: string | null; created_at?: string };
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

  useEffect(() => {
    console.log("[AuthProvider]", { user, loading });
  }, [user, loading]);

  const loadProfile = async (u: User | null) => {
    try {
      if (!u) {
        setProfile(null);
        return;
      }
      console.log("fetching");
      const { data } = await supabase
        .from("Users")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();
      console.log("done fetching");
      setProfile((data as Profile) ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      await loadProfile(user);
    })();
  }, [supabase]);

  return (
    <AuthCtx.Provider
      value={{
        user,
        profile,
        loading,
        refresh: async () => {
          setLoading(true);
          await loadProfile(user);
        },
        signOut: async () => {
          const { error } = await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          if (error) throw error;
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
