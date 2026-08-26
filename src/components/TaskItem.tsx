"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckIcon, ChevronDownIcon, SkipForwardIcon, UndoIcon } from "lucide-react";
import type { Task } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  locked?: boolean;
  onToggle: (id: string) => void;
  onSkip: (id: string) => void;
  skipLabel?: string;
  skippedDetail?: string;
}

export function TaskItem({
  task,
  locked = false,
  onToggle,
  onSkip,
  skipLabel = "Skip",
  skippedDetail = "Skipped today",
}: TaskItemProps) {
  const [open, setOpen] = useState(false);
  const done = task.status === "done";
  const skipped = task.status === "skipped";
  const note = task.detail.trim();
  const expandable = note.length > 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      className={`flex w-full min-w-0 items-start gap-2.5 rounded-xl border px-3 py-3 transition-colors duration-150 ease-snap sm:gap-3 sm:px-4 sm:py-3.5 ${
        skipped ? "border-ink-800 bg-ink-900" : "border-ink-800 bg-ink-850"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        disabled={skipped || locked}
        aria-pressed={done}
        aria-label={`Mark ${task.title} ${done ? "not done" : "done"}`}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150 ease-snap ${
          done
            ? "border-accent bg-accent text-ink-950"
            : "border-ink-600 text-transparent hover:border-chalk-faint disabled:opacity-40"
        }`}
      >
        <motion.span
          initial={false}
          animate={{ scale: done ? 1 : 0.6, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
        >
          <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        </motion.span>
      </button>

      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        aria-expanded={expandable ? open : undefined}
        className="min-w-0 flex-1 overflow-hidden text-left"
      >
        <span className="flex items-start gap-1.5">
          <span
            className={`min-w-0 flex-1 text-sm font-semibold [overflow-wrap:anywhere] transition-colors duration-150 ease-snap ${
              done ? "text-chalk-faint line-through" : skipped ? "text-chalk-faint" : "text-chalk"
            }`}
          >
            {task.title}
          </span>
          {expandable && (
            <ChevronDownIcon
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-chalk-faint transition-transform duration-150 ease-snap ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          )}
        </span>
        {skipped && (
          <span className="mt-0.5 block text-xs text-chalk-faint">{skippedDetail}</span>
        )}
        {note && (
          <span
            className={`mt-0.5 block text-xs leading-relaxed text-chalk-faint ${
              open ? "whitespace-pre-wrap [overflow-wrap:anywhere]" : "line-clamp-2"
            }`}
          >
            {note}
          </span>
        )}
      </button>

      {!done && !locked && (
        <button
          type="button"
          onClick={() => onSkip(task.id)}
          aria-label={skipped ? "Undo skip" : skipLabel}
          className={`mt-0.5 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors duration-150 ease-snap sm:gap-1.5 sm:px-2.5 ${
            skipped
              ? "bg-ink-800 text-chalk-muted hover:text-chalk"
              : "text-chalk-faint hover:bg-ink-800 hover:text-chalk"
          }`}
        >
          {skipped ? (
            <>
              <UndoIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Undo</span>
            </>
          ) : (
            <>
              <SkipForwardIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{skipLabel}</span>
            </>
          )}
        </button>
      )}

      {done && task.minutes > 0 && (
        <span className="num mt-1 shrink-0 text-xs font-medium text-chalk-faint">
          {task.minutes}m
        </span>
      )}
    </motion.li>
  );
}
