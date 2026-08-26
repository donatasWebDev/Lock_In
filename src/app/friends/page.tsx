"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CopyIcon, SearchIcon, UserPlusIcon, XIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { FriendDayCard } from "@/components/FriendDayCard";
import { actionError } from "@/lib/authErrors";
import type { Friend, FriendRequest } from "@/lib/types";

const EASE = [0.23, 1, 0.32, 1] as const;

export default function FriendsPage() {
  const {
    friends,
    requests,
    suggested,
    profile,
    resolveRequest,
    sendRequest,
    searchPeople,
  } = useApp();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);
  const [openFriend, setOpenFriend] = useState<Friend | null>(null);
  const [hits, setHits] = useState<FriendRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) => f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q)
    );
  }, [friends, query]);

  const lockedCount = friends.filter((f) => f.lockedToday).length;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      searchPeople(q)
        .then(setHits)
        .catch(() => setHits([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, searchPeople]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(profile.inviteCode);
    } catch {
      // ignore
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function addPerson(input: { userId?: string; username?: string }) {
    try {
      const result = await sendRequest(input);
      setMessage(result);
      if (input.userId) setInvited((v) => [...v, input.userId!]);
    } catch (err) {
      setMessage(actionError(err, "Could not add."));
    }
  }

  return (
    <div className="space-y-5 px-5 pt-8 md:px-10 md:pt-10">
      <PageHeader
        title="Friends"
        subtitle={`${lockedCount} of ${friends.length} locked in today.`}
      />

      {message && <p className="text-sm text-accent">{message}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-chalk-faint"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or @username"
            aria-label="Search friends"
            className="w-full rounded-xl border border-ink-800 bg-ink-900 py-3 pl-10 pr-4 text-sm placeholder:text-chalk-faint focus:border-accent/60 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center justify-center gap-2 rounded-xl border border-ink-800 bg-ink-900 px-4 py-3 text-sm font-semibold text-chalk-muted transition-colors duration-150 ease-snap hover:text-chalk"
        >
          {copied ? (
            <CheckIcon className="h-4 w-4 text-accent" aria-hidden="true" />
          ) : (
            <CopyIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : profile.inviteCode}
        </button>
      </div>

      {hits.length > 0 && (
        <section>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-chalk-muted">
            Search
          </h2>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {hits.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-900 px-4 py-3"
              >
                <Avatar name={p.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-chalk-faint">@{p.username}</span>
                </span>
                <button
                  type="button"
                  onClick={() => addPerson({ userId: p.id })}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-semibold text-chalk-muted transition-colors duration-150 ease-snap hover:border-accent/50 hover:text-accent"
                >
                  <UserPlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {requests.length > 0 && (
        <section>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-chalk-muted">
            Requests · {requests.length}
          </h2>
          <ul className="mt-3 space-y-2">
            <AnimatePresence initial={false}>
              {requests.map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3"
                >
                  <Avatar name={r.name} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.name}</span>
                    <span className="block truncate text-xs text-chalk-faint">
                      @{r.username} · {r.mutuals} mutual
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => resolveRequest(r.id, true)}
                    aria-label={`Accept ${r.name}`}
                    className="rounded-lg bg-accent p-2 text-ink-950 transition-transform duration-150 ease-snap active:scale-95"
                  >
                    <CheckIcon className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveRequest(r.id, false)}
                    aria-label={`Decline ${r.name}`}
                    className="rounded-lg border border-ink-700 p-2 text-chalk-faint transition-colors duration-150 ease-snap hover:text-chalk"
                  >
                    <XIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-chalk-muted">
          Your circle
        </h2>
        {filtered.length > 0 ? (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {filtered.map((f) => {
              const done = f.todayTasks.filter((t) => t.status === "done").length;
              const skipped = f.todayTasks.filter((t) => t.status === "skipped").length;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setOpenFriend(f)}
                    className="flex w-full items-center gap-3 rounded-xl border border-ink-800 bg-ink-900 px-4 py-4 text-left transition-colors duration-150 ease-snap hover:border-ink-700"
                  >
                    <Avatar name={f.name} size="md" ring={f.lockedToday} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{f.name}</span>
                      <span
                        className={`mt-0.5 block text-xs font-medium ${
                          f.lockedToday ? "text-accent" : "text-chalk-faint"
                        }`}
                      >
                        {f.lockedToday ? "Locked in today" : "Not yet today"}
                      </span>
                      <span className="num mt-1 block text-xs text-chalk-faint">
                        {done} completed{skipped > 0 && ` · ${skipped} skipped`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block font-display text-lg font-bold leading-none">
                        {f.streak}
                      </span>
                      <span className="num block text-[10px] uppercase tracking-wider text-chalk-faint">
                        {f.daysThisMonth} this month
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-ink-700 px-4 py-10 text-center text-sm text-chalk-muted">
            {query
              ? `No one matches “${query}”. Share your invite code instead.`
              : "No friends yet. Share your invite code or add someone below."}
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-chalk-muted">
          People you may know
        </h2>
        {suggested.length > 0 ? (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {suggested.map((p) => {
              const sent = invited.includes(p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-900 px-4 py-3"
                >
                  <Avatar name={p.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-chalk-faint">@{p.username}</span>
                  </span>
                  <button
                    type="button"
                    disabled={sent}
                    onClick={() => addPerson({ userId: p.id })}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-semibold text-chalk-muted transition-colors duration-150 ease-snap hover:border-accent/50 hover:text-accent disabled:opacity-50"
                  >
                    <UserPlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {sent ? "Sent" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-chalk-faint">
            Nobody else is here yet. Send your invite code.
          </p>
        )}
      </section>

      <FriendDayCard friend={openFriend} onClose={() => setOpenFriend(null)} />
    </div>
  );
}
