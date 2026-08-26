import OpenAI from "openai";
import { ENERGY_MINUTES } from "@/lib/constants";
import type { EnergyLevel, Strategy, TaskDraft } from "@/lib/types";

const SYSTEM = `You write today's lock-in tasks for one person.
Return JSON only: {"tasks":[{"title":string,"detail":string,"minutes":number}]}
Rules:
- Exactly the requested number of tasks.
- Every task must come from an ACTIVE strategy. Do not invent extra life areas.
- Tasks are concrete actions for TODAY, not slogans or generic advice.
- Title is the action. Detail is how to do it in one short line.
- Match energy: low = short/protect the chain; steady = a normal working day; high = more volume.
- minutes is focus time. Use 0 for a rule (for example no phone).
- Do not number titles. Do not repeat yesterday's tasks verbatim.`;

function fallbackTasks(
  strategies: Strategy[],
  energy: EnergyLevel,
  count: number
): TaskDraft[] {
  const minutes = ENERGY_MINUTES[energy];
  const source = strategies.filter((s) => s.active);
  const pool = source.length ? source : strategies;
  if (!pool.length) {
    return Array.from({ length: count }, (_, i) => ({
      title: i === 0 ? "One focused block" : `Next necessary thing ${i + 1}`,
      detail:
        energy === "low"
          ? "Timer on. One tab. The smallest version that still counts."
          : "Pick the hardest unfinished thing and finish a real slice of it.",
      minutes,
    }));
  }
  return Array.from({ length: count }, (_, i) => {
    const strategy = pool[i % pool.length];
    const round = Math.floor(i / pool.length) + 1;
    return {
      title: round > 1 ? `${strategy.title} — block ${round}` : strategy.title,
      detail: strategy.description,
      minutes,
    };
  });
}

function parseTasks(text: string, count: number): TaskDraft[] | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { tasks?: TaskDraft[] };
    if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) return null;
    return parsed.tasks.slice(0, count).map((task) => ({
      title: String(task.title ?? "").slice(0, 80).trim(),
      detail: String(task.detail ?? "").slice(0, 160).trim(),
      minutes: Math.max(0, Math.min(240, Number(task.minutes) || 0)),
    })).filter((task) => task.title);
  } catch {
    return null;
  }
}

export async function generateTasks(input: {
  strategies: Strategy[];
  energy: EnergyLevel;
  goals: string;
  count: number;
  date: string;
  previousTitles: string[];
}): Promise<TaskDraft[]> {
  const active = input.strategies.filter((s) => s.active);
  const fallback = fallbackTasks(input.strategies, input.energy, input.count);
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey || active.length === 0) return fallback;

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });
  const prompt = [
    `Date: ${input.date}`,
    `Energy: ${input.energy}`,
    `Task count: ${input.count}`,
    `Goals: ${input.goals || "(none given)"}`,
    "Active strategies:",
    ...active.map((s) => `- ${s.title}: ${s.description}`),
    input.previousTitles.length
      ? `Yesterday's tasks to avoid repeating: ${input.previousTitles.join("; ")}`
      : "No previous tasks.",
  ].join("\n");

  try {
    const response = await client.responses.create({
      model: "grok-4.6",
      input: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    });
    const parsed = parseTasks(response.output_text ?? "", input.count);
    if (parsed && parsed.length === input.count) return parsed;
    if (parsed && parsed.length) {
      return [...parsed, ...fallback].slice(0, input.count);
    }
  } catch {
    // Offline / missing credits / model hiccup: keep the day usable.
  }
  return fallback;
}
