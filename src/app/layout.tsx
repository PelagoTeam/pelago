import "@/app/globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthProfileContext";

export const metadata: Metadata = {
  title: "Pelago",
  description:
    "Practice drills + AI conversations for Southeast Asian languages",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full [scrollbar-gutter:stable]">
      <body className="antialiased w-[100svw] h-[100svh] text-foreground overflow-x-clip">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
