"use client";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthProfileContext";
import { useRouter } from "next/navigation";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  return <>{children}</>;
}
