"use client";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthProfileContext";
import { useRouter } from "next/navigation";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login`);
    }
  }, [loading, user, router]);
  if (loading) return null;
  if (!user) return null;
  return <>{children}</>;
}
