import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type ChatMessage,
  blockUser,
  getMessages,
  getThreadPeer,
  markThreadRead,
  reportUser,
  sendMessage,
  setThreadMuted,
  subscribeToThreadMessages,
} from "@/lib/remoteBackend";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Flag,
  MoreVertical,
  SendHorizontal,
  ShieldOff,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function ChatConversationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { threadId } = useParams({ strict: false }) as { threadId?: string };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoadError, setMessagesLoadError] = useState(false);
  // Bumped by the retry button to re-run the messages effect below — plain
  // useEffect has no built-in refetch, unlike the peer useQuery.
  const [retryTick, setRetryTick] = useState(0);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    data: peerData,
    isError: peerIsError,
    refetch: refetchPeer,
  } = useQuery({
    queryKey: ["thread-peer", threadId],
    queryFn: () => getThreadPeer(threadId!),
    enabled: !!threadId,
  });
  // getThreadPeer() never throws (a Supabase/RLS failure resolves as
  // `{ok:false}`), so `isError` alone would miss most real failures — same
  // reasoning as NearbyPage.tsx/ChatThreadsPage.tsx.
  const hasPeerError = peerIsError || (peerData ? !peerData.ok : false);
  const peer = peerData?.ok
    ? { id: peerData.id, username: peerData.username }
    : null;
  const hasConversationError = messagesLoadError || hasPeerError;

  const handleRetryLoad = () => {
    setRetryTick((t) => t + 1);
    refetchPeer();
  };

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: load once per threadId (or on retryTick), not on every messages/queryClient identity change
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    setMessagesLoadError(false);
    getMessages(threadId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setMessages(result.messages);
      } else {
        setMessagesLoadError(true);
      }
    });
    markThreadRead(threadId);
    queryClient.invalidateQueries({ queryKey: ["chat-threads"] });

    const unsubscribe = subscribeToThreadMessages(threadId, (message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
      markThreadRead(threadId);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [threadId, retryTick]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs when the message count changes, even though the effect body doesn't read `messages` itself — it just scrolls
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !threadId || isSending) return;
    setIsSending(true);
    setDraft("");
    try {
      const result = await sendMessage(threadId, body);
      if (!result.ok) {
        toast("Message not sent", { description: result.error });
        setDraft(body);
        return;
      }
      // Realtime subscription appends it; refresh the thread list preview too.
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    } finally {
      setIsSending(false);
    }
  };

  const handleMute = async (muted: boolean) => {
    if (!threadId) return;
    await setThreadMuted(threadId, muted);
    queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    toast(muted ? "Muted" : "Unmuted", {
      description: muted
        ? "You won't be notified for new messages here."
        : undefined,
    });
  };

  const handleBlock = async () => {
    if (!peer) {
      toast("Can't do this right now", {
        description: "Check your connection and try again.",
      });
      return;
    }
    const result = await blockUser(peer.id);
    if (!result.ok) {
      toast("Couldn't block", { description: result.error });
      return;
    }
    toast("Blocked", {
      description: `${peer.username} won't be able to message you again.`,
    });
    navigate({ to: "/chat" });
  };

  const handleReport = async () => {
    if (!peer) {
      toast("Can't do this right now", {
        description: "Check your connection and try again.",
      });
      return;
    }
    const result = await reportUser(peer.id, "Reported from chat conversation");
    if (!result.ok) {
      toast("Couldn't submit report", { description: result.error });
      return;
    }
    toast("Report submitted", {
      description: "Thanks — our team will review this.",
    });
  };

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative"
      data-ocid="chat-conversation.page"
    >
      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4 shrink-0">
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-smooth"
          onClick={() => navigate({ to: "/chat" })}
          data-ocid="chat-conversation.back_button"
          aria-label="Go back to messages"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="font-display font-black text-sm text-foreground truncate max-w-[180px]">
          {peer?.username ?? (hasPeerError ? "Unavailable" : "…")}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-smooth"
              aria-label="More options"
              data-ocid="chat-conversation.menu_trigger"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleMute(true)}
              data-ocid="chat-conversation.mute"
            >
              <VolumeX className="w-4 h-4 mr-2" /> Mute
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleMute(false)}
              data-ocid="chat-conversation.unmute"
            >
              <Volume2 className="w-4 h-4 mr-2" /> Unmute
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleReport}
              data-ocid="chat-conversation.report"
            >
              <Flag className="w-4 h-4 mr-2" /> Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleBlock}
              className="text-destructive"
              data-ocid="chat-conversation.block"
            >
              <ShieldOff className="w-4 h-4 mr-2" /> Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-5 pb-4 flex flex-col gap-2">
        {hasConversationError ? (
          <div className="flex-1 flex items-center justify-center">
            <div
              className="rounded-2xl px-5 py-10 text-center"
              style={{
                background: "oklch(0.16 0.01 260)",
                border: "1px solid oklch(0.26 0.01 260 / 0.4)",
              }}
              data-ocid="chat-conversation.error_state"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "oklch(0.68 0.25 180 / 0.1)" }}
              >
                <WifiOff
                  className="w-7 h-7"
                  style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
                />
              </div>
              <p className="font-display font-bold text-sm text-foreground mb-1">
                Can't load this conversation
              </p>
              <p className="text-white/70 font-body text-xs mb-5">
                Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={handleRetryLoad}
                className="px-5 h-11 rounded-full font-display font-bold text-xs tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
                data-ocid="chat-conversation.error_retry_button"
              >
                Try again
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground font-body mt-8">
            This is the start of your conversation.
          </p>
        ) : (
          messages.map((message) => {
            const isMe = message.senderId === myUserId;
            return (
              <div
                key={message.id}
                className="max-w-[80%] rounded-2xl px-4 py-2.5"
                style={{
                  alignSelf: isMe ? "flex-end" : "flex-start",
                  background: isMe
                    ? "oklch(0.68 0.25 180)"
                    : "oklch(0.16 0.01 260)",
                  border: isMe
                    ? "none"
                    : "1px solid oklch(0.26 0.01 260 / 0.5)",
                  color: isMe ? "oklch(0.08 0.005 260)" : undefined,
                }}
                data-ocid="chat-conversation.message"
              >
                <p className="text-sm font-body leading-snug break-words">
                  {message.body}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="relative z-10 px-5 pb-8 pt-3 shrink-0 flex items-center gap-2"
        style={{ borderTop: "1px solid oklch(0.22 0.01 260 / 0.5)" }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSend();
          }}
          placeholder="Message…"
          className="flex-1 h-12 rounded-full px-4 font-body text-sm text-white placeholder:text-white/25 outline-none"
          style={{
            background: "oklch(0.17 0.012 260)",
            border: "1px solid oklch(0.28 0.01 260)",
          }}
          data-ocid="chat-conversation.composer_input"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || isSending}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.96] disabled:opacity-40 shrink-0"
          aria-label="Send message"
          data-ocid="chat-conversation.send_button"
        >
          <SendHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
