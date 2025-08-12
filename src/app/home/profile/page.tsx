"use client";

import { useAuth } from "@/contexts/AuthProfileContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  console.log("user, profile, loading", user, profile, loading);

  if (loading) return <p>Loading profile…</p>;
  if (!user) return <p>Please sign in to view your profile.</p>;

  return (
    <div className="grid gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Email</Label>
            <Input value={user.email ?? ""} disabled />
          </div>
          <div>
            <Label className="text-sm">Username</Label>
            <Input value={profile?.username ?? ""} disabled />
          </div>
          {/* Add editable fields + save action later if desired */}
          <Button disabled>Save changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
