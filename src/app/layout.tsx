import "@/app/globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthProfileContext";

export const metadata: Metadata = {
  title: "SEA-LION Language & Culture",
  description:
    "Practice drills + AI conversations for Southeast Asian languages",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased h-[100svh] w-[100svw] text-foreground">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
