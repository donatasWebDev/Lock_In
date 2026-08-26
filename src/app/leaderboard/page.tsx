"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { useApp } from "@/contexts/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { api } from "../../../convex/_generated/api";
import { todayKey } from "@/lib/dates";

type Range = "week" | "month" | "all";
type Scope = "global" | "friends";

const RANGES: { id: Range; label: string; metric: string }[] = [
  { id: "week", label: "This week", metric: "days this week" },
  { id: "month", label: "This month", metric: "days this month" },
  { id: "all", label: "All time", metric: "days locked" },
];

const EASE = [0.23, 1, 0.32, 1] as const;

export default function LeaderboardPage() {
  const { profile } = useApp();
  const [range, setRange] = useState<Range>("week");
  const [scope, setScope] = useState<Scope>("global");
  const rows = useQuery(api.leaderboard.get, {
    date: todayKey(),
    range,
    scope,
  });
  const loading = rows === undefined;

  const you = rows?.find((r) => r.isYou);
  const yourRank = you && rows ? rows.indexOf(you) + 1 : null;
  const metricLabel = RANGES.find((r) => r.id === range)!.metric;

  return (
    <div className="space-y-5 px-5 pt-8 md:px-10 md:pt-10">
      <PageHeader
        title="Leaderboard"
        subtitle={
          yourRank && rows
            ? `You're #${yourRank} of ${rows.length} on ${metricLabel}.`
            : "Lock in to enter the ranking."
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-ink-800 bg-ink-900 p-0.5 text-xs font-semibold">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-md px-3 py-2 transition-colors duration-150 ease-snap ${
                range === r.id ? "bg-ink-750 text-chalk" : "text-chalk-faint hover:text-chalk"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-ink-800 bg-ink-900 p-0.5 text-xs font-semibold">
          {(["global", "friends"] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`rounded-md px-3 py-2 capitalize transition-colors duration-150 ease-snap ${
                scope === s ? "bg-ink-750 text-chalk" : "text-chalk-faint hover:text-chalk"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-chalk-faint">Loading ranks…</p>}

      <ol className="space-y-2">
        {(rows ?? []).map((r, i) => {
          const rank = i + 1;
          const isYou = Boolean(r.isYou);
          return (
            <motion.li
              key={`${range}-${scope}-${r.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: EASE, delay: Math.min(i * 0.03, 0.18) }}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 ${
                isYou ? "border-accent/60 bg-accent/[0.07]" : "border-ink-800 bg-ink-900"
              }`}
            >
              <span
                className={`num w-6 shrink-0 text-center font-display text-lg font-bold ${
                  rank <= 3 ? "text-accent" : "text-chalk-faint"
                }`}
              >
                {rank}
              </span>
              <Avatar name={isYou ? profile.name : r.name} size="md" ring={rank === 1} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {isYou ? "You" : r.name}
                </span>
                <span className="num block truncate text-xs text-chalk-faint">
                  {r.streak}d streak · {r.tasks} tasks
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="num block font-display text-xl font-bold leading-none">{r.days}</span>
                <span className="block text-[10px] uppercase tracking-wider text-chalk-faint">
                  days
                </span>
              </span>
            </motion.li>
          );
        })}
      </ol>

      {!loading && rows && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-700 px-4 py-10 text-center text-sm text-chalk-muted">
          No one here yet. Add a few friends and the board fills up fast.
        </p>
      )}
    </div>
  );
}
