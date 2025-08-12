"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Leaderboard = {
  username: string;
  total_points: number;
};

export default function LeaderboardPage() {
  const supabase = createClient();
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>([]);
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("Users")
        .select("username, total_points")
        .order("total_points", { ascending: false })
        .limit(10);
      if (data) {
        setLeaderboard(data);
      }
    };
    fetchLeaderboard();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((row, index) => (
              <TableRow key={row.username}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{row.username}</TableCell>
                <TableCell>{row.total_points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
