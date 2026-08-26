export type FieldErrors = {
  name?: string;
  username?: string;
  password?: string;
  form?: string;
};

function rawMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err ?? "");
}

export function cleanError(err: unknown): string {
  const raw = rawMessage(err);
  const uncaught = raw.match(/Uncaught Error:\s*([^\n]+)/i);
  const server = raw.match(/Server Error\s+(.+)$/i);
  const line = (uncaught?.[1] ?? server?.[1] ?? raw).trim();
  return line.replace(/^\[.*?\]\s*/g, "").trim();
}

export function loginErrors(err: unknown): FieldErrors {
  const msg = cleanError(err).toLowerCase();
  if (
    msg.includes("invalid credentials") ||
    msg.includes("invalid password") ||
    msg.includes("could not find")
  ) {
    return { password: "Incorrect username or password" };
  }
  if (msg.includes("missing")) {
    return { form: "Enter your username and password" };
  }
  return { form: "Could not log in. Try again." };
}

export function signupErrors(err: unknown): FieldErrors {
  const msg = cleanError(err).toLowerCase();
  if (msg.includes("already exists") || msg.includes("taken")) {
    return { username: "That username is taken" };
  }
  if (msg.includes("invalid password") || msg.includes("at least 8")) {
    return { password: "Password must be at least 8 characters" };
  }
  if (msg.includes("name")) {
    return { name: "Name needs at least 2 characters" };
  }
  if (msg.includes("username")) {
    return { username: "Username must be 3–20 letters, numbers, or underscores" };
  }
  return { form: cleanError(err) || "Could not create account" };
}

export function actionError(err: unknown, fallback: string): string {
  const msg = cleanError(err);
  if (!msg || msg.length > 140) return fallback;
  return msg;
}
