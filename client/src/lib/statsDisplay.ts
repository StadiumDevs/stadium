// Display helpers shared by the stats page components.

/** "9 Nov 2026, 15:30 IST" */
export const formatIst = (iso: string) =>
  `${new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso))} IST`;

/** Track colours (theme tokens) and their legend labels. */
export const TRACK_COLORS: Record<string, string> = {
  privacy: "hsl(var(--info))",
  both: "hsl(var(--led))",
  agentic: "hsl(var(--warn))",
};

export const STATS_SECTIONS = [
  { id: "winners", label: "Prize winners" },
  { id: "headline", label: "Numbers" },
  { id: "tracks", label: "Tracks & categories" },
  { id: "top", label: "Top per category" },
  { id: "privacy-review", label: "Privacy tech review" },
  { id: "feedback", label: "Feedback" },
] as const;

