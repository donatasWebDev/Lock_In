"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { EXTRA_STARTERS, RULE_STARTERS } from "@/lib/constants";
import type { Strategy } from "@/lib/types";

const EASE = [0.23, 1, 0.32, 1] as const;

type Kind = "play" | "rule";

export default function StrategiesPage() {
  const {
    strategies,
    playbookRules,
    toggleStrategy,
    addStrategy,
    updateStrategy,
    removeStrategy,
    addRule,
    updateRule,
    removeRule,
    togglePlaybookRule,
  } = useApp();
  const [composing, setComposing] = useState<Kind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const activePlays = strategies.filter((s) => s.active).length;
  const activeRules = playbookRules.filter((s) => s.active).length;

  function startCreate(kind: Kind) {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setComposing(kind);
  }

  function startEdit(kind: Kind, item: Strategy) {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setComposing(kind);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !composing) return;
    if (composing === "play") {
      if (editingId) await updateStrategy(editingId, title.trim(), description.trim());
      else await addStrategy(title.trim(), description.trim());
    } else {
      if (editingId) await updateRule(editingId, title.trim(), description.trim());
      else await addRule(title.trim(), description.trim());
    }
    setComposing(null);
  }

  return (
    <div className="space-y-8 px-5 pt-8 md:px-10 md:pt-10">
      <PageHeader
        title="Playbook"
        subtitle={`${activePlays} plays drive your generated list. ${activeRules} rules sit on Today every day.`}
      />

      <AnimatePresence initial={false}>
        {composing && (
          <motion.form
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: EASE }}
            onSubmit={submit}
            className="rounded-2xl border border-ink-700 bg-ink-900 p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold tracking-tight">
                {editingId ? "Edit" : "New"} {composing === "play" ? "play" : "rule"}
              </h2>
              <button
                type="button"
                onClick={() => setComposing(null)}
                aria-label="Cancel"
                className="text-chalk-faint transition-colors duration-150 ease-snap hover:text-chalk"
              >
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                composing === "play" ? "Title — e.g. Morning deep work" : "Title — e.g. No alcohol"
              }
              className="mt-4 w-full rounded-xl border border-ink-800 bg-ink-850 px-4 py-3 text-sm font-semibold placeholder:text-chalk-faint focus:border-accent/60 focus:outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={
                composing === "play"
                  ? "What does following it actually look like?"
                  : "What does holding it today look like?"
              }
              className="mt-2 w-full resize-none rounded-xl border border-ink-800 bg-ink-850 px-4 py-3 text-sm placeholder:text-chalk-faint focus:border-accent/60 focus:outline-none"
            />
            <button
              type="submit"
              className="mt-3 w-full rounded-xl bg-accent py-3 font-display font-bold text-ink-950 transition-transform duration-150 ease-snap hover:brightness-110 active:scale-[0.99]"
            >
              {editingId ? "Save changes" : composing === "play" ? "Add play" : "Add rule"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <Catalog
        heading="Plays"
        hint="These shape the generated tasks. Active ones rotate into your daily count."
        items={strategies}
        onNew={() => startCreate("play")}
        onToggle={toggleStrategy}
        onEdit={(item) => startEdit("play", item)}
        onRemove={removeStrategy}
        newLabel="New play"
      />

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-chalk-muted">
          Play starters
        </h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {EXTRA_STARTERS.filter((st) => !strategies.some((s) => s.title === st.title)).map(
            (st) => (
              <li key={st.title}>
                <button
                  type="button"
                  onClick={() => addStrategy(st.title, st.description)}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-ink-700 px-4 py-3 text-left transition-colors duration-150 ease-snap hover:border-accent/50"
                >
                  <PlusIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{st.title}</span>
                    <span className="block truncate text-xs text-chalk-faint">{st.description}</span>
                  </span>
                </button>
              </li>
            )
          )}
        </ul>
      </section>

      <Catalog
        heading="Rules"
        hint="Every-day lines. They show on Today. They don’t count as completed tasks."
        items={playbookRules}
        onNew={() => startCreate("rule")}
        onToggle={togglePlaybookRule}
        onEdit={(item) => startEdit("rule", item)}
        onRemove={removeRule}
        newLabel="New rule"
      />

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-chalk-muted">
          Rule starters
        </h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {RULE_STARTERS.filter((st) => !playbookRules.some((s) => s.title === st.title)).map(
            (st) => (
              <li key={st.title}>
                <button
                  type="button"
                  onClick={() => addRule(st.title, st.description)}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-ink-700 px-4 py-3 text-left transition-colors duration-150 ease-snap hover:border-accent/50"
                >
                  <PlusIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{st.title}</span>
                    <span className="block truncate text-xs text-chalk-faint">{st.description}</span>
                  </span>
                </button>
              </li>
            )
          )}
        </ul>
      </section>
    </div>
  );
}

function Catalog({
  heading,
  hint,
  items,
  onNew,
  onToggle,
  onEdit,
  onRemove,
  newLabel,
}: {
  heading: string;
  hint: string;
  items: Strategy[];
  onNew: () => void;
  onToggle: (id: string) => void;
  onEdit: (item: Strategy) => void;
  onRemove: (id: string) => Promise<void>;
  newLabel: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">{heading}</h2>
          <p className="mt-1 text-sm text-chalk-muted">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-accent px-3.5 py-2.5 text-sm font-bold text-ink-950 transition-transform duration-150 ease-snap hover:brightness-110 active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {newLabel}
        </button>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {items.map((s) => (
            <motion.li
              key={s.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: EASE }}
              className={`flex flex-col rounded-2xl border bg-ink-900 p-5 ${
                s.active ? "border-ink-700" : "border-ink-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3
                  className={`font-display text-base font-bold tracking-tight ${
                    s.active ? "text-chalk" : "text-chalk-faint"
                  }`}
                >
                  {s.title}
                </h3>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.active}
                  aria-label={`${s.active ? "Pause" : "Activate"} ${s.title}`}
                  onClick={() => onToggle(s.id)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ease-snap ${
                    s.active ? "bg-accent" : "bg-ink-700"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ink-950 transition-transform duration-150 ease-snap ${
                      s.active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-chalk-muted">{s.description}</p>
              <div className="mt-auto flex items-center gap-1 pt-4">
                <button
                  type="button"
                  onClick={() => onEdit(s)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-chalk-muted transition-colors duration-150 ease-snap hover:bg-ink-850 hover:text-chalk"
                >
                  <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(s.id)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-chalk-faint transition-colors duration-150 ease-snap hover:bg-ink-850 hover:text-red-400"
                >
                  <Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
