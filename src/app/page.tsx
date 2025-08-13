"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Root() {
  const router = useRouter();
  const handleClick = () => router.push("/login");
  return <Button onClick={handleClick}>Login</Button>;
}
