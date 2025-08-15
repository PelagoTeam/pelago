"use client";

import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MoreVertical, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConversationType } from "@/lib/types";

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
  activeId,
  onSelect,
  onNewConversation,
  onDeleteConversation,
  hrefBase,
  className,
}: {
  conversations: ConversationType[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  hrefBase?: string; // e.g. "/chat" -> navigates to /chat/[id]
  className?: string;
}) {
  return (
    <aside
      className={clsx(
        "flex h-full w-72 shrink-0 flex-col border-r bg-background/60 backdrop-blur-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold">Chats</div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              onClick={onNewConversation}
              className="rounded-xl"
              variant="default"
            >
              <Plus className="mr-1 h-4 w-4" /> New chat
            </Button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border px-2 py-1.5">
          <Search className="h-4 w-4 shrink-0" />
          <Input
            placeholder="Search chats"
            className="h-7 border-0 focus-visible:ring-0"
          />
        </div>
      </div>
      <Separator />

      {/* List */}
      <ScrollArea className="h-full">
        <ul className="p-2">
          {conversations.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
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

      {/* Footer */}
      <Separator />
      <div className="p-3 text-xs text-muted-foreground">
        <div className="leading-tight">
          Tip: Press <kbd className="rounded bg-muted px-1">/</kbd> to focus
          search
        </div>
      </div>
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
      className={clsx(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2 transition-colors",
        active ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted",
      )}
      title={conversation.title}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "truncate text-sm font-medium",
              active && "text-primary",
            )}
          >
            {conversation.title}
          </div>
        </div>
      </div>
      <div className="ml-1 text-muted-foreground">
        <MoreVertical className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
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
      className={clsx(
        "group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 outline-none transition-colors focus-visible:ring-2",
        active ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted",
      )}
      title={conversation.title}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "truncate text-sm font-medium",
              active && "text-primary",
            )}
          >
            {conversation.title}
          </div>
        </div>
      </div>
      <button
        className="ml-1 hidden rounded-md p-1 text-muted-foreground hover:bg-muted group-hover:block"
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.();
        }}
        aria-label="Delete chat"
        title="Delete chat"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
