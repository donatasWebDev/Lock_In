"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronRightIcon,
  DownloadIcon,
  ListChecksIcon,
  LogOutIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { usePwaInstall } from "@/components/PwaInstall";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import type { EnergyLevel } from "@/lib/types";

const ENERGY: { id: EnergyLevel; label: string; hint: string }[] = [
  { id: "low", label: "Low", hint: "Short, protect the chain" },
  { id: "steady", label: "Steady", hint: "Normal working day" },
  { id: "high", label: "High", hint: "Push the volume up" },
];

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-chalk-faint">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ease-snap ${
          checked ? "bg-accent" : "bg-ink-700"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ink-950 transition-transform duration-150 ease-snap ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, updateProfile, streak, totalDays, strategies, playbookRules, logout } =
    useApp();
  const pwa = usePwaInstall();
  const [iosHint, setIosHint] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingName) setNameDraft(profile.name);
  }, [editingName, profile.name]);

  useEffect(() => {
    if (editingName) nameInput.current?.focus();
  }, [editingName]);

  function saveName() {
    const next = nameDraft.trim().slice(0, 60);
    if (next.length >= 2 && next !== profile.name) updateProfile({ name: next });
    else setNameDraft(profile.name);
    setEditingName(false);
  }

  function cancelName() {
    setNameDraft(profile.name);
    setEditingName(false);
  }

  function requestNotify() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  }

  return (
    <div className="space-y-5 px-5 pt-8 md:px-10 md:pt-10">
      <PageHeader title="Profile" />

      <section className="flex items-center gap-4 rounded-2xl border border-ink-800 bg-ink-900 p-5">
        <Avatar name={profile.name} size="lg" ring />
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                ref={nameInput}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") cancelName();
                }}
                aria-label="Display name"
                maxLength={60}
                className="min-w-0 flex-1 rounded-lg border border-accent/50 bg-ink-850 px-2 py-1 font-display text-xl font-bold tracking-tight focus:outline-none"
              />
              <button
                type="button"
                onClick={saveName}
                aria-label="Save name"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-accent transition-colors duration-150 ease-snap hover:bg-ink-850"
              >
                <CheckIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={cancelName}
                aria-label="Cancel name edit"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-chalk-faint transition-colors duration-150 ease-snap hover:bg-ink-850 hover:text-chalk"
              >
                <XIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <h2 className="min-w-0 truncate font-display text-xl font-bold tracking-tight">
                {profile.name}
              </h2>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                aria-label="Edit name"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-chalk-faint transition-colors duration-150 ease-snap hover:bg-ink-850 hover:text-accent"
              >
                <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
          <p className="truncate text-sm text-chalk-muted" title="Login username — this doesn’t change">
            @{profile.username}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num font-display text-2xl font-bold leading-none">{streak}</p>
          <p className="num text-[10px] uppercase tracking-wider text-chalk-faint">
            {totalDays} total
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
        <label htmlFor="goals" className="text-xs font-medium uppercase tracking-wider text-chalk-faint">
          Main goals
        </label>
        <textarea
          id="goals"
          rows={3}
          value={profile.goals}
          onChange={(e) => updateProfile({ goals: e.target.value })}
          className="mt-2 w-full resize-none rounded-xl border border-ink-800 bg-ink-850 px-4 py-3 text-sm leading-relaxed focus:border-accent/60 focus:outline-none"
        />
      </section>

      <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-chalk-faint">
          Daily task goal
        </h2>
        <p className="mt-1 text-sm text-chalk-muted">
          How many tasks you have to clear or skip before the day can be locked in.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            aria-label="Fewer daily tasks"
            disabled={profile.dailyTaskGoal <= 1}
            onClick={() => updateProfile({ dailyTaskGoal: profile.dailyTaskGoal - 1 })}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-700 bg-ink-850 text-chalk transition-colors duration-150 ease-snap hover:border-ink-600 disabled:opacity-30"
          >
            <MinusIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <p className="num min-w-[2.5rem] text-center font-display text-4xl font-extrabold leading-none">
            {profile.dailyTaskGoal}
          </p>
          <button
            type="button"
            aria-label="More daily tasks"
            disabled={profile.dailyTaskGoal >= 8}
            onClick={() => updateProfile({ dailyTaskGoal: profile.dailyTaskGoal + 1 })}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-700 bg-ink-850 text-chalk transition-colors duration-150 ease-snap hover:border-ink-600 disabled:opacity-30"
          >
            <PlusIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <p className="text-xs leading-snug text-chalk-faint">
            tasks per day
            <br />
            (1–8)
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-chalk-faint">
          Default energy
        </h2>
        <p className="mt-1 text-sm text-chalk-muted">Sets how heavy your generated tasks are.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {ENERGY.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => updateProfile({ energy: e.id })}
              aria-pressed={profile.energy === e.id}
              className={`rounded-xl border px-3 py-3 text-left transition-colors duration-150 ease-snap ${
                profile.energy === e.id
                  ? "border-accent/60 bg-accent/10"
                  : "border-ink-800 bg-ink-850 hover:border-ink-700"
              }`}
            >
              <span className="block text-sm font-bold">{e.label}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-chalk-faint">
                {e.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      <Link
        href="/strategies"
        className="flex items-center gap-3 rounded-2xl border border-ink-800 bg-ink-900 px-5 py-4 transition-colors duration-150 ease-snap hover:border-ink-700"
      >
        <ListChecksIcon className="h-5 w-5 text-accent" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Playbook</span>
          <span className="block text-xs text-chalk-faint">
            {strategies.filter((s) => s.active).length} plays ·{" "}
            {playbookRules.filter((s) => s.active).length} rules
          </span>
        </span>
        <ChevronRightIcon className="h-4 w-4 text-chalk-faint" aria-hidden="true" />
      </Link>

      <section className="rounded-2xl border border-ink-800 bg-ink-900 px-5 py-1">
        <div className="divide-y divide-ink-800">
          <ToggleRow
            label="Evening reminder"
            hint="Nudge at 8pm if you have not locked in"
            checked={profile.notifyEvening}
            onChange={(v) => {
              updateProfile({ notifyEvening: v });
              if (v) requestNotify();
            }}
          />
          <ToggleRow
            label="Streak at risk"
            hint="One last warning before midnight"
            checked={profile.notifyStreakRisk}
            onChange={(v) => {
              updateProfile({ notifyStreakRisk: v });
              if (v) requestNotify();
            }}
          />
          <ToggleRow
            label="Friend activity"
            hint="When someone in your circle locks in"
            checked={profile.notifyFriends}
            onChange={(v) => updateProfile({ notifyFriends: v })}
          />
          <ToggleRow
            label="Show rules to friends"
            hint="They see no alcohol / no smoking on your day. Off hides rules, not lock-in."
            checked={profile.showRulesToFriends}
            onChange={(v) => updateProfile({ showRulesToFriends: v })}
          />
          <ToggleRow
            label="Dark theme"
            hint="Light mode is coming later"
            checked={profile.theme === "dark"}
            onChange={(v) => updateProfile({ theme: v ? "dark" : "light" })}
          />
        </div>
      </section>

      <div className="space-y-2">
        {pwa.installed ? (
          <p className="rounded-2xl border border-ink-800 py-4 text-center text-sm font-semibold text-chalk-muted">
            Installed on this device
          </p>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (pwa.canPrompt) void pwa.install();
              else setIosHint(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-ink-800 py-4 text-sm font-semibold text-chalk-muted transition-colors duration-150 ease-snap hover:border-accent/50 hover:text-accent"
          >
            <DownloadIcon className="h-4 w-4" aria-hidden="true" />
            Download app
          </button>
        )}
        {iosHint && !pwa.installed && (
          <p className="rounded-xl border border-ink-800 bg-ink-900 px-4 py-3 text-sm leading-relaxed text-chalk-muted">
            {pwa.ios
              ? "On iPhone: tap Share, then Add to Home Screen."
              : "If the install prompt doesn’t show, use the browser menu → Install app / Add to Home Screen. Chrome or Edge on Android works best."}
          </p>
        )}
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-ink-800 py-4 text-sm font-semibold text-chalk-muted transition-colors duration-150 ease-snap hover:border-red-500/40 hover:text-red-400"
        >
          <LogOutIcon className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  );
}
