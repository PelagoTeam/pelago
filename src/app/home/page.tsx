"use client";

import { useAuth } from "@/contexts/AuthProfileContext";
import PracticeQuiz from "@/components/PracticeQuiz";
import Conversation from "@/components/Conversation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, profile, loading, signOut } = useAuth();
  console.log({ user, profile, loading });

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">SEA-LION Language & Culture</h1>
        {user && (
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut();
              window.location.href = "/";
            }}
          >
            Sign out
          </Button>
        )}
      </header>

      <Tabs defaultValue="practice" className="space-y-6">
        <TabsList>
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
        </TabsList>
        <TabsContent value="practice">
          <PracticeQuiz />
        </TabsContent>
        <TabsContent value="conversation">
          <Conversation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
