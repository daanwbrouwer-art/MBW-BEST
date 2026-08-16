import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { useTier } from "@/hooks/use-tier";
import { supabase } from "@/lib/supabaseClient";
import {
  type FoundProfile,
  type FriendshipEntry,
  type PendingPartyInvite,
  createTrainTogetherParty,
  findProfileByUsername,
  getSessionByInviteCode,
  inviteToParty,
  joinPartyByCode,
  listFriendships,
  listPendingPartyInvites,
  respondToFriendRequest,
  respondToPartyInvite,
  sendFriendRequest,
} from "@/lib/trainTogetherBackend";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, Lock, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

const PARTY_SIZES = [2, 3, 4] as const;

// ─── Gate: real account + active subscription required ────────────────────

function TrainTogetherLocked({
  needsAccount,
  onSubscribe,
}: {
  needsAccount: boolean;
  onSubscribe: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{
          background: "oklch(0.68 0.25 180 / 0.15)",
          border: "2px solid oklch(0.68 0.25 180 / 0.4)",
        }}
      >
        <Lock className="w-7 h-7" style={{ color: "oklch(0.68 0.25 180)" }} />
      </div>
      <h1 className="font-display font-black text-2xl text-foreground mb-2">
        Train Together
      </h1>
      <p className="text-sm text-muted-foreground font-body mb-6 max-w-xs">
        {needsAccount
          ? "Training with friends needs a real account, so your invites and progress carry across devices."
          : "Train Together is a subscriber feature — subscribe to invite friends and train live together."}
      </p>
      <Button
        className="w-full h-12 font-display font-black text-base tracking-[0.1em] rounded-2xl uppercase"
        onClick={
          needsAccount
            ? () => navigate({ to: "/onboarding/create-account" })
            : onSubscribe
        }
        data-ocid="train-together.locked_cta"
      >
        {needsAccount ? "Create an account" : "Subscribe"}
      </Button>
    </div>
  );
}

// ─── Party size + roster panel ─────────────────────────────────────────────

interface RosterSlot {
  id: string;
  username: string;
}

function PartySetupPanel({
  myUsername,
  friendships,
  onClose,
  onCreated,
}: {
  myUsername: string;
  friendships: FriendshipEntry[];
  onClose: () => void;
  onCreated: (sessionId: string) => void;
}) {
  const [partySize, setPartySize] = useState<2 | 3 | 4>(2);
  const [slots, setSlots] = useState<(RosterSlot | null)[]>([null, null, null]);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const searchMutation = useMutation({
    mutationFn: findProfileByUsername,
    onSuccess: (found: FoundProfile | null) => {
      if (!found) {
        toast("No one found with that username");
        return;
      }
      if (pickerSlot === null) return;
      setSlots((prev) => {
        const next = [...prev];
        next[pickerSlot] = { id: found.id, username: found.username };
        return next;
      });
      setPickerSlot(null);
      setSearch("");
    },
    onError: (err: Error) =>
      toast("Search failed", { description: err.message }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const session = await createTrainTogetherParty();
      const invitees = slots
        .slice(0, partySize - 1)
        .filter(Boolean) as RosterSlot[];
      await Promise.all(
        invitees.map((slot) => inviteToParty(session.id, slot.id)),
      );
      return session.id;
    },
    onSuccess: onCreated,
    onError: (err: Error) =>
      toast("Couldn't create the party", { description: err.message }),
  });

  const filledSlots = slots.slice(0, partySize - 1).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ background: "oklch(0.05 0.005 260 / 0.85)" }}
      data-ocid="train-together.party_panel"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
        className="w-full max-w-[430px] rounded-t-3xl px-5 pt-5 pb-8 max-h-[88dvh] overflow-y-auto"
        style={{
          background: "oklch(0.13 0.01 260)",
          border: "1px solid oklch(0.68 0.25 180 / 0.25)",
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-black text-xl text-foreground">
            Train Together
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground"
            data-ocid="train-together.party_panel_close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground font-body mb-5">
          Choose 2, 3, or 4 — including you
        </p>

        <div className="flex gap-2 mb-5">
          {PARTY_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setPartySize(size)}
              className={cn(
                "flex-1 h-11 rounded-xl text-sm font-display font-bold uppercase tracking-wide transition-smooth border",
                partySize === size
                  ? "bg-primary text-background border-primary"
                  : "bg-card text-muted-foreground border-border/50",
              )}
              data-ocid={`train-together.party_size.${size}`}
            >
              {size}
            </button>
          ))}
        </div>

        <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Party
        </p>
        <div className="flex flex-col gap-2 mb-6">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-card border border-primary/40"
            data-ocid="train-together.roster_self"
          >
            <span className="font-body text-sm text-foreground truncate">
              {myUsername}
            </span>
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-primary ml-auto">
              You
            </span>
          </div>
          {Array.from({ length: partySize - 1 }, (_, i) => i).map((i) => {
            const slot = slots[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setPickerSlot(i)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left border transition-smooth",
                  slot
                    ? "bg-card border-border/50"
                    : "border-dashed border-border/60 text-muted-foreground",
                )}
                data-ocid={`train-together.roster_slot.${i}`}
              >
                <span className="font-body text-sm truncate">
                  {slot ? slot.username : "Add a person"}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          className="w-full h-14 font-display font-black text-base tracking-[0.1em] rounded-2xl uppercase"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          data-ocid="train-together.party_send_invites"
        >
          {createMutation.isPending
            ? "Creating..."
            : filledSlots === 0
              ? "Create party"
              : `Send invite${filledSlots > 1 ? "s" : ""}`}
        </Button>
      </motion.div>

      <AnimatePresence>
        {pickerSlot !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center"
            style={{ background: "oklch(0.05 0.005 260 / 0.9)" }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
              className="w-full max-w-[430px] rounded-t-3xl px-5 pt-5 pb-8 max-h-[70dvh] overflow-y-auto"
              style={{
                background: "oklch(0.15 0.01 260)",
                border: "1px solid oklch(0.68 0.25 180 / 0.25)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-base text-foreground">
                  Add to party
                </h3>
                <button
                  type="button"
                  onClick={() => setPickerSlot(null)}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by username"
                  className="flex-1 h-11 rounded-xl bg-card border border-border/50 px-4 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-smooth"
                  data-ocid="train-together.picker_search"
                />
                <Button
                  className="h-11 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wide shrink-0"
                  disabled={
                    search.trim().length === 0 || searchMutation.isPending
                  }
                  onClick={() => searchMutation.mutate(search.trim())}
                  data-ocid="train-together.picker_search_submit"
                >
                  Find
                </Button>
              </div>

              <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Friends
              </p>
              {friendships.filter((f) => f.status === "accepted").length ===
              0 ? (
                <p className="text-sm text-muted-foreground font-body py-2">
                  No friends yet — search by username above.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {friendships
                    .filter((f) => f.status === "accepted")
                    .map((f) => (
                      <button
                        key={f.friendshipId}
                        type="button"
                        onClick={() => {
                          setSlots((prev) => {
                            const next = [...prev];
                            next[pickerSlot] = {
                              id: f.otherUserId,
                              username: f.otherUsername,
                            };
                            return next;
                          });
                          setPickerSlot(null);
                        }}
                        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-card border border-border/50 text-left"
                        data-ocid="train-together.picker_friend_row"
                      >
                        <span className="font-body text-sm text-foreground truncate">
                          {f.otherUsername}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Pending invites ────────────────────────────────────────────────────

function PendingInvites({ invites }: { invites: PendingPartyInvite[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const respondMutation = useMutation({
    mutationFn: (vars: { sessionId: string; accept: boolean }) =>
      respondToPartyInvite(vars.sessionId, vars.accept),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["train-together-pending-invites"],
      });
      if (vars.accept) {
        navigate({
          to: "/train-together/waiting/$sessionId",
          params: { sessionId: vars.sessionId },
        });
      }
    },
    onError: (err: Error) =>
      toast("Couldn't update invite", { description: err.message }),
  });

  if (invites.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Party invites
      </p>
      <div className="flex flex-col gap-2">
        {invites.map((invite) => (
          <div
            key={invite.sessionId}
            className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-card border border-primary/40"
            data-ocid="train-together.pending_party_invite"
          >
            <span className="font-body text-sm text-foreground truncate">
              {invite.hostUsername} invited you
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  respondMutation.mutate({
                    sessionId: invite.sessionId,
                    accept: true,
                  })
                }
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: "oklch(0.68 0.25 180 / 0.15)",
                  color: "oklch(0.68 0.25 180)",
                }}
                data-ocid="train-together.accept_party_invite"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  respondMutation.mutate({
                    sessionId: invite.sessionId,
                    accept: false,
                  })
                }
                className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/40 text-muted-foreground"
                data-ocid="train-together.decline_party_invite"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Friends & requests ────────────────────────────────────────────────────

function FriendsSection({ friendships }: { friendships: FriendshipEntry[] }) {
  const queryClient = useQueryClient();
  const respondMutation = useMutation({
    mutationFn: (vars: { id: string; accept: boolean }) =>
      respondToFriendRequest(vars.id, vars.accept),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["train-together-friends"] }),
    onError: (err: Error) =>
      toast("Couldn't update request", { description: err.message }),
  });

  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.direction === "incoming",
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.direction === "outgoing",
  );

  if (incoming.length === 0 && outgoing.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {incoming.length > 0 && (
        <div>
          <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Friend requests
          </p>
          <div className="flex flex-col gap-2">
            {incoming.map((f) => (
              <div
                key={f.friendshipId}
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-card border border-border/50"
                data-ocid="train-together.incoming_request"
              >
                <span className="font-body text-sm text-foreground truncate">
                  {f.otherUsername}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      respondMutation.mutate({
                        id: f.friendshipId,
                        accept: true,
                      })
                    }
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: "oklch(0.68 0.25 180 / 0.15)",
                      color: "oklch(0.68 0.25 180)",
                    }}
                    data-ocid="train-together.accept_request"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      respondMutation.mutate({
                        id: f.friendshipId,
                        accept: false,
                      })
                    }
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/40 text-muted-foreground"
                    data-ocid="train-together.decline_request"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Sent
          </p>
          <div className="flex flex-col gap-2">
            {outgoing.map((f) => (
              <div
                key={f.friendshipId}
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-card/50 border border-border/30"
              >
                <span className="font-body text-sm text-muted-foreground truncate">
                  {f.otherUsername}
                </span>
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function TrainTogetherHubPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { effectiveTier, guestMode } = useTier();
  const isEmailAuth = localStorage.getItem("mbw_user") !== null;
  const isRealAccount = isEmailAuth && !guestMode;
  const isSubscriber = effectiveTier === "subscriber";
  const isUnlocked = isRealAccount && isSubscriber;

  const [showPartyPanel, setShowPartyPanel] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [addFriendHandle, setAddFriendHandle] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const myProfileQuery = useQuery({
    queryKey: ["train-together-my-username"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userData.user.id)
        .maybeSingle();
      return data?.username ?? null;
    },
    enabled: isUnlocked,
  });

  const invitesQuery = useQuery({
    queryKey: ["train-together-pending-invites"],
    queryFn: listPendingPartyInvites,
    enabled: isUnlocked,
  });

  const friendsQuery = useQuery({
    queryKey: ["train-together-friends"],
    queryFn: listFriendships,
    enabled: isUnlocked,
  });

  const addFriendMutation = useMutation({
    mutationFn: async (handle: string) => {
      const found = await findProfileByUsername(handle);
      if (!found) throw new Error("No user found with that username.");
      await sendFriendRequest(found.id);
      return found;
    },
    onSuccess: (found) => {
      toast("Friend request sent", { description: found.username });
      setAddFriendHandle("");
      queryClient.invalidateQueries({ queryKey: ["train-together-friends"] });
    },
    onError: (err: Error) =>
      toast("Couldn't send request", { description: err.message }),
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const session = await getSessionByInviteCode(code);
      if (!session) throw new Error("That invite code isn't valid.");
      await joinPartyByCode(session.id);
      return session.id;
    },
    onSuccess: (sessionId) =>
      navigate({
        to: "/train-together/waiting/$sessionId",
        params: { sessionId },
      }),
    onError: (err: Error) =>
      toast("Couldn't join party", { description: err.message }),
  });

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto overflow-x-hidden pb-24 relative">
      <div
        className="pointer-events-none fixed inset-0 max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.2) 0%, transparent 65%)",
        }}
      />

      <header className="relative flex items-center gap-3 px-5 pt-12 pb-3">
        <Logo size="sm" iconOnly className="opacity-70" />
        <div>
          <h1 className="font-display font-black text-xl text-foreground">
            Train Together
          </h1>
          {isUnlocked && (
            <p className="text-[11px] text-muted-foreground font-body">
              Choose 2, 3, or 4 — including you
            </p>
          )}
        </div>
      </header>

      {!isUnlocked ? (
        <TrainTogetherLocked
          needsAccount={!isRealAccount}
          onSubscribe={() => setShowPaywall(true)}
        />
      ) : (
        <div className="relative flex-1 px-5 pt-2 flex flex-col gap-6">
          <Button
            className="w-full h-14 font-display font-black text-base tracking-[0.1em] rounded-2xl uppercase flex items-center justify-center gap-2"
            onClick={() => setShowPartyPanel(true)}
            data-ocid="train-together.start_party"
          >
            <Users className="w-4 h-4" />
            Start a party
          </Button>

          <div>
            <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Have an invite code?
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter code"
                className="flex-1 h-11 rounded-xl bg-card border border-border/50 px-4 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-smooth uppercase"
                data-ocid="train-together.join_code_input"
              />
              <Button
                className="h-11 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wide shrink-0"
                disabled={
                  joinCode.trim().length === 0 || joinMutation.isPending
                }
                onClick={() => joinMutation.mutate(joinCode.trim())}
                data-ocid="train-together.join_code_submit"
              >
                Join
              </Button>
            </div>
          </div>

          {invitesQuery.data && <PendingInvites invites={invitesQuery.data} />}

          <div>
            <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Add a friend
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={addFriendHandle}
                onChange={(e) => setAddFriendHandle(e.target.value)}
                placeholder="Username"
                className="flex-1 h-11 rounded-xl bg-card border border-border/50 px-4 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-smooth"
                data-ocid="train-together.add_friend_input"
              />
              <Button
                className="h-11 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wide shrink-0"
                disabled={
                  addFriendHandle.trim().length === 0 ||
                  addFriendMutation.isPending
                }
                onClick={() => addFriendMutation.mutate(addFriendHandle.trim())}
                data-ocid="train-together.add_friend_submit"
              >
                Add
              </Button>
            </div>
          </div>

          {friendsQuery.data && (
            <FriendsSection friendships={friendsQuery.data} />
          )}
        </div>
      )}

      <BottomNav active="together" />

      <AnimatePresence>
        {showPartyPanel && myProfileQuery.data && (
          <PartySetupPanel
            myUsername={myProfileQuery.data}
            friendships={friendsQuery.data ?? []}
            onClose={() => setShowPartyPanel(false)}
            onCreated={(sessionId) => {
              setShowPartyPanel(false);
              navigate({
                to: "/train-together/waiting/$sessionId",
                params: { sessionId },
              });
            }}
          />
        )}
        {showPaywall && (
          <PaywallModal onDismiss={() => setShowPaywall(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
