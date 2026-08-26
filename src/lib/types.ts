export type TaskStatus = "pending" | "done" | "skipped";
export type EnergyLevel = "low" | "steady" | "high";
export type FriendshipStatus = "pending" | "accepted";

export interface Task {
  id: string;
  title: string;
  detail: string;
  minutes: number;
  status: TaskStatus;
}

export interface DayRule {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface DayEntry {
  date: string;
  locked: boolean;
  lockedAt: string | null;
  note: string;
  tasks: Task[];
  rules: DayRule[];
  generateCount: number;
}

export interface Strategy {
  id: string;
  title: string;
  description: string;
  active: boolean;
}

export interface FriendTask {
  title: string;
  status: TaskStatus;
}

export interface Friend {
  id: string;
  name: string;
  username: string;
  streak: number;
  lockedToday: boolean;
  daysThisMonth: number;
  lastNote: string;
  todayTasks: FriendTask[];
  todayRules: FriendTask[];
  showRules: boolean;
}

export interface FriendRequest {
  id: string;
  name: string;
  username: string;
  mutuals: number;
}

export interface LeaderRow {
  id: string;
  name: string;
  username: string;
  days: number;
  streak: number;
  tasks: number;
  isYou?: boolean;
  isFriend?: boolean;
}

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  goals: string;
  energy: EnergyLevel;
  dailyTaskGoal: number;
  theme: "dark" | "light";
  notifyEvening: boolean;
  notifyStreakRisk: boolean;
  notifyFriends: boolean;
  inviteCode: string;
  showRulesToFriends: boolean;
}

export interface AppSnapshot {
  profile: UserProfile;
  today: DayEntry;
  history: Record<string, DayEntry>;
  strategies: Strategy[];
  playbookRules: Strategy[];
  friends: Friend[];
  requests: FriendRequest[];
  suggested: FriendRequest[];
  streak: number;
  bestStreak: number;
  weekCount: number;
  monthCount: number;
  totalDays: number;
  unlimitedGenerate: boolean;
}

export interface TaskDraft {
  title: string;
  detail: string;
  minutes: number;
}
