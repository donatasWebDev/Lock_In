"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDaysIcon,
  FlameIcon,
  ListChecksIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";

const TABS = [
  { to: "/", label: "Today", Icon: FlameIcon, end: true },
  { to: "/calendar", label: "Calendar", Icon: CalendarDaysIcon },
  { to: "/leaderboard", label: "Ranks", Icon: TrophyIcon },
  { to: "/friends", label: "Friends", Icon: UsersIcon },
  { to: "/profile", label: "Profile", Icon: UserIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { streak, profile } = useApp();
  const pathname = usePathname();

  return (
    <div className="min-h-full w-full bg-ink-950 font-sans text-chalk">
      <div className="mx-auto flex w-full max-w-6xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-800 px-4 py-6 md:flex">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <FlameIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Lock In</span>
          </div>

          <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
            {TABS.map(({ to, label, Icon, end }) => {
              const active = end ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  href={to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-snap ${
                    active
                      ? "bg-ink-850 text-chalk"
                      : "text-chalk-muted hover:bg-ink-900 hover:text-chalk"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {label === "Ranks" ? "Leaderboard" : label}
                </Link>
              );
            })}
            <Link
              href="/strategies"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-snap ${
                pathname.startsWith("/strategies")
                  ? "bg-ink-850 text-chalk"
                  : "text-chalk-muted hover:bg-ink-900 hover:text-chalk"
              }`}
            >
              <ListChecksIcon className="h-[18px] w-[18px]" aria-hidden="true" />
              Playbook
            </Link>
          </nav>

          <div className="mt-auto rounded-xl border border-ink-800 bg-ink-900 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-chalk-faint">
              Current streak
            </p>
            <p className="num mt-1 font-display text-3xl font-bold leading-none">
              {streak}
              <span className="ml-1 text-sm font-medium text-chalk-muted">days</span>
            </p>
            <p className="mt-3 truncate text-xs text-chalk-faint">@{profile.username}</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-10">{children}</main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-ink-950/95 backdrop-blur md:hidden"
      >
        <ul className="mx-auto flex max-w-md">
          {TABS.map(({ to, label, Icon, end }) => {
            const active = end ? pathname === to : pathname.startsWith(to);
            return (
              <li key={to} className="flex-1">
                <Link
                  href={to}
                  className="relative flex flex-col items-center gap-1 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3"
                >
                  {active && (
                    <motion.span
                      layoutId="tab-indicator"
                      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                      className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent"
                    />
                  )}
                  <Icon
                    className={`h-5 w-5 transition-colors duration-150 ease-snap ${
                      active ? "text-accent" : "text-chalk-faint"
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      active ? "text-chalk" : "text-chalk-faint"
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
