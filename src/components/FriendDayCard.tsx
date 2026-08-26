"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, SkipForwardIcon, XIcon } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Friend } from "@/lib/types";

const EASE = [0.23, 1, 0.32, 1] as const;

interface FriendDayCardProps {
  friend: Friend | null;
  onClose: () => void;
}

export function FriendDayCard({ friend, onClose }: FriendDayCardProps) {
  return (
    <AnimatePresence>
      {friend && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${friend.name}'s day`}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.24, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl border border-ink-700 bg-ink-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
          >
            <div className="flex items-start gap-3">
              <Avatar name={friend.name} size="md" ring={friend.lockedToday} />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold tracking-tight">{friend.name}</h2>
                <p className="text-xs text-chalk-faint">@{friend.username}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-chalk-faint transition-colors duration-150 ease-snap hover:text-chalk"
              >
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Streak", value: friend.streak },
                {
                  label: "Completed",
                  value: friend.todayTasks.filter((t) => t.status === "done").length,
                },
                {
                  label: "Skipped",
                  value: friend.todayTasks.filter((t) => t.status === "skipped").length,
                },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-ink-800 bg-ink-850 py-3">
                  <p className="num font-display text-xl font-bold leading-none">{s.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-chalk-faint">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <h3 className="mt-5 text-xs font-medium uppercase tracking-wider text-chalk-faint">
              Their tasks today
            </h3>
            {friend.todayTasks.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {friend.todayTasks.map((t) => (
                  <li
                    key={t.title}
                    className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-850 px-4 py-3"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                        t.status === "done"
                          ? "bg-accent text-ink-950"
                          : t.status === "skipped"
                            ? "bg-ink-700 text-chalk-muted"
                            : "border border-ink-600"
                      }`}
                    >
                      {t.status === "done" && (
                        <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                      )}
                      {t.status === "skipped" && (
                        <SkipForwardIcon className="h-3 w-3" aria-hidden="true" />
                      )}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm font-medium ${
                        t.status === "done"
                          ? "text-chalk"
                          : t.status === "skipped"
                            ? "text-chalk-faint line-through"
                            : "text-chalk-muted"
                      }`}
                    >
                      {t.title}
                    </span>
                    {t.status === "pending" && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-chalk-faint">
                        Open
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-chalk-faint">No list yet today.</p>
            )}

            {friend.todayRules && friend.todayRules.length > 0 && (
              <>
                <h3 className="mt-5 text-xs font-medium uppercase tracking-wider text-chalk-faint">
                  Their rules today
                </h3>
                <ul className="mt-2 space-y-2">
                  {friend.todayRules.map((t) => (
                    <li
                      key={t.title}
                      className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-850 px-4 py-3"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                          t.status === "done"
                            ? "bg-accent text-ink-950"
                            : t.status === "skipped"
                              ? "bg-ink-700 text-chalk-muted"
                              : "border border-ink-600"
                        }`}
                      >
                        {t.status === "done" && (
                          <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                        )}
                        {t.status === "skipped" && (
                          <SkipForwardIcon className="h-3 w-3" aria-hidden="true" />
                        )}
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-sm font-medium ${
                          t.status === "skipped" ? "text-chalk-faint line-through" : "text-chalk"
                        }`}
                      >
                        {t.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {friend.lastNote && (
              <p className="mt-4 rounded-xl border border-ink-800 px-4 py-3 text-sm leading-relaxed text-chalk-muted">
                “{friend.lastNote}”
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
