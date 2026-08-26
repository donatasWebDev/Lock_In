"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  LockIcon,
  LoaderCircleIcon,
  SparklesIcon,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { TaskItem } from "@/components/TaskItem";
import { Avatar } from "@/components/Avatar";
import { FriendDayCard } from "@/components/FriendDayCard";
import { GENERATE_DAILY_LIMIT } from "@/lib/constants";
import { greeting } from "@/lib/time";
import type { Friend } from "@/lib/types";

const IS_DEV = process.env.NODE_ENV === "development";

const EASE = [0.23, 1, 0.32, 1] as const;

export default function TodayPage() {
  const {
    today,
    streak,
    weekCount,
    monthCount,
    strategies,
    friends,
    generating,
    lockIn,
    unlockDay,
    setNote,
    generateTasks,
    toggleTask,
    skipTask,
    toggleRule,
    skipRule,
    profile,
    unlimitedGenerate,
  } = useApp();

  const [openFriend, setOpenFriend] = useState<Friend | null>(null);

  const locked = today.locked;
  const activeStrategies = strategies.filter((s) => s.active);
  const lockedFriends = friends.filter((f) => f.lockedToday);
  const total = today.tasks.length;
  const doneToday = today.tasks.filter((t) => t.status === "done").length;
  const skippedToday = today.tasks.filter((t) => t.status === "skipped").length;
  const pendingToday = today.tasks.filter((t) => t.status === "pending").length;
  const handled = doneToday + skippedToday;
  const goal = profile.dailyTaskGoal;
  const dayRules = today.rules ?? [];
  const pendingRules = dayRules.filter((r) => r.status === "pending").length;
  const heldRules = dayRules.filter((r) => r.status === "done").length;
  const brokeRules = dayRules.filter((r) => r.status === "skipped").length;
  const canLockIn =
    total >= goal && pendingToday === 0 && pendingRules === 0 && !locked;
  const generateUnlimited = unlimitedGenerate || IS_DEV;
  const generateUsed = today.generateCount ?? 0;
  const generatesLeft = Math.max(0, GENERATE_DAILY_LIMIT - generateUsed);
  const canGenerate = generateUnlimited || generateUsed < GENERATE_DAILY_LIMIT;

  return (
    <div className="px-5 pt-8 md:px-10 md:pt-10">
      <header className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-chalk-faint">
            {format(new Date(), "EEEE d MMMM")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {greeting()}, {profile.name.split(" ")[0]}
          </h1>
          <span
            className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              locked ? "bg-accent/15 text-accent" : "bg-ink-800 text-chalk-muted"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${locked ? "bg-accent" : "bg-chalk-faint"}`} />
            {locked ? "Locked in today" : "Not locked in yet"}
          </span>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-chalk-faint">Streak</p>
          <p className="num font-display text-6xl font-extrabold leading-none tracking-tight md:text-7xl">
            {streak}
          </p>
          <p className="mt-1 text-xs text-chalk-muted">days in a row</p>
        </div>
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-6">
        <div className="space-y-4">
          <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5 shadow-lift md:p-6">
            <AnimatePresence mode="wait" initial={false}>
              {locked ? (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: EASE }}
                >
                  <div className="flex items-center gap-3">
                    <motion.span
                      initial={{ scale: 0.96, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.22, ease: EASE }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent"
                    >
                      <CheckCircle2Icon className="h-6 w-6" aria-hidden="true" />
                    </motion.span>
                    <div>
                      <h2 className="font-display text-xl font-bold tracking-tight">
                        Day {streak} locked
                      </h2>
                      <p className="num text-sm text-chalk-muted">
                        {doneToday} completed
                        {skippedToday > 0 && ` · ${skippedToday} skipped`}
                        {today.lockedAt &&
                          ` · logged at ${format(new Date(today.lockedAt), "h:mm a")}`}
                      </p>
                    </div>
                  </div>

                  <label
                    htmlFor="day-note"
                    className="mt-5 block text-xs font-medium uppercase tracking-wider text-chalk-faint"
                  >
                    Note for today
                  </label>
                  <textarea
                    id="day-note"
                    rows={3}
                    value={today.note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What are you actually doing today?"
                    className="mt-2 w-full resize-none rounded-xl border border-ink-800 bg-ink-850 px-4 py-3 text-sm text-chalk placeholder:text-chalk-faint focus:border-accent/60 focus:outline-none"
                  />
                  {IS_DEV && (
                    <button
                      type="button"
                      onClick={unlockDay}
                      className="mt-4 w-full rounded-xl border border-ink-700 py-3 text-sm font-semibold text-chalk-muted transition-colors duration-150 ease-snap hover:border-ink-600 hover:text-chalk"
                    >
                      Unlock (testing)
                    </button>
                  )}
                </motion.div>
              ) : total === 0 ? (
                <motion.div
                  key="no-tasks"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <h2 className="font-display text-xl font-bold tracking-tight">
                    Set today&apos;s {goal} tasks
                  </h2>
                  <p className="mt-1 text-sm text-chalk-muted">
                    Clear or skip every one of them, then the day can be locked in.
                    {generateUnlimited
                      ? " Dev: unlimited generates."
                      : ` ${generatesLeft}/${GENERATE_DAILY_LIMIT} generates left today.`}
                  </p>
                  <button
                    type="button"
                    onClick={generateTasks}
                    disabled={generating || !canGenerate}
                    className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent px-6 py-5 font-display text-lg font-bold tracking-tight text-ink-950 transition-transform duration-150 ease-snap hover:brightness-110 active:scale-[0.985] disabled:opacity-70"
                  >
                    {generating ? (
                      <LoaderCircleIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <SparklesIcon className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                    )}
                    {generating
                      ? "Building your list…"
                      : canGenerate
                        ? "Generate Today's Tasks"
                        : "No generates left today"}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="unlocked"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="font-display text-xl font-bold tracking-tight">
                      {canLockIn ? "Day cleared" : "Finish the list"}
                    </h2>
                    <span className="num text-sm font-semibold text-chalk-muted">
                      {handled}/{total}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-chalk-muted">
                    {canLockIn
                      ? `${doneToday} completed${skippedToday > 0 ? `, ${skippedToday} skipped` : ""}. Lock it in.`
                      : pendingRules > 0 && pendingToday === 0
                        ? `${pendingRules} rule${pendingRules === 1 ? "" : "s"} still open.`
                        : `${pendingToday} left. Complete them, or skip what the day won't allow.`}
                  </p>

                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={handled}
                    aria-label="Tasks handled today"
                    className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-800"
                  >
                    <motion.div
                      className="h-full rounded-full bg-accent"
                      initial={false}
                      animate={{ width: `${(handled / total) * 100}%` }}
                      transition={{ duration: 0.28, ease: EASE }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={lockIn}
                    disabled={!canLockIn}
                    className={`mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-5 font-display text-lg font-bold tracking-tight transition-transform duration-150 ease-snap ${
                      canLockIn
                        ? "bg-accent text-ink-950 hover:brightness-110 active:scale-[0.985]"
                        : "cursor-not-allowed border border-ink-700 bg-ink-850 text-chalk-faint"
                    }`}
                  >
                    <LockIcon className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                    Lock In Today
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Today&apos;s tasks</h2>
                <p className="num text-sm text-chalk-muted">
                  {total > 0
                    ? `${doneToday} completed · ${skippedToday} skipped · ${pendingToday} left`
                    : `Daily goal: ${goal} tasks, from your main goals`}
                  {total > 0 &&
                    !locked &&
                    (generateUnlimited
                      ? " · unlimited generates"
                      : ` · ${generatesLeft}/${GENERATE_DAILY_LIMIT} generates left`)}
                </p>
              </div>
              {total > 0 && !locked && (
                <button
                  type="button"
                  onClick={generateTasks}
                  disabled={generating || !canGenerate}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-sm font-semibold text-chalk transition-colors duration-150 ease-snap hover:border-accent/50 hover:text-accent disabled:opacity-60"
                >
                  {generating ? (
                    <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  {canGenerate ? "Regenerate" : "3/3 used"}
                </button>
              )}
            </div>

            {total > 0 ? (
              <ul className="mt-4 space-y-2">
                {today.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    locked={locked}
                    onToggle={toggleTask}
                    onSkip={skipTask}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-6 rounded-xl border border-dashed border-ink-700 px-4 py-8 text-center text-sm text-chalk-muted">
                {generating
                  ? "Reading your goals…"
                  : "No tasks yet — generate the list above to open up today."}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Rules</h2>
                <p className="num text-sm text-chalk-muted">
                  {dayRules.length > 0
                    ? `${heldRules} held · ${brokeRules} skipped · ${pendingRules} open`
                    : "Daily lines you tap every day. They don’t count as tasks."}
                </p>
              </div>
              <Link href="/strategies" className="text-xs font-semibold text-accent hover:underline">
                Manage
              </Link>
            </div>
            {dayRules.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {dayRules.map((rule) => (
                  <TaskItem
                    key={rule.id}
                    task={{
                      id: rule.id,
                      title: rule.title,
                      detail: "Held today, or skip if you broke it.",
                      minutes: 0,
                      status: rule.status,
                    }}
                    locked={locked}
                    onToggle={toggleRule}
                    onSkip={skipRule}
                    skipLabel="Broke"
                    skippedDetail="Broke it today"
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-6 rounded-xl border border-dashed border-ink-700 px-4 py-8 text-center text-sm text-chalk-muted">
                Add no alcohol, no smoking, no social — in Playbook. They show up here every day.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-ink-800 bg-ink-900 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-chalk-faint">
                This week
              </p>
              <p className="num mt-1 font-display text-3xl font-bold leading-none">
                {weekCount}
                <span className="text-base font-medium text-chalk-faint">/7</span>
              </p>
            </div>
            <div className="rounded-xl border border-ink-800 bg-ink-900 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-chalk-faint">
                This month
              </p>
              <p className="num mt-1 font-display text-3xl font-bold leading-none">{monthCount}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-chalk-muted">
                Active strategies
              </h2>
              <Link href="/strategies" className="text-xs font-semibold text-accent hover:underline">
                Manage
              </Link>
            </div>
            {activeStrategies.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {activeStrategies.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-full border border-ink-700 bg-ink-850 px-3 py-1.5 text-xs font-medium text-chalk-muted"
                  >
                    {s.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-chalk-faint">
                Nothing active. Turn one on to shape your daily tasks.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-chalk-muted">
                Locked in today
              </h2>
              <Link href="/friends" className="text-xs font-semibold text-accent hover:underline">
                <span className="flex items-center gap-1">
                  Friends <ArrowRightIcon className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
            </div>
            {lockedFriends.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {lockedFriends.slice(0, 3).map((f) => {
                  const d = f.todayTasks.filter((t) => t.status === "done").length;
                  const s = f.todayTasks.filter((t) => t.status === "skipped").length;
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => setOpenFriend(f)}
                        className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left transition-colors duration-150 ease-snap hover:bg-ink-850"
                      >
                        <Avatar name={f.name} size="sm" ring />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{f.name}</span>
                          <span className="num block truncate text-xs text-chalk-faint">
                            {d} completed{s > 0 && ` · ${s} skipped`}
                          </span>
                        </span>
                        <span className="num shrink-0 text-xs font-semibold text-accent">
                          {f.streak}d
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-chalk-faint">
                Nobody yet today. Be the one who sets the pace.
              </p>
            )}
          </section>
        </div>
      </div>

      <FriendDayCard friend={openFriend} onClose={() => setOpenFriend(null)} />
    </div>
  );
}
