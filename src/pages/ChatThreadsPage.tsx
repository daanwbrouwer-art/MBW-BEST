import { Logo } from "@/components/Logo";
import { useInternetIdentity } from "@/hooks/use-local-identity";
import { type ChatThreadSummary, getThreads } from "@/lib/remoteBackend";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, VolumeX } from "lucide-react";
import { motion } from "motion/react";

function timeAgoLabel(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "now";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ChatThreadsPage() {
  const navigate = useNavigate();
  const { loginStatus } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success";

  const { data, isLoading } = useQuery({
    queryKey: ["chat-threads"],
    queryFn: getThreads,
    enabled: isLoggedIn,
  });

  const threads: ChatThreadSummary[] = data?.ok ? data.threads : [];

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative"
      data-ocid="chat-threads.page"
    >
      <div
        className="absolute inset-0 pointer-events-none max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.22) 0%, transparent 60%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-smooth"
          onClick={() => navigate({ to: "/profile" })}
          data-ocid="chat-threads.back_button"
          aria-label="Go back to profile"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Logo size="sm" showIcon />
        <div className="w-9" />
      </header>

      <div className="relative z-10 flex flex-col flex-1 px-5 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pt-2 pb-6"
        >
          <h1 className="font-display font-black text-2xl text-foreground mb-1">
            Messages
          </h1>
          <p className="text-xs text-muted-foreground font-body">
            Conversations with athletes you've said hi to
          </p>
        </motion.div>

        {!isLoggedIn ? (
          <div
            className="rounded-2xl px-5 py-10 text-center"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.4)",
            }}
            data-ocid="chat-threads.signin_required"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "oklch(0.68 0.25 180 / 0.1)" }}
            >
              <MessageCircle
                className="w-7 h-7"
                style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
              />
            </div>
            <p className="font-display font-bold text-sm text-foreground mb-1">
              Sign in required
            </p>
            <p className="text-white/70 font-body text-xs mb-5">
              Create an account to message nearby athletes.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/onboarding/auth" })}
              className="px-5 h-11 rounded-full font-display font-bold text-xs tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
            >
              Sign in
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div
            className="rounded-2xl px-5 py-10 text-center"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.4)",
            }}
            data-ocid="chat-threads.empty_state"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "oklch(0.68 0.25 180 / 0.1)" }}
            >
              <MessageCircle
                className="w-7 h-7"
                style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
              />
            </div>
            <p className="font-display font-bold text-sm text-foreground mb-1">
              No conversations yet
            </p>
            <p className="text-white/70 font-body text-xs mb-5">
              Say hi to a nearby athlete to start one.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/nearby" })}
              className="px-5 h-11 rounded-full font-display font-bold text-xs tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
            >
              Find nearby athletes
            </button>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            {threads.map((thread, i) => (
              <button
                key={thread.threadId}
                type="button"
                onClick={() =>
                  navigate({
                    to: "/chat/$threadId",
                    params: { threadId: thread.threadId },
                  })
                }
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-smooth hover:opacity-80"
                style={{
                  borderBottom:
                    i < threads.length - 1
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid={`chat-threads.item.${i + 1}`}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-display font-black text-sm"
                  style={{
                    background: "oklch(0.68 0.25 180 / 0.15)",
                    color: "oklch(0.68 0.25 180)",
                  }}
                >
                  {thread.otherUsername.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-display font-bold text-sm text-foreground truncate">
                      {thread.otherUsername}
                    </p>
                    {thread.muted && (
                      <VolumeX className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-body truncate mt-0.5">
                    {thread.lastMessageBody ??
                      "Say hi to start the conversation"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground font-body">
                    {timeAgoLabel(thread.lastMessageAt)}
                  </span>
                  {thread.isUnread && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: "oklch(0.68 0.25 180)" }}
                      data-ocid={`chat-threads.unread_dot.${i + 1}`}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
