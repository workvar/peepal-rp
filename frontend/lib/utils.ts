// cn() — lightweight class merger (replaces clsx + tailwind-merge without extra deps)
export function cn(...classes: (string | undefined | null | false)[]): string {
  // Collect all class tokens, later tokens win for Tailwind conflicts
  const parts: string[] = [];
  for (const cls of classes) {
    if (cls) parts.push(...cls.split(/\s+/).filter(Boolean));
  }

  // De-duplicate by Tailwind utility prefix — keep last occurrence
  const seen = new Map<string, string>();
  for (const token of parts) {
    // Key is everything before the last '-' segment (handles responsive/state prefixes too)
    const key = token.replace(/^([\w-]+:)*/, "").replace(/-[^-/\[]+(\[.*?\])?$/, "");
    seen.set(`${token.replace(/-[^-/\[]+(\[.*?\])?$/, "")}`, token);
  }

  return parts
    .filter((t, i, arr) => arr.lastIndexOf(t) === i) // dedupe exact tokens
    .join(" ");
}
