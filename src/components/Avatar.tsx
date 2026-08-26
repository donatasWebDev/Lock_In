interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
}

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-lg",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = "md", ring = false }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-ink-750 font-display font-semibold tracking-wide text-chalk-muted ${
        ring ? "ring-2 ring-accent/70" : "ring-1 ring-ink-700"
      }`}
    >
      {initials(name)}
    </span>
  );
}
