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
import { useAuth } from "@/contexts/AuthProfileContext";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

type Leaderboard = {
  id: string;
  username: string;
  total_points: number;
};

export default function LeaderboardPage() {
  const supabase = createClient();
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("Users")
        .select("id, username, total_points")
        .eq("current_course", profile?.current_course)
        .order("total_points", { ascending: false })
        .limit(10);
      if (data) setLeaderboard(data);
      setLoading(false);
    };
    if (profile) fetchLeaderboard();
  }, [supabase, profile]);

  const maxPoints = useMemo(
    () =>
      leaderboard.length
        ? Math.max(...leaderboard.map((x) => x.total_points))
        : 0,
    [leaderboard],
  );

  const [top1, top2, top3, ...rest] = leaderboard;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="overflow-hidden border-0">
        <CardHeader className="pb-2">
          <div className="-m-6 -mb-2 p-6 pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  🏆
                </span>
                Weekly Leaderboard
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Top 10 players by points
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Podium (centered #1, flanked by #2 and #3) */}
          <div className="grid grid-cols-3 gap-4 items-end">
            <PodiumTile rank={2} user={top2} points={top2?.total_points} />
            <PodiumTile
              rank={1}
              user={top1}
              points={top1?.total_points}
              highlight
            />
            <PodiumTile rank={3} user={top3} points={top3?.total_points} />
          </div>

          {/* Table for the rest */}
          <Table className="rounded-lg">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right w-40">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 7 }).map((_, i) => (
                  <TableRow key={`s-${i}`} className="animate-pulse">
                    <TableCell>
                      <div className="h-4 w-8 bg-muted rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted" />
                        <div className="h-4 w-40 bg-muted rounded" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="h-4 w-12 bg-muted rounded" />
                        <div className="h-1.5 w-32 bg-muted rounded" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

              {!loading && leaderboard.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No players yet—be the first to score points!
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rest.map((row, i) => {
                  const rank = i + 4; // after top3
                  const pct =
                    maxPoints > 0
                      ? Math.max(
                          6,
                          Math.round((row.total_points / maxPoints) * 100),
                        )
                      : 0;

                  return (
                    <TableRow
                      key={row.id}
                      className="transition-colors even:bg-muted/40 hover:bg-muted/60"
                    >
                      <TableCell className="font-semibold">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm">
                          {rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarCircle name={row.username || "Anonymous"} />
                          <span className="truncate max-w-[18rem]">
                            {row.username || "Anonymous"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="tabular-nums">
                            {row.total_points}
                          </span>
                          <div className="h-1.5 w-40 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------- small presentational helpers ------------------- */

function AvatarCircle({ name }: { name?: string }) {
  const initial = (name?.[0] ?? "U").toUpperCase();
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium ring-1 ring-primary/30">
      {initial}
    </span>
  );
}

function PodiumTile({
  rank,
  user,
  points,
  highlight,
}: {
  rank: 1 | 2 | 3;
  user?: Leaderboard;
  points?: number;
  highlight?: boolean;
}) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const ring =
    rank === 1
      ? "ring-yellow-400/50"
      : rank === 2
        ? "ring-slate-300/50"
        : "ring-amber-600/50";

  // Heights to mimic the podium look
  const barH = rank === 1 ? "h-24" : "h-16";
  const tilePad = rank === 1 ? "p-5" : "p-4";

  return (
    <div
      className={`relative rounded-2xl border bg-background/60 backdrop-blur ${tilePad} flex flex-col items-center justify-between shadow-md`}
    >
      {highlight && (
        <span className="absolute -top-3 text-xl" title="Champion">
          👑
        </span>
      )}
      <div className="flex flex-col items-center gap-2">
        <span className="text-2xl">{medal}</span>
        <div className={`rounded-full ring-2 ${ring}`}>
          <AvatarCircle name={user?.username ?? "Anonymous"} />
        </div>
        <div className="text-center">
          <div className="font-medium max-w-[12rem] truncate">
            {user?.username ?? "Anonymous"}
          </div>
          <div className="text-xs text-muted-foreground">
            {typeof points === "number" ? `${points} pts` : "—"}
          </div>
        </div>
      </div>

      {/* Podium bar */}
      <div
        className={`mt-4 w-full ${barH} rounded-xl bg-muted/60 border flex items-center justify-center`}
      >
        <span className="text-xs text-muted-foreground">Rank #{rank}</span>
      </div>
    </div>
  );
}
