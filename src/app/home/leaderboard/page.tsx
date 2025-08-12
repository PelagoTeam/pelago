import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mock = [
  { rank: 1, username: "ayu", points: 1280, streak: 21 },
  { rank: 2, username: "mika", points: 1175, streak: 15 },
  { rank: 3, username: "ernest", points: 1030, streak: 9 },
  { rank: 4, username: "zara", points: 980, streak: 6 },
];

export default function LeaderboardPage() {
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
              <TableHead>Streak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mock.map((row) => (
              <TableRow key={row.rank}>
                <TableCell className="font-medium">{row.rank}</TableCell>
                <TableCell>{row.username}</TableCell>
                <TableCell>{row.points}</TableCell>
                <TableCell>{row.streak} days</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
