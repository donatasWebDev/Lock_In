export const STARTER_STRATEGIES = [
  {
    title: "Morning deep work",
    description: "90 minutes on the hardest thing before email, chat, or news.",
    active: true,
  },
  {
    title: "Train six days",
    description: "Lift or run. Rest day is scheduled, not negotiated in the moment.",
    active: true,
  },
  {
    title: "Write every day",
    description: "500 rough words. Editing does not count as writing.",
    active: true,
  },
  {
    title: "No phone before 10am",
    description: "Phone charges outside the bedroom. First hour stays quiet.",
    active: false,
  },
] as const;

export const RULE_STARTERS = [
  { title: "No alcohol", description: "None today. Plan the evening so it stays true." },
  { title: "No smoking", description: "Not a puff. If the urge hits, walk it off." },
  { title: "No social media", description: "Apps off or deleted from the home screen today." },
  { title: "No fast food", description: "Cook or simple food. Drive-through is a skip." },
] as const;

export const EXTRA_STARTERS = [
  {
    title: "Shut down at 9pm",
    description: "Screens off, plan tomorrow in three lines, sleep.",
  },
  {
    title: "One hard conversation",
    description: "Say the thing you have been avoiding this week.",
  },
  {
    title: "Read 25 pages",
    description: "Paper only. Anything counts as long as it is finished.",
  },
  {
    title: "Weekly review",
    description: "Sunday: what moved, what stalled, what gets cut.",
  },
] as const;

export const ENERGY_MINUTES = {
  low: 20,
  steady: 45,
  high: 75,
} as const;

export const GENERATE_DAILY_LIMIT = 3;

export const COOKIE_NAME = "lockin_session";
export const SESSION_DAYS = 30;
