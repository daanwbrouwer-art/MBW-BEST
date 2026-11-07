import { scorePalette } from "@/theme/paletteScore";
import {
  type BrandRole,
  DEFAULT_PALETTE,
  PALETTES,
  type PaletteId,
  applyPalette,
  getStoredPalette,
  paletteScopeStyle,
} from "@/theme/palettes";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  Flame,
  RotateCcw,
  Trophy,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { type CSSProperties, useMemo, useState } from "react";
import { toast } from "sonner";

const IDS = Object.keys(PALETTES) as PaletteId[];
const SUITS: { symbol: string; role: BrandRole; label: string }[] = [
  { symbol: "♠", role: "primary", label: "Pull" },
  { symbol: "♥", role: "energy", label: "Push" },
  { symbol: "♦", role: "prestige", label: "Dips" },
  { symbol: "♣", role: "pulse", label: "Rows" },
];

// Blind-test votes stay on this device; "Copy results" is how testers share them.
const VOTES_KEY = "mbw_palette_votes";
type Votes = Record<PaletteId, { wins: number; shown: number }>;

function emptyVotes(): Votes {
  return Object.fromEntries(
    IDS.map((id) => [id, { wins: 0, shown: 0 }]),
  ) as Votes;
}

function loadVotes(): Votes {
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    return raw ? { ...emptyVotes(), ...JSON.parse(raw) } : emptyVotes();
  } catch {
    return emptyVotes();
  }
}

function randomPair(previous?: [PaletteId, PaletteId]): [PaletteId, PaletteId] {
  for (;;) {
    const a = IDS[Math.floor(Math.random() * IDS.length)];
    let b = IDS[Math.floor(Math.random() * IDS.length)];
    while (b === a) b = IDS[Math.floor(Math.random() * IDS.length)];
    const same = previous && new Set([a, b, ...previous]).size === 2;
    if (!same) return [a, b];
  }
}

/** A miniature in-workout screen, rendered entirely from the scoped palette tokens. */
function MiniWorkout({ id }: { id: PaletteId }) {
  return (
    <div
      className="rounded-2xl p-3 flex flex-col gap-3"
      style={{
        ...(paletteScopeStyle(id) as CSSProperties),
        background: "oklch(var(--background))",
        border: "1px solid oklch(var(--border))",
      }}
    >
      <div
        className="rounded-xl p-3 aspect-[3/4] flex flex-col justify-between"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.2 0.04 var(--energy-h)), oklch(var(--background)))",
          border: "1px solid oklch(var(--energy) / 0.45)",
          boxShadow: "0 0 24px oklch(var(--energy) / 0.25)",
        }}
      >
        <span
          className="font-display font-black text-lg leading-none"
          style={{ color: "oklch(var(--energy))" }}
        >
          ♥ 9
        </span>
        <div>
          <p className="font-display font-black text-base text-foreground leading-tight">
            Push-ups
          </p>
          <p
            className="text-xs font-body"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            × 9 reps
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-display font-bold"
          style={{
            background: "oklch(var(--energy) / 0.16)",
            color: "oklch(var(--energy))",
          }}
        >
          <Flame className="w-3 h-3" aria-hidden="true" />7
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-display font-bold"
          style={{
            background: "oklch(var(--prestige) / 0.16)",
            color: "oklch(var(--prestige))",
          }}
        >
          <Trophy className="w-3 h-3" aria-hidden="true" />
          Ace
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-display font-bold"
          style={{
            background: "oklch(var(--pulse) / 0.16)",
            color: "oklch(var(--pulse))",
          }}
        >
          <Users className="w-3 h-3" aria-hidden="true" />3
        </span>
      </div>
      <div
        className="flex justify-between px-1 text-lg font-display font-black"
        aria-hidden="true"
      >
        {SUITS.map((s) => (
          <span key={s.symbol} style={{ color: `oklch(var(--${s.role}))` }}>
            {s.symbol}
          </span>
        ))}
      </div>
      <div
        className="h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm"
        style={{
          background: "oklch(var(--primary))",
          color: "oklch(var(--on-brand))",
        }}
      >
        Next card
      </div>
    </div>
  );
}

export default function PaletteLabPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<PaletteId>(getStoredPalette);
  const [votes, setVotes] = useState<Votes>(loadVotes);
  const [pair, setPair] = useState<[PaletteId, PaletteId]>(() => randomPair());
  const scores = useMemo(
    () => Object.fromEntries(IDS.map((id) => [id, scorePalette(PALETTES[id])])),
    [],
  );

  const choose = (id: PaletteId) => {
    applyPalette(id);
    setActive(id);
  };

  const vote = (winner: PaletteId) => {
    const next = { ...votes };
    for (const id of pair)
      next[id] = { ...next[id], shown: next[id].shown + 1 };
    next[winner] = { ...next[winner], wins: next[winner].wins + 1 };
    setVotes(next);
    localStorage.setItem(VOTES_KEY, JSON.stringify(next));
    setPair(randomPair(pair));
  };

  const totalVotes = IDS.reduce((n, id) => n + votes[id].wins, 0);
  const ranked = [...IDS].sort((a, b) => {
    const rate = (id: PaletteId) =>
      votes[id].shown ? votes[id].wins / votes[id].shown : 0;
    return rate(b) - rate(a) || scores[b].score - scores[a].score;
  });

  const copyResults = async () => {
    const lines = ranked.map((id) => {
      const v = votes[id];
      const rate = v.shown ? Math.round((100 * v.wins) / v.shown) : 0;
      return `${PALETTES[id].name}: ${v.wins}/${v.shown} picks (${rate}%), readability ${scores[id].score}/100`;
    });
    try {
      await navigator.clipboard.writeText(
        `MBW palette test — ${totalVotes} votes\n${lines.join("\n")}`,
      );
      toast("Results copied");
    } catch {
      toast("Couldn't copy — take a screenshot instead");
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto pb-16">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/profile" })}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-card border border-border"
          aria-label="Back to profile"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-display font-black text-2xl text-foreground leading-tight">
            Theme
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            {PALETTES[DEFAULT_PALETTE].name} is the MyBodyWeight look. Prefer
            another? Pick it below.
          </p>
        </div>
      </header>

      <section className="px-5 mb-8" aria-labelledby="palette-pick">
        <h2
          id="palette-pick"
          className="font-display font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3"
        >
          Choose
        </h2>
        <div className="flex flex-col gap-3">
          {IDS.map((id) => {
            const p = PALETTES[id];
            const selected = id === active;
            return (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => choose(id)}
                aria-pressed={selected}
                className="w-full rounded-2xl p-4 text-left flex items-center gap-4"
                style={{
                  ...(paletteScopeStyle(id) as CSSProperties),
                  background: "oklch(var(--card))",
                  border: selected
                    ? "2px solid oklch(var(--primary))"
                    : "1px solid oklch(var(--border))",
                }}
              >
                <div
                  className="grid grid-cols-2 gap-1 shrink-0"
                  aria-hidden="true"
                >
                  {SUITS.map((s) => (
                    <span
                      key={s.role}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
                      style={{
                        background: `oklch(var(--${s.role}))`,
                        color: "oklch(var(--on-brand))",
                      }}
                    >
                      {s.symbol}
                    </span>
                  ))}
                </div>
                {/* The fifth, non-suit highlight accent */}
                <span
                  className="w-2 self-stretch rounded-full shrink-0 -ml-2"
                  style={{ background: "oklch(var(--highlight))" }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-black text-base text-foreground flex items-center gap-2">
                    {p.name}
                    {id === DEFAULT_PALETTE && (
                      <span
                        className="text-xs font-bold rounded-full px-2 py-0.5"
                        style={{
                          background: "oklch(var(--highlight))",
                          color: "oklch(var(--on-brand))",
                        }}
                      >
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground font-body leading-snug">
                    {p.tagline}
                  </p>
                  {/* A tool for choosing the default theme, like the blind
                      test below — dev builds only. */}
                  {import.meta.env.DEV && (
                    <p className="text-xs text-muted-foreground font-body mt-1">
                      Readability {scores[id].score}/100
                    </p>
                  )}
                </div>
                {selected && (
                  <Check
                    className="w-5 h-5 shrink-0"
                    style={{ color: "oklch(var(--primary))" }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Blind A/B test + results are a tool for choosing the default theme,
          not a user feature — only in dev builds. */}
      {import.meta.env.DEV && (
        <>
          <section className="px-5 mb-8" aria-labelledby="palette-blind">
            <h2
              id="palette-blind"
              className="font-display font-bold text-xs uppercase tracking-widest text-muted-foreground mb-1"
            >
              Blind test
            </h2>
            <p className="text-sm text-muted-foreground font-body mb-3">
              Names hidden. Tap the screen you&apos;d rather train with — repeat
              a few rounds.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {pair.map((id, i) => (
                <button
                  key={`${id}-${i}`}
                  type="button"
                  onClick={() => vote(id)}
                  className="text-left rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`Prefer option ${i === 0 ? "A" : "B"}`}
                >
                  <MiniWorkout id={id} />
                  <p className="text-center font-display font-bold text-sm text-foreground mt-2">
                    Option {i === 0 ? "A" : "B"}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="px-5" aria-labelledby="palette-results">
            <div className="flex items-center justify-between mb-3">
              <h2
                id="palette-results"
                className="font-display font-bold text-xs uppercase tracking-widest text-muted-foreground"
              >
                Results · {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyResults}
                  className="h-9 px-3 rounded-full bg-card border border-border text-xs font-display font-bold text-foreground flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVotes(emptyVotes());
                    localStorage.removeItem(VOTES_KEY);
                  }}
                  className="h-9 px-3 rounded-full bg-card border border-border text-xs font-display font-bold text-foreground flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Reset
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border">
              {ranked.map((id) => {
                const v = votes[id];
                const s = scores[id];
                const rate = v.shown ? Math.round((100 * v.wins) / v.shown) : 0;
                return (
                  <div key={id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display font-bold text-sm text-foreground">
                        {PALETTES[id].name}
                      </span>
                      <span className="text-sm font-body text-muted-foreground tabular-nums">
                        {v.shown ? `${rate}% picked` : "not shown yet"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-body tabular-nums">
                      Readability {s.score} · contrast{" "}
                      {s.minContrastOnBg.toFixed(1)}:1 · colour-blind separation{" "}
                      {Math.min(
                        s.separationProtan,
                        s.separationDeutan,
                        s.separationTritan,
                      ).toFixed(0)}
                      {s.inSrgb ? "" : " · some colours clip on phones"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
