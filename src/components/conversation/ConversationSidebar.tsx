"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MoreVertical, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConversationType } from "@/lib/types";
import { useSearchParams } from "next/navigation";

/**
 * ChatSidebar
 * - Renders a left sidebar
 *
 * Props:
 * - chats: list of chat summaries
 * - activeId?: the currently selected chat id (for styling)
 * - onSelect?: callback when a chat is clicked (used if hrefBase is not provided)
 * - onNewChat?: callback for the "+ New chat" button
 * - onDeleteChat?: callback to delete a chat from the overflow menu
 * - hrefBase?: when provided (e.g. "/conversations"), items will navigate to `${hrefBase}/${id}` using <Link/>
 * - className?: container className
 */
export default function ConversationSidebar({
  conversations,
  onSelect,
  onNewConversation,
  onDeleteConversation,
  hrefBase,
}: {
  conversations: ConversationType[];
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  hrefBase?: string; // e.g. "/chat" -> navigates to /chat/[id]
}) {
  const search = useSearchParams();
  const activeId = search.get("id");

  return (
    <aside className="flex flex-col w-72 h-full border-r shrink-0 bg-background/60 backdrop-blur-sm">
      <div className="p-3">
        <div className="flex gap-2 items-center">
          <div className="text-lg font-semibold">Chats</div>
          <div className="flex gap-2 items-center ml-auto">
            <Button
              size="sm"
              onClick={onNewConversation}
              className="rounded-xl"
              variant="default"
            >
              <Plus className="mr-1 w-4 h-4" /> New chat
            </Button>
          </div>
        </div>
        <div className="flex gap-2 items-center py-1.5 px-2 mt-3 rounded-xl border">
          <Search className="w-4 h-4 shrink-0" />
          <Input
            placeholder="Search chats"
            className="h-7 border-0 focus-visible:ring-0"
          />
        </div>
      </div>
      <Separator />

      {/* List */}
      <ScrollArea className="h-full">
        <ul className="flex flex-col gap-1 p-2">
          {conversations.length === 0 && (
            <li className="py-8 px-3 text-sm text-center text-muted-foreground">
              No chats found
            </li>
          )}
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              {hrefBase ? (
                <ItemLink
                  conversation={conversation}
                  active={conversation.id === activeId}
                  href={`${hrefBase}/${conversation.id}`}
                />
              ) : (
                <ItemButton
                  conversation={conversation}
                  active={conversation.id === activeId}
                  onClick={() => onSelect(conversation.id)}
                  onDelete={() => onDeleteConversation(conversation.id)}
                />
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </aside>
  );
}

function ItemLink({
  conversation,
  active,
  href,
}: {
  conversation: ConversationType;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 transition-colors ${active ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted"}`}
      title={conversation.title}
    >
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex gap-2 items-center">
          <div
            className={`truncate text-sm font-medium ${active && "text-primary"}`}
          >
            {conversation.title}
          </div>
        </div>
      </div>
      <div className="ml-1 text-muted-foreground">
        <MoreVertical className="w-4 h-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}

function ItemButton({
  conversation,
  active,
  onClick,
  onDelete,
}: {
  conversation: ConversationType;
  active?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      role="button"
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      className={`
        group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 outline-none transition-colors focus-visible:ring-2 ${active ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted"}
      `}
      title={conversation.title}
    >
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex gap-2 items-center">
          <div
            className={`truncate text-sm font-medium ${active && "text-primary"}`}
          >
            {conversation.title}
          </div>
        </div>
      </div>
      <button
        className="p-1 ml-1 rounded-md opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.();
        }}
        aria-label="Delete chat"
        title="Delete chat"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
