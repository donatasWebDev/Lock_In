export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs font-medium text-red-400" role="alert">
      {message}
    </p>
  );
}

export function fieldClass(error?: string) {
  return `mt-1.5 w-full rounded-xl border bg-ink-900 px-4 py-3.5 text-sm placeholder:text-chalk-faint focus:outline-none ${
    error
      ? "border-red-500/60 focus:border-red-400"
      : "border-ink-800 focus:border-accent/60"
  }`;
}
