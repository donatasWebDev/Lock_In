"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isFuture,
  isSameDay,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, SkipForwardIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { PageHeader } from "@/components/PageHeader";

type Filter = "all" | "locked";
const EASE = [0.23, 1, 0.32, 1] as const;

export default function CalendarPage() {
  const { history, streak, bestStreak, totalDays, today } = useApp();
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [filter, setFilter] = useState<Filter>("all");

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(monthAnchor), end: endOfMonth(monthAnchor) }),
    [monthAnchor]
  );
  const leadingBlanks = (startOfMonth(monthAnchor).getDay() + 6) % 7;
  const entry = history[selected];
  const isCurrentMonth = isSameDay(monthAnchor, startOfMonth(new Date()));
  const todayKey = today.date;

  let heading = "Missed";
  if (entry?.locked) heading = "Locked in";
  else if (selected === todayKey) heading = "Not locked in yet";
  else if (selected > todayKey) heading = "Upcoming";

  return (
    <div className="space-y-6 px-5 pt-8 md:px-10 md:pt-10">
      <PageHeader title="History" subtitle="Every day you showed up, in one view." />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Current", value: streak },
          { label: "Best run", value: bestStreak },
          { label: "Total days", value: totalDays },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-ink-800 bg-ink-900 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-chalk-faint">{s.label}</p>
            <p className="num mt-1 font-display text-2xl font-bold leading-none md:text-3xl">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-6">
        <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-tight">
              {format(monthAnchor, "MMMM yyyy")}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setMonthAnchor((m) => startOfMonth(subDays(m, 1)))}
                className="rounded-lg border border-ink-800 p-2 text-chalk-muted transition-colors duration-150 ease-snap hover:text-chalk"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                disabled={isCurrentMonth}
                onClick={() =>
                  setMonthAnchor((m) => startOfMonth(new Date(m.getFullYear(), m.getMonth() + 1, 1)))
                }
                className="rounded-lg border border-ink-800 p-2 text-chalk-muted transition-colors duration-150 ease-snap hover:text-chalk disabled:opacity-30"
              >
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-4 inline-flex rounded-lg border border-ink-800 bg-ink-850 p-0.5 text-xs font-semibold">
            {(["all", "locked"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 transition-colors duration-150 ease-snap ${
                  filter === f ? "bg-ink-700 text-chalk" : "text-chalk-faint hover:text-chalk"
                }`}
              >
                {f === "all" ? "All days" : "Locked only"}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={`${d}${i}`} className="pb-1 text-[10px] font-semibold text-chalk-faint">
                {d}
              </span>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const locked = history[key]?.locked;
              const future = isFuture(d) && !isSameDay(d, new Date());
              const hidden = filter === "locked" && !locked;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={future}
                  onClick={() => setSelected(key)}
                  className={`num aspect-square rounded-lg text-sm font-semibold transition-colors duration-150 ease-snap ${
                    hidden
                      ? "text-ink-700"
                      : locked
                        ? "bg-accent/15 text-accent hover:bg-accent/25"
                        : "bg-ink-850 text-chalk-faint hover:bg-ink-800"
                  } ${selected === key ? "ring-2 ring-accent" : ""} ${future ? "opacity-30" : ""}`}
                >
                  {format(d, "d")}
                </button>
              );
            })}
          </div>
        </section>

        <motion.section
          key={selected}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="rounded-2xl border border-ink-800 bg-ink-900 p-5"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-chalk-faint">
            {format(parseISO(selected), "EEEE d MMMM")}
          </p>
          <h3 className="mt-1 font-display text-xl font-bold tracking-tight">{heading}</h3>

          {entry?.locked ? (
            <>
              {entry.note && (
                <p className="mt-3 rounded-xl border border-ink-800 bg-ink-850 p-4 text-sm leading-relaxed text-chalk-muted">
                  {entry.note}
                </p>
              )}
              <p className="num mt-3 text-sm font-semibold text-chalk-muted">
                {entry.tasks.filter((t) => t.status === "done").length} completed
                {entry.tasks.some((t) => t.status === "skipped") &&
                  ` · ${entry.tasks.filter((t) => t.status === "skipped").length} skipped`}
              </p>
              {(entry.rules?.length ?? 0) > 0 && (
                <p className="num mt-4 text-sm font-semibold text-chalk-muted">
                  {entry.rules.filter((t) => t.status === "done").length} rules held
                  {entry.rules.some((t) => t.status === "skipped") &&
                    ` · ${entry.rules.filter((t) => t.status === "skipped").length} skipped`}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {entry.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                        t.status === "done"
                          ? "bg-accent text-ink-950"
                          : t.status === "skipped"
                            ? "bg-ink-700 text-chalk-muted"
                            : "border border-ink-600"
                      }`}
                    >
                      {t.status === "done" && (
                        <CheckIcon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                      )}
                      {t.status === "skipped" && (
                        <SkipForwardIcon className="h-2.5 w-2.5" aria-hidden="true" />
                      )}
                    </span>
                    <span
                      className={
                        t.status === "skipped" ? "text-chalk-faint line-through" : "text-chalk"
                      }
                    >
                      {t.title}
                    </span>
                  </li>
                ))}
                {(entry.rules ?? []).map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                        t.status === "done"
                          ? "bg-accent text-ink-950"
                          : t.status === "skipped"
                            ? "bg-ink-700 text-chalk-muted"
                            : "border border-ink-600"
                      }`}
                    >
                      {t.status === "done" && (
                        <CheckIcon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                      )}
                      {t.status === "skipped" && (
                        <SkipForwardIcon className="h-2.5 w-2.5" aria-hidden="true" />
                      )}
                    </span>
                    <span
                      className={
                        t.status === "skipped" ? "text-chalk-faint line-through" : "text-chalk"
                      }
                    >
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-chalk-faint">
              {selected === todayKey
                ? "Finish the list and lock in to keep the chain."
                : "Nothing logged. One gap does not end the run — the next day does the work."}
            </p>
          )}
        </motion.section>
      </div>
    </div>
  );
}
