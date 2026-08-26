"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Toast } from "@/components/Toast";
import { actionError } from "@/lib/authErrors";
import { todayKey } from "@/lib/dates";
import type {
  AppSnapshot,
  FriendRequest,
  Strategy,
  TaskStatus,
  UserProfile,
} from "@/lib/types";

interface AppState extends AppSnapshot {
  generating: boolean;
  error: string | null;
  ready: boolean;
  lockIn: () => Promise<void>;
  unlockDay: () => Promise<void>;
  setNote: (note: string) => void;
  generateTasks: () => Promise<void>;
  toggleTask: (id: string) => void;
  skipTask: (id: string) => void;
  toggleRule: (id: string) => void;
  skipRule: (id: string) => void;
  toggleStrategy: (id: string) => void;
  addStrategy: (title: string, description: string) => Promise<void>;
  updateStrategy: (id: string, title: string, description: string) => Promise<void>;
  removeStrategy: (id: string) => Promise<void>;
  addRule: (title: string, description: string) => Promise<void>;
  updateRule: (id: string, title: string, description: string) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
  togglePlaybookRule: (id: string) => void;
  resolveRequest: (id: string, accept: boolean) => Promise<void>;
  sendRequest: (input: {
    userId?: string;
    username?: string;
    inviteCode?: string;
  }) => Promise<string>;
  searchPeople: (q: string) => Promise<FriendRequest[]>;
  updateProfile: (patch: Partial<UserProfile>) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AppCtx = createContext<AppState | null>(null);
const PUBLIC = new Set(["/login", "/signup"]);

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const convex = useConvex();
  const date = todayKey();
  const isPublic = PUBLIC.has(pathname);

  const authed = isAuthenticated && !isLoading;
  const snap = useQuery(api.snapshot.get, authed ? { date } : "skip");
  const friends = useQuery(api.friends.list, authed ? { date } : "skip");
  const requests = useQuery(api.friends.requests, authed ? {} : "skip");
  const suggested = useQuery(api.friends.suggested, authed ? {} : "skip");

  const lockMut = useMutation(api.days.lock);
  const unlockMut = useMutation(api.days.unlock);
  const noteMut = useMutation(api.days.setNote);
  const taskMut = useMutation(api.days.setTaskStatus);
  const addStrat = useMutation(api.strategies.add);
  const updStrat = useMutation(api.strategies.update);
  const delStrat = useMutation(api.strategies.remove);
  const resolveMut = useMutation(api.friends.resolveRequest);
  const sendMut = useMutation(api.friends.sendRequest);
  const profileMut = useMutation(api.users.updateProfile);
  const generateAct = useAction(api.generate.today);
  const ruleStatusMut = useMutation(api.days.setRuleStatus);
  const syncRulesMut = useMutation(api.days.syncRules);
  const addRuleMut = useMutation(api.rules.add);
  const updRuleMut = useMutation(api.rules.update);
  const delRuleMut = useMutation(api.rules.remove);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localNote, setLocalNote] = useState<string | null>(null);
  const [profileOverlay, setProfileOverlay] = useState<Partial<UserProfile>>({});
  const noteTimer = useRef<number | null>(null);
  const profileTimer = useRef<number | null>(null);
  const pendingProfile = useRef<Partial<UserProfile>>({});
  const errorTimer = useRef<number | null>(null);

  const flash = useCallback((message: string) => {
    setError(message);
    if (errorTimer.current) window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setError(null), 4200);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isPublic) router.replace("/login");
    if (isAuthenticated && isPublic) router.replace("/");
  }, [isAuthenticated, isLoading, isPublic, router]);

  useEffect(() => {
    if (!authed || isPublic || !snap) return;
    syncRulesMut({ date }).catch(() => undefined);
  }, [authed, date, isPublic, snap, syncRulesMut]);

  useEffect(() => {
    if (!snap || isPublic) return;
    if (!snap.profile.notifyEvening || snap.today.locked) return;
    const hour = new Date().getHours();
    if (hour < 20) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const key = `lockin-evening-${snap.today.date}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    new Notification("Lock In", { body: "You have not locked in yet." });
  }, [snap, isPublic]);

  const lockIn = useCallback(async () => {
    setError(null);
    try {
      await lockMut({ date });
    } catch (err) {
      flash(actionError(err, "Could not lock in."));
    }
  }, [date, flash, lockMut]);

  const unlockDay = useCallback(async () => {
    setError(null);
    try {
      await unlockMut({ date });
    } catch (err) {
      flash(actionError(err, "Could not unlock."));
    }
  }, [date, flash, unlockMut]);

  const setNote = useCallback(
    (note: string) => {
      setLocalNote(note);
      if (noteTimer.current) window.clearTimeout(noteTimer.current);
      noteTimer.current = window.setTimeout(() => {
        noteMut({ date, note }).catch((err: Error) =>
          flash(actionError(err, "Could not save note."))
        );
      }, 400);
    },
    [date, flash, noteMut]
  );

  const generateTasks = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = (await generateAct({ date })) as
        | {
            source?: string;
            debug?: { send?: unknown; get?: unknown };
          }
        | null
        | undefined;
      if (process.env.NODE_ENV === "development") {
        console.log("[generate] send", result?.debug?.send ?? "(no debug — Convex env not in dev)");
        console.log("[generate] get", result?.debug?.get ?? result);
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[generate] threw", err);
      }
      flash(actionError(err, "Could not generate tasks."));
    } finally {
      setGenerating(false);
    }
  }, [date, flash, generateAct]);

  const setTaskStatus = useCallback(
    (id: string, status: TaskStatus) => {
      taskMut({ date, taskId: id, status }).catch((err: Error) =>
        flash(actionError(err, "Could not update task."))
      );
    },
    [date, flash, taskMut]
  );

  const toggleTask = useCallback(
    (id: string) => {
      const task = snap?.today.tasks.find((t) => t.id === id);
      if (!task || snap?.today.locked) return;
      setTaskStatus(id, task.status === "done" ? "pending" : "done");
    },
    [setTaskStatus, snap]
  );

  const setRuleStatus = useCallback(
    (id: string, status: TaskStatus) => {
      ruleStatusMut({ date, ruleId: id, status }).catch((err: Error) =>
        flash(actionError(err, "Could not update rule."))
      );
    },
    [date, flash, ruleStatusMut]
  );

  const toggleRule = useCallback(
    (id: string) => {
      const rule = snap?.today.rules.find((r) => r.id === id);
      if (!rule || snap?.today.locked) return;
      setRuleStatus(id, rule.status === "done" ? "pending" : "done");
    },
    [setRuleStatus, snap]
  );

  const skipRule = useCallback(
    (id: string) => {
      const rule = snap?.today.rules.find((r) => r.id === id);
      if (!rule || snap?.today.locked) return;
      setRuleStatus(id, rule.status === "skipped" ? "pending" : "skipped");
    },
    [setRuleStatus, snap]
  );

  const skipTask = useCallback(
    (id: string) => {
      const task = snap?.today.tasks.find((t) => t.id === id);
      if (!task || snap?.today.locked) return;
      setTaskStatus(id, task.status === "skipped" ? "pending" : "skipped");
    },
    [setTaskStatus, snap]
  );

  const toggleStrategy = useCallback(
    (id: string) => {
      const current = snap?.strategies.find((s) => s.id === id);
      if (!current) return;
      updStrat({
        id: id as Id<"strategies">,
        active: !current.active,
      }).catch((err: Error) => flash(actionError(err, "Could not update strategy.")));
    },
    [flash, snap, updStrat]
  );

  const addStrategy = useCallback(
    async (title: string, description: string) => {
      try {
        await addStrat({ title, description });
      } catch (err) {
        flash(actionError(err, "Could not add strategy."));
        throw err;
      }
    },
    [addStrat, flash]
  );

  const updateStrategy = useCallback(
    async (id: string, title: string, description: string) => {
      try {
        await updStrat({ id: id as Id<"strategies">, title, description });
      } catch (err) {
        flash(actionError(err, "Could not save strategy."));
        throw err;
      }
    },
    [flash, updStrat]
  );

  const removeStrategy = useCallback(
    async (id: string) => {
      try {
        await delStrat({ id: id as Id<"strategies"> });
      } catch (err) {
        flash(actionError(err, "Could not delete strategy."));
        throw err;
      }
    },
    [delStrat, flash]
  );

  const addRule = useCallback(
    async (title: string, description: string) => {
      try {
        await addRuleMut({ title, description, date });
      } catch (err) {
        flash(actionError(err, "Could not add rule."));
        throw err;
      }
    },
    [addRuleMut, date, flash]
  );

  const updateRule = useCallback(
    async (id: string, title: string, description: string) => {
      try {
        await updRuleMut({ id: id as Id<"rules">, title, description, date });
      } catch (err) {
        flash(actionError(err, "Could not save rule."));
        throw err;
      }
    },
    [date, flash, updRuleMut]
  );

  const removeRule = useCallback(
    async (id: string) => {
      try {
        await delRuleMut({ id: id as Id<"rules">, date });
      } catch (err) {
        flash(actionError(err, "Could not delete rule."));
        throw err;
      }
    },
    [date, delRuleMut, flash]
  );

  const togglePlaybookRule = useCallback(
    (id: string) => {
      const current = snap?.playbookRules.find((r) => r.id === id);
      if (!current) return;
      updRuleMut({
        id: id as Id<"rules">,
        active: !current.active,
        date,
      }).catch((err: Error) => flash(actionError(err, "Could not update rule.")));
    },
    [date, flash, snap, updRuleMut]
  );

  const resolveRequest = useCallback(
    async (id: string, accept: boolean) => {
      try {
        await resolveMut({ id: id as Id<"friendships">, accept });
      } catch (err) {
        flash(actionError(err, "Could not update request."));
        throw err;
      }
    },
    [flash, resolveMut]
  );

  const sendRequest = useCallback(
    async (input: { userId?: string; username?: string; inviteCode?: string }) => {
      const res = await sendMut({
        userId: input.userId as Id<"users"> | undefined,
        username: input.username,
        inviteCode: input.inviteCode,
      });
      return res.accepted ? "You are now friends." : "Request sent.";
    },
    [sendMut]
  );

  const searchPeople = useCallback(
    async (q: string) => {
      return await convex.query(api.friends.search, { q });
    },
    [convex]
  );

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      pendingProfile.current = { ...pendingProfile.current, ...patch };
      setProfileOverlay((cur) => ({ ...cur, ...patch }));
      if (profileTimer.current) window.clearTimeout(profileTimer.current);
      profileTimer.current = window.setTimeout(() => {
        const body = pendingProfile.current;
        pendingProfile.current = {};
        profileMut({
          name: body.name,
          username: body.username,
          goals: body.goals,
          energy: body.energy,
          dailyTaskGoal: body.dailyTaskGoal,
          theme: body.theme,
          notifyEvening: body.notifyEvening,
          notifyStreakRisk: body.notifyStreakRisk,
          notifyFriends: body.notifyFriends,
          showRulesToFriends: body.showRulesToFriends,
        }).catch((err: Error) => flash(actionError(err, "Could not save profile.")));
      }, 350);
    },
    [flash, profileMut]
  );

  const logout = useCallback(async () => {
    await signOut();
    router.push("/login");
  }, [router, signOut]);

  const refresh = useCallback(async () => {
    /* live queries refresh themselves */
  }, []);

  const data: AppSnapshot | null =
    snap && friends && requests && suggested
      ? {
          ...snap,
          profile: { ...snap.profile, ...profileOverlay },
          today: {
            ...snap.today,
            note: localNote ?? snap.today.note,
            rules: snap.today.rules ?? [],
            generateCount: snap.today.generateCount ?? 0,
          },
          unlimitedGenerate: snap.unlimitedGenerate ?? false,
          strategies: snap.strategies as Strategy[],
          playbookRules: snap.playbookRules as Strategy[],
          friends,
          requests,
          suggested,
        }
      : null;

  const value = useMemo<AppState | null>(() => {
    if (!data) return null;
    return {
      ...data,
      generating,
      error,
      ready: true,
      lockIn,
      unlockDay,
      setNote,
      generateTasks,
      toggleTask,
      skipTask,
      toggleRule,
      skipRule,
      toggleStrategy,
      addStrategy,
      updateStrategy,
      removeStrategy,
      addRule,
      updateRule,
      removeRule,
      togglePlaybookRule,
      resolveRequest,
      sendRequest,
      searchPeople,
      updateProfile,
      logout,
      refresh,
    };
  }, [
    data,
    generating,
    error,
    lockIn,
    unlockDay,
    setNote,
    generateTasks,
    toggleTask,
    skipTask,
    toggleRule,
    skipRule,
    toggleStrategy,
    addStrategy,
    updateStrategy,
    removeStrategy,
    addRule,
    updateRule,
    removeRule,
    togglePlaybookRule,
    resolveRequest,
    sendRequest,
    searchPeople,
    updateProfile,
    logout,
    refresh,
  ]);

  if (isPublic) return <>{children}</>;
  if (authed && snap === null) {
    return (
      <div className="flex min-h-full items-center justify-center bg-ink-950 px-6 text-chalk">
        <p className="max-w-sm text-center text-sm text-chalk-muted">
          Signed in on the client, but Convex didn&apos;t accept the session. JWT_PRIVATE_KEY and
          JWKS must be a matching pair on this deployment (no quotes).
        </p>
      </div>
    );
  }
  if (isLoading || !isAuthenticated || !value) {
    return (
      <div className="flex min-h-full items-center justify-center bg-ink-950 text-chalk">
        <p className="text-sm text-chalk-muted">{error ?? "Loading…"}</p>
      </div>
    );
  }

  return (
    <AppCtx.Provider value={value}>
      {children}
      <Toast message={error} onClose={() => setError(null)} />
    </AppCtx.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
