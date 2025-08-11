// src/app/layout.tsx
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
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <div className="container py-6">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
