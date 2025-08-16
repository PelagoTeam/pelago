import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send as SendIcon } from "lucide-react";

export default function ConversationLoading() {
  return (
    <Card className="shadow-sm border-none bg-gradient-to-b from-background to-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <span className="text-muted-foreground">Conversation</span>
          <span className="text-muted-foreground">•</span>
          <Skeleton className="h-5 w-48 rounded-full" />
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* message list skeleton */}
        <div className="overflow-y-auto pr-1 sm:pr-2 space-y-3 max-h-[55vh] min-h-[300px]">
          {/* assistant bubble */}
          <div className="flex items-start gap-2">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="max-w-[70%]">
              <Skeleton className="h-4 w-56 rounded-2xl mb-2" />
              <Skeleton className="h-4 w-40 rounded-2xl" />
            </div>
          </div>

          {/* user bubble */}
          <div className="flex justify-end gap-2">
            <div className="max-w-[70%]">
              <Skeleton className="h-4 w-48 rounded-2xl mb-2" />
              <Skeleton className="h-4 w-36 rounded-2xl" />
            </div>
            <div className="h-8 w-8 rounded-full bg-muted" />
          </div>

          {/* assistant bubble */}
          <div className="flex items-start gap-2">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="max-w-[70%]">
              <Skeleton className="h-4 w-64 rounded-2xl mb-2" />
              <Skeleton className="h-4 w-52 rounded-2xl" />
            </div>
          </div>
        </div>

        <Separator />

        {/* composer skeleton */}
        <div className="flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 shadow-xs">
          <Textarea
            placeholder="Loading…"
            className="h-12 min-h-12 resize-none border-0 bg-transparent text-muted-foreground"
            disabled
          />
          <Button size="icon" className="rounded-xl" disabled aria-disabled>
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
