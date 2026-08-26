import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { compareSync, hashSync } from "bcryptjs";
import { isSameMonth, parseISO } from "date-fns";
import { STARTER_STRATEGIES } from "@/lib/constants";
import { addDaysKey, startOfCalendarMonth } from "@/lib/dates";
import type {
  AppSnapshot,
  DayEntry,
  EnergyLevel,
  Friend,
  FriendRequest,
  LeaderRow,
  Strategy,
  Task,
  TaskDraft,
  TaskStatus,
  UserProfile,
} from "@/lib/types";

export type UserRow = {
  id: string;
  email: string;
  username: string;
  name: string;
  password_hash: string;
  goals: string;
  energy: EnergyLevel;
  daily_task_goal: number;
  theme: "dark" | "light";
  notify_evening: number;
  notify_streak_risk: number;
  notify_friends: number;
  invite_code: string;
  created_at: string;
};

type DayRow = {
  id: string;
  user_id: string;
  date: string;
  locked: number;
  locked_at: string | null;
  note: string;
};

type TaskRow = {
  id: string;
  day_id: string;
  title: string;
  detail: string;
  minutes: number;
  status: TaskStatus;
  sort_order: number;
};

type StrategyRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  active: number;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
};

type GlobalDb = { __lockinDb?: DatabaseSync };

function dbPath() {
  return path.join(process.cwd(), "data", "lockin.db");
}

function getDb(): DatabaseSync {
  const g = globalThis as GlobalDb;
  if (g.__lockinDb) return g.__lockinDb;
  fs.mkdirSync(path.dirname(dbPath()), { recursive: true });
  const db = new DatabaseSync(dbPath(), {
    timeout: 5000,
    enableForeignKeyConstraints: true,
  });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      goals TEXT NOT NULL DEFAULT '',
      energy TEXT NOT NULL DEFAULT 'steady',
      daily_task_goal INTEGER NOT NULL DEFAULT 3,
      theme TEXT NOT NULL DEFAULT 'dark',
      notify_evening INTEGER NOT NULL DEFAULT 1,
      notify_streak_risk INTEGER NOT NULL DEFAULT 1,
      notify_friends INTEGER NOT NULL DEFAULT 0,
      invite_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS days (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      locked_at TEXT,
      note TEXT NOT NULL DEFAULT '',
      UNIQUE(user_id, date)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      day_id TEXT NOT NULL REFERENCES days(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      minutes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      UNIQUE(requester_id, addressee_id)
    );
    CREATE INDEX IF NOT EXISTS idx_days_user_date ON days(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_days_locked ON days(locked, date);
    CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks(day_id);
    CREATE INDEX IF NOT EXISTS idx_strategies_user ON strategies(user_id);
    CREATE INDEX IF NOT EXISTS idx_friends_req ON friendships(requester_id, status);
    CREATE INDEX IF NOT EXISTS idx_friends_add ON friendships(addressee_id, status);
  `);
  g.__lockinDb = db;
  return db;
}

function all<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

function get<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

function run(sql: string, ...params: SQLInputValue[]) {
  return getDb().prepare(sql).run(...params);
}

function id() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "LOCKIN-";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function toProfile(user: UserRow): UserProfile {
  return {
    name: user.name,
    username: user.username,
    email: user.email,
    goals: user.goals,
    energy: user.energy,
    dailyTaskGoal: user.daily_task_goal,
    theme: user.theme,
    notifyEvening: Boolean(user.notify_evening),
    notifyStreakRisk: Boolean(user.notify_streak_risk),
    notifyFriends: Boolean(user.notify_friends),
    inviteCode: user.invite_code,
    showRulesToFriends: true,
  };
}

function toStrategy(row: StrategyRow): Strategy {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    active: Boolean(row.active),
  };
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    minutes: row.minutes,
    status: row.status,
  };
}

function toDay(row: DayRow, tasks: Task[]): DayEntry {
  return {
    date: row.date,
    locked: Boolean(row.locked),
    lockedAt: row.locked_at,
    note: row.note,
    tasks,
    rules: [],
    generateCount: 0,
  };
}

function emptyDay(date: string): DayEntry {
  return {
    date,
    locked: false,
    lockedAt: null,
    note: "",
    tasks: [],
    rules: [],
    generateCount: 0,
  };
}

export function getUserById(userId: string) {
  return get<UserRow>("SELECT * FROM users WHERE id = ?", userId);
}

export function getUserByEmail(email: string) {
  return get<UserRow>("SELECT * FROM users WHERE email = ?", email.trim());
}

export function getUserByUsername(username: string) {
  return get<UserRow>("SELECT * FROM users WHERE username = ?", username.trim());
}

export function getUserByInviteCode(code: string) {
  return get<UserRow>(
    "SELECT * FROM users WHERE invite_code = ?",
    code.trim().toUpperCase()
  );
}

export function createUser(input: {
  name: string;
  username: string;
  email: string;
  password: string;
}) {
  const userId = id();
  let code = inviteCode();
  while (getUserByInviteCode(code)) code = inviteCode();
  run(
    `INSERT INTO users (
      id, email, username, name, password_hash, goals, energy, daily_task_goal,
      theme, notify_evening, notify_streak_risk, notify_friends, invite_code, created_at
    ) VALUES (?, ?, ?, ?, ?, '', 'steady', 3, 'dark', 1, 1, 0, ?, ?)`,
    userId,
    input.email.trim(),
    input.username.trim(),
    input.name.trim(),
    hashSync(input.password, 10),
    code,
    nowIso()
  );
  const created = nowIso();
  for (const strategy of STARTER_STRATEGIES) {
    run(
      `INSERT INTO strategies (id, user_id, title, description, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id(),
      userId,
      strategy.title,
      strategy.description,
      strategy.active ? 1 : 0,
      created
    );
  }
  return getUserById(userId)!;
}

export function verifyPassword(user: UserRow, password: string) {
  return compareSync(password, user.password_hash);
}

export function listStrategies(userId: string): Strategy[] {
  return all<StrategyRow>(
    "SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at ASC",
    userId
  ).map(toStrategy);
}

function getDayRow(userId: string, date: string) {
  return get<DayRow>(
    "SELECT * FROM days WHERE user_id = ? AND date = ?",
    userId,
    date
  );
}

function listTasks(dayId: string): Task[] {
  return all<TaskRow>(
    "SELECT * FROM tasks WHERE day_id = ? ORDER BY sort_order ASC",
    dayId
  ).map(toTask);
}

function ensureDay(userId: string, date: string): DayRow {
  const existing = getDayRow(userId, date);
  if (existing) return existing;
  const dayId = id();
  run(
    `INSERT INTO days (id, user_id, date, locked, locked_at, note)
     VALUES (?, ?, ?, 0, NULL, '')`,
    dayId,
    userId,
    date
  );
  return getDayRow(userId, date)!;
}

function dayEntryFor(userId: string, date: string): DayEntry {
  const row = getDayRow(userId, date);
  if (!row) return emptyDay(date);
  return toDay(row, listTasks(row.id));
}

export function getHistory(userId: string): Record<string, DayEntry> {
  const days = all<DayRow>(
    "SELECT * FROM days WHERE user_id = ? ORDER BY date ASC",
    userId
  );
  const history: Record<string, DayEntry> = {};
  for (const day of days) {
    history[day.date] = toDay(day, listTasks(day.id));
  }
  return history;
}

export function lockedDates(userId: string): string[] {
  return all<{ date: string }>(
    "SELECT date FROM days WHERE user_id = ? AND locked = 1 ORDER BY date ASC",
    userId
  ).map((row) => row.date);
}

export function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : addDaysKey(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return n;
}

export function computeBestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === addDaysKey(sorted[i - 1], 1)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

function weekCount(dates: string[], today: string) {
  const start = addDaysKey(today, -6);
  return dates.filter((d) => d >= start && d <= today).length;
}

function monthCount(dates: string[], today: string) {
  const anchor = parseISO(today);
  return dates.filter((d) => isSameMonth(parseISO(d), anchor)).length;
}

export function replaceTasks(userId: string, date: string, drafts: TaskDraft[]) {
  const day = ensureDay(userId, date);
  if (day.locked) throw new Error("Today is already locked in.");
  run("DELETE FROM tasks WHERE day_id = ?", day.id);
  drafts.forEach((draft, index) => {
    run(
      `INSERT INTO tasks (id, day_id, title, detail, minutes, status, sort_order)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      id(),
      day.id,
      draft.title,
      draft.detail,
      draft.minutes,
      index
    );
  });
  return dayEntryFor(userId, date);
}

export function setTaskStatus(
  userId: string,
  taskId: string,
  status: TaskStatus,
  today: string
) {
  const task = get<TaskRow & { user_id: string; date: string; locked: number }>(
    `SELECT t.*, d.user_id, d.date, d.locked
     FROM tasks t JOIN days d ON d.id = t.day_id
     WHERE t.id = ?`,
    taskId
  );
  if (!task || task.user_id !== userId) throw new Error("Task not found.");
  if (task.date !== today) throw new Error("You can only update today's tasks.");
  if (task.locked) throw new Error("Today is already locked in.");
  run("UPDATE tasks SET status = ? WHERE id = ?", status, taskId);
  return dayEntryFor(userId, today);
}

export function setNote(userId: string, date: string, note: string) {
  const day = ensureDay(userId, date);
  run("UPDATE days SET note = ? WHERE id = ?", note, day.id);
  return dayEntryFor(userId, date);
}

export function lockDay(userId: string, date: string, goal: number) {
  const day = dayEntryFor(userId, date);
  if (day.locked) throw new Error("Already locked in.");
  if (day.tasks.length < goal) {
    throw new Error(`Generate ${goal} tasks before locking in.`);
  }
  if (day.tasks.some((task) => task.status === "pending")) {
    throw new Error("Clear or skip every task first.");
  }
  const row = ensureDay(userId, date);
  run(
    "UPDATE days SET locked = 1, locked_at = ? WHERE id = ?",
    nowIso(),
    row.id
  );
  return dayEntryFor(userId, date);
}

export function addStrategy(
  userId: string,
  title: string,
  description: string
): Strategy {
  const strategyId = id();
  run(
    `INSERT INTO strategies (id, user_id, title, description, active, created_at)
     VALUES (?, ?, ?, ?, 1, ?)`,
    strategyId,
    userId,
    title,
    description,
    nowIso()
  );
  return toStrategy(get<StrategyRow>("SELECT * FROM strategies WHERE id = ?", strategyId)!);
}

export function updateStrategy(
  userId: string,
  strategyId: string,
  patch: Partial<{ title: string; description: string; active: boolean }>
): Strategy {
  const row = get<StrategyRow>(
    "SELECT * FROM strategies WHERE id = ? AND user_id = ?",
    strategyId,
    userId
  );
  if (!row) throw new Error("Strategy not found.");
  const title = patch.title ?? row.title;
  const description = patch.description ?? row.description;
  const active = patch.active === undefined ? row.active : patch.active ? 1 : 0;
  run(
    "UPDATE strategies SET title = ?, description = ?, active = ? WHERE id = ?",
    title,
    description,
    active,
    strategyId
  );
  return toStrategy(get<StrategyRow>("SELECT * FROM strategies WHERE id = ?", strategyId)!);
}

export function removeStrategy(userId: string, strategyId: string) {
  const result = run(
    "DELETE FROM strategies WHERE id = ? AND user_id = ?",
    strategyId,
    userId
  );
  if (!result.changes) throw new Error("Strategy not found.");
}

export function updateProfile(
  userId: string,
  patch: Partial<{
    name: string;
    username: string;
    goals: string;
    energy: EnergyLevel;
    dailyTaskGoal: number;
    theme: "dark" | "light";
    notifyEvening: boolean;
    notifyStreakRisk: boolean;
    notifyFriends: boolean;
  }>
): UserRow {
  const user = getUserById(userId);
  if (!user) throw new Error("Account not found.");
  if (patch.username && patch.username.toLowerCase() !== user.username.toLowerCase()) {
    const taken = getUserByUsername(patch.username);
    if (taken) throw new Error("That username is taken.");
  }
  run(
    `UPDATE users SET
      name = ?, username = ?, goals = ?, energy = ?, daily_task_goal = ?,
      theme = ?, notify_evening = ?, notify_streak_risk = ?, notify_friends = ?
     WHERE id = ?`,
    patch.name ?? user.name,
    patch.username ?? user.username,
    patch.goals ?? user.goals,
    patch.energy ?? user.energy,
    patch.dailyTaskGoal ?? user.daily_task_goal,
    patch.theme ?? user.theme,
    patch.notifyEvening === undefined ? user.notify_evening : patch.notifyEvening ? 1 : 0,
    patch.notifyStreakRisk === undefined
      ? user.notify_streak_risk
      : patch.notifyStreakRisk
        ? 1
        : 0,
    patch.notifyFriends === undefined ? user.notify_friends : patch.notifyFriends ? 1 : 0,
    userId
  );
  return getUserById(userId)!;
}

function friendIds(userId: string): string[] {
  return all<{ id: string }>(
    `SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS id
     FROM friendships
     WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`,
    userId,
    userId,
    userId
  ).map((row) => row.id);
}

function mutualCount(userId: string, otherId: string) {
  const mine = new Set(friendIds(userId));
  return friendIds(otherId).filter((idValue) => mine.has(idValue)).length;
}

function friendCard(user: UserRow, today: string): Friend {
  const dates = lockedDates(user.id);
  const day = dayEntryFor(user.id, today);
  const lastNote =
    all<{ note: string }>(
      `SELECT note FROM days
       WHERE user_id = ? AND locked = 1 AND note != ''
       ORDER BY date DESC LIMIT 1`,
      user.id
    )[0]?.note ?? "";
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    streak: computeStreak(dates, today),
    lockedToday: day.locked,
    daysThisMonth: monthCount(dates, today),
    lastNote,
    todayTasks: day.tasks.map((task) => ({ title: task.title, status: task.status })),
    todayRules: [],
    showRules: true,
  };
}

export function listFriends(userId: string, today: string): Friend[] {
  const ids = friendIds(userId);
  return ids
    .map((friendId) => getUserById(friendId))
    .filter((user): user is UserRow => Boolean(user))
    .map((user) => friendCard(user, today))
    .sort((a, b) => Number(b.lockedToday) - Number(a.lockedToday) || b.streak - a.streak);
}

export function listRequests(userId: string): FriendRequest[] {
  const rows = all<FriendshipRow & { name: string; username: string }>(
    `SELECT f.*, u.name, u.username
     FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id = ? AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    userId
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    mutuals: mutualCount(userId, row.requester_id),
  }));
}

export function listSuggested(userId: string): FriendRequest[] {
  const blocked = new Set([userId, ...friendIds(userId)]);
  all<{ requester_id: string; addressee_id: string }>(
    `SELECT requester_id, addressee_id FROM friendships
     WHERE requester_id = ? OR addressee_id = ?`,
    userId,
    userId
  ).forEach((row) => {
    blocked.add(row.requester_id);
    blocked.add(row.addressee_id);
  });
  const users = all<UserRow>(
    "SELECT * FROM users ORDER BY created_at DESC LIMIT 40"
  ).filter((user) => !blocked.has(user.id));
  return users.slice(0, 6).map((user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    mutuals: mutualCount(userId, user.id),
  }));
}

export function searchPeople(userId: string, query: string) {
  const q = `%${query.trim()}%`;
  return all<UserRow>(
    `SELECT * FROM users
     WHERE id != ? AND (username LIKE ? OR name LIKE ? OR invite_code LIKE ?)
     ORDER BY username ASC LIMIT 8`,
    userId,
    q,
    q,
    q
  ).map((user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    mutuals: mutualCount(userId, user.id),
  }));
}

function existingFriendship(a: string, b: string) {
  return get<FriendshipRow>(
    `SELECT * FROM friendships
     WHERE (requester_id = ? AND addressee_id = ?)
        OR (requester_id = ? AND addressee_id = ?)`,
    a,
    b,
    b,
    a
  );
}

export function sendFriendRequest(userId: string, target: UserRow) {
  if (target.id === userId) throw new Error("You cannot add yourself.");
  const existing = existingFriendship(userId, target.id);
  if (existing?.status === "accepted") throw new Error("Already friends.");
  if (existing?.requester_id === userId && existing.status === "pending") {
    throw new Error("Request already sent.");
  }
  if (existing?.addressee_id === userId && existing.status === "pending") {
    run("UPDATE friendships SET status = 'accepted' WHERE id = ?", existing.id);
    return { accepted: true };
  }
  run(
    `INSERT INTO friendships (id, requester_id, addressee_id, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`,
    id(),
    userId,
    target.id,
    nowIso()
  );
  return { accepted: false };
}

export function resolveRequest(userId: string, requestId: string, accept: boolean) {
  const row = get<FriendshipRow>(
    "SELECT * FROM friendships WHERE id = ? AND addressee_id = ? AND status = 'pending'",
    requestId,
    userId
  );
  if (!row) throw new Error("Request not found.");
  if (accept) {
    run("UPDATE friendships SET status = 'accepted' WHERE id = ?", requestId);
  } else {
    run("DELETE FROM friendships WHERE id = ?", requestId);
  }
}

export function leaderboard(
  viewerId: string,
  today: string,
  range: "week" | "month" | "all",
  scope: "global" | "friends"
): LeaderRow[] {
  const start =
    range === "week"
      ? addDaysKey(today, -6)
      : range === "month"
        ? startOfCalendarMonth(today)
        : "0000-01-01";
  const allowed =
    scope === "friends" ? new Set([viewerId, ...friendIds(viewerId)]) : null;
  const dayRows = all<{ user_id: string; days: number; tasks: number }>(
    `SELECT d.user_id,
            COUNT(*) AS days,
            COALESCE((
              SELECT COUNT(*) FROM tasks t
              JOIN days d2 ON d2.id = t.day_id
              WHERE d2.user_id = d.user_id AND d2.locked = 1 AND t.status = 'done'
                AND d2.date >= ? AND d2.date <= ?
            ), 0) AS tasks
     FROM days d
     WHERE d.locked = 1 AND d.date >= ? AND d.date <= ?
     GROUP BY d.user_id
     ORDER BY days DESC, tasks DESC
     LIMIT 80`,
    start,
    today,
    start,
    today
  );
  const friendSet = new Set(friendIds(viewerId));
  const rows: LeaderRow[] = [];
  for (const row of dayRows) {
    if (allowed && !allowed.has(row.user_id)) continue;
    const user = getUserById(row.user_id);
    if (!user) continue;
    rows.push({
      id: user.id,
      name: user.name,
      username: user.username,
      days: row.days,
      streak: computeStreak(lockedDates(user.id), today),
      tasks: row.tasks,
      isYou: user.id === viewerId,
      isFriend: friendSet.has(user.id),
    });
  }
  if (!rows.some((row) => row.isYou)) {
    const you = getUserById(viewerId);
    if (you && (!allowed || allowed.has(viewerId))) {
      const dates = lockedDates(viewerId).filter((d) => d >= start && d <= today);
      const tasks = all<{ n: number }>(
        `SELECT COUNT(*) AS n FROM tasks t
         JOIN days d ON d.id = t.day_id
         WHERE d.user_id = ? AND d.locked = 1 AND t.status = 'done'
           AND d.date >= ? AND d.date <= ?`,
        viewerId,
        start,
        today
      )[0]?.n ?? 0;
      rows.push({
        id: you.id,
        name: you.name,
        username: you.username,
        days: dates.length,
        streak: computeStreak(lockedDates(viewerId), today),
        tasks,
        isYou: true,
        isFriend: false,
      });
      rows.sort((a, b) => b.days - a.days || b.tasks - a.tasks);
    }
  }
  return rows.slice(0, 50);
}

export function loadSnapshot(user: UserRow, today: string): AppSnapshot {
  const history = getHistory(user.id);
  if (!history[today]) history[today] = emptyDay(today);
  const dates = Object.values(history)
    .filter((day) => day.locked)
    .map((day) => day.date)
    .sort();
  return {
    profile: toProfile(user),
    today: history[today],
    history,
    strategies: listStrategies(user.id),
    playbookRules: [],
    friends: listFriends(user.id, today),
    requests: listRequests(user.id),
    suggested: listSuggested(user.id),
    streak: computeStreak(dates, today),
    bestStreak: computeBestStreak(dates),
    weekCount: weekCount(dates, today),
    monthCount: monthCount(dates, today),
    totalDays: dates.length,
    unlimitedGenerate: true,
  };
}
