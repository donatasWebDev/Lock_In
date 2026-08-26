import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  ENERGY_MINUTES,
  GENERATE_DAILY_LIMIT,
  isDevUnlimited,
  type Energy,
} from "./helpers";

const SYSTEM = `You write today's lock-in tasks for one person.
Return JSON only: {"tasks":[{"title":string,"detail":string,"minutes":number}]}

Main goals are the destination. Strategies (plays) are methods — how they work toward those goals. Never invert that.

Intensity is already computed from streak + this month's completion, then capped by their energy setting (low always protects the chain). You do not recompute it.

Rules:
- Exactly the requested number of tasks.
- Start from Main goals. Every task must move a goal forward today.
- Cover as many distinct goals as the task count allows. Do not spend the whole list on one goal.
- If there are active strategies, they are tools, not the topic. Pick a method that serves the goal. Title the action toward the goal, not the strategy name.
- Spread methods. Never put every task on one play. If you have N tasks and M strategies, use different strategies across the list.
- If there are more tasks than strategies, leftover tasks come from remaining goals (no strategy required).
- If there are NO active strategies, write tasks from Main goals only.
- Standing rules (no alcohol, no social, etc.) already appear as their own checkboxes. Do not duplicate them as generated tasks.
- Match compiled intensity for how hard / how long:
  - low = short, protect the chain
  - steady = a normal working day
  - high = more volume
- Per-strategy rates shape the *kind* of method, not whether a goal appears:
  - High skip → smaller, more specific method
  - Same skip repeated → change the shape of the method
  - High done → keep that method in rotation
- Do not go easy just because they skipped. Skipping is allowed; the chain still matters.
- Tasks are concrete actions for TODAY, not slogans or generic advice.
- Title is the action toward the goal. Detail is how (the method) in one or two sentences.
- minutes is focus time. Use 0 for a rule (for example no phone).
- Do not number titles. Do not repeat yesterday's tasks verbatim.
- Do not use a thinking preamble. JSON only.`;

type Strategy = { id: string; title: string; description: string; active: boolean };
type Draft = { title: string; detail: string; minutes: number };

function goalBits(goals: string): string[] {
  const bits = goals
    .split(/[\n.;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  return bits.length ? bits : [goals.trim() || "the thing that actually matters"];
}

function fallbackFromGoals(goals: string, energy: Energy, count: number): Draft[] {
  const minutes = ENERGY_MINUTES[energy];
  const pool = goalBits(goals);
  return Array.from({ length: count }, (_, i) => {
    const bit = pool[i % pool.length];
    return {
      title: bit.length > 60 ? `${bit.slice(0, 57)}…` : bit,
      detail:
        energy === "low"
          ? "Smallest version that still counts. Timer on, one tab."
          : `A real slice of this today: ${bit}`,
      minutes,
    };
  });
}

function fallbackTasks(
  strategies: Strategy[],
  energy: Energy,
  count: number,
  goals: string
): Draft[] {
  const minutes = ENERGY_MINUTES[energy];
  const plays = strategies.filter((s) => s.active);
  if (!plays.length) return fallbackFromGoals(goals, energy, count);
  const pool = goalBits(goals);
  return Array.from({ length: count }, (_, i) => {
    const bit = pool[i % pool.length];
    const play = plays[i % plays.length];
    return {
      title: bit.length > 60 ? `${bit.slice(0, 57)}…` : bit,
      detail: `Using ${play.title}: ${play.description}`,
      minutes,
    };
  });
}

function parseTasks(
  text: string,
  count: number
): { tasks: Draft[] | null; reason: string } {
  if (!text.trim()) return { tasks: null, reason: "empty content" };
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? cleaned;
  const match = body.match(/\{[\s\S]*\}/) ?? body.match(/\[[\s\S]*\]/);
  if (!match) return { tasks: null, reason: "no JSON object or array in content" };
  try {
    const parsed = JSON.parse(match[0]) as { tasks?: Draft[] } | Draft[];
    const raw = Array.isArray(parsed) ? parsed : parsed.tasks;
    if (!Array.isArray(raw) || raw.length === 0) {
      return { tasks: null, reason: "JSON parsed but tasks missing or empty" };
    }
    const tasks = raw
      .slice(0, count)
      .map((task) => ({
        title: String(task.title ?? "").slice(0, 80).trim(),
        detail: String(task.detail ?? "").slice(0, 500).trim(),
        minutes: Math.max(0, Math.min(240, Number(task.minutes) || 0)),
      }))
      .filter((task) => task.title);
    if (!tasks.length) return { tasks: null, reason: "tasks had no titles" };
    return { tasks, reason: `ok (${tasks.length})` };
  } catch (err) {
    return {
      tasks: null,
      reason: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

type GroqMessage = {
  role?: string;
  content?: string | null;
  reasoning?: string | null;
  reasoning_content?: string | null;
};

type GenerateDebug = {
  send: Record<string, unknown>;
  get: Record<string, unknown>;
};

function logDev(debug: GenerateDebug) {
  if (!isDevUnlimited()) return;
  console.log("[generate] send", debug.send);
  console.log("[generate] get", debug.get);
}

export const today = action({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in first.");
    const info = await ctx.runQuery(internal.days.getGenerateContext, { date });
    if (info.locked) throw new Error("Today is already locked in.");
    const used = info.generateCount ?? 0;
    if (!isDevUnlimited() && used >= GENERATE_DAILY_LIMIT) {
      throw new Error(
        `You've used today's ${GENERATE_DAILY_LIMIT} generates. Try again tomorrow.`
      );
    }
    const hasPlays = info.strategies.some((s) => s.active);
    const hasGoals = info.goals.trim().length > 0;
    if (!hasPlays && !hasGoals) {
      throw new Error("Add a play in Playbook, or write your main goals on Profile.");
    }
    const energy = (info.intensity ?? info.energy) as Energy;
    const fallback = fallbackTasks(info.strategies, energy, info.count, info.goals);
    const key = process.env.GROQ_API_KEY;
    let drafts = fallback;
    let source: "groq" | "fallback" = "fallback";
    const debug: GenerateDebug = {
      send: { skipped: "no GROQ_API_KEY" },
      get: { source: "fallback" },
    };

    if (key) {
      const month = info.month;
      const prompt = [
        `Date: ${date}`,
        `Compiled intensity: ${energy}`,
        `Why: ${info.intensityReason ?? "n/a"}`,
        `Streak: ${info.streak ?? 0} days`,
        `Energy setting (cap): ${info.energy}`,
        `Task count: ${info.count}`,
        "Main goals (PRIMARY — every task must serve these; spread across them):",
        info.goals.trim() || "(none given — use strategies as methods only)",
        hasPlays
          ? "Strategies / plays (methods only — how to work a goal. Spread them. Do not put every task on one play. Title the goal action, not the strategy name):"
          : "No active plays. Write today's tasks from Main goals.",
        ...info.strategies
          .filter((s) => s.active)
          .map((s) => `- ${s.title}: ${s.description}`),
        info.standingRules?.length
          ? `Standing rules already on today's list (do not turn these into tasks): ${info.standingRules.join("; ")}`
          : "No standing rules.",
        "This month so far:",
        month
          ? `${month.lockedDays} days locked · ${month.done} done · ${month.skipped} skipped` +
            (month.pending ? ` · ${month.pending} left open` : "")
          : "No month history yet.",
        ...(month?.perStrategy ?? [])
          .filter((s) => info.strategies.some((st) => st.active && st.title === s.title))
          .map((s) => {
            const total = s.done + s.skipped + s.pending;
            const rate =
              total === 0
                ? "no data yet"
                : `${s.done} done / ${s.skipped} skipped` +
                  (s.pending ? ` / ${s.pending} open` : "");
            const skips = s.recentSkips.length
              ? ` · recent skips: ${s.recentSkips.join("; ")}`
              : "";
            return `- ${s.title}: ${rate}${skips}`;
          }),
        info.previousTitles.length
          ? `Yesterday's tasks to avoid repeating: ${info.previousTitles.join("; ")}`
          : "No previous tasks.",
      ].join("\n");

      const payload = {
        model: "qwen/qwen3.6-27b",
        temperature: 0.4,
        response_format: { type: "json_object" },
        reasoning_effort: "none",
        reasoning_format: "hidden",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      };
      debug.send = {
        url: "https://api.groq.com/openai/v1/chat/completions",
        ...payload,
      };

      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const rawText = await res.text();
        let body: unknown = rawText;
        try {
          body = JSON.parse(rawText) as unknown;
        } catch {
          /* keep text */
        }
        const json = (typeof body === "object" && body ? body : {}) as {
          error?: { message?: string; type?: string; code?: string };
          choices?: {
            finish_reason?: string;
            message?: GroqMessage;
          }[];
        };
        const message = json.choices?.[0]?.message;
        const content = message?.content ?? "";
        const parsed = parseTasks(content, info.count);
        debug.get = {
          status: res.status,
          ok: res.ok,
          error: json.error ?? null,
          finish_reason: json.choices?.[0]?.finish_reason ?? null,
          content,
          reasoning: message?.reasoning ?? message?.reasoning_content ?? null,
          parse: parsed.reason,
          parsedTasks: parsed.tasks,
          body,
        };
        if (res.ok && parsed.tasks && parsed.tasks.length === info.count) {
          drafts = parsed.tasks;
          source = "groq";
        } else if (res.ok && parsed.tasks?.length) {
          drafts = [...parsed.tasks, ...fallback].slice(0, info.count);
          source = "groq";
        } else {
          drafts = fallback;
          source = "fallback";
          debug.get = { ...debug.get, usedFallback: true };
        }
      } catch (err) {
        drafts = fallback;
        source = "fallback";
        debug.get = {
          threw: err instanceof Error ? err.message : String(err),
          usedFallback: true,
        };
      }
    }

    debug.get = { ...debug.get, source, saved: drafts };
    logDev(debug);
    await ctx.runMutation(internal.days.replaceTasks, { date, tasks: drafts });
    return isDevUnlimited() ? { source, debug } : { source };
  },
});
