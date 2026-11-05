import { CirclePlay, FolderOpen, Link2, PenTool, type LucideIcon } from "lucide-react";

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" of today in the viewer's timezone. */
function localTodayKey(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Whole days between two "YYYY-MM-DD" keys (b - a). */
function daysBetweenKeys(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

export type DueInfo = {
  label: string;
  tone: "overdue" | "soon" | "normal";
  title: string;
};

/** Due date as people say it: "hoje", "amanhã", "em 3 dias", "atrasado há 2 dias". */
export function describeDue(value?: string | null, now = new Date()): DueInfo | null {
  if (!value) return null;
  const dueKey = value.slice(0, 10);
  const diff = daysBetweenKeys(localTodayKey(now), dueKey);
  const title = `Prazo: ${new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${dueKey}T12:00:00Z`))}`;

  if (diff < 0) {
    const late = -diff;
    return { label: late === 1 ? "atrasado há 1 dia" : `atrasado há ${late} dias`, tone: "overdue", title };
  }
  if (diff === 0) return { label: "hoje", tone: "soon", title };
  if (diff === 1) return { label: "amanhã", tone: "soon", title };
  if (diff <= 6) return { label: `em ${diff} dias`, tone: "normal", title };

  return {
    label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })
      .format(new Date(`${dueKey}T12:00:00Z`))
      .replace(".", ""),
    tone: "normal",
    title,
  };
}

/** Whole days since an ISO timestamp (0 = today). */
export function daysSince(value?: string | null, now = new Date()) {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / DAY_MS));
}

export function describeTimeInColumn(days: number, columnLabel: string) {
  if (days === 0) return `desde hoje em ${columnLabel}`;
  return days === 1 ? `há 1 dia em ${columnLabel}` : `há ${days} dias em ${columnLabel}`;
}

export type CardLink = {
  url: string;
  kind: "canva" | "drive" | "video" | "link";
  label: string;
  icon: LucideIcon;
};

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;

function classifyLink(url: string): Omit<CardLink, "url"> {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return { kind: "link", label: "Link", icon: Link2 };
  }

  if (host.endsWith("canva.com") || host === "canva.link") return { kind: "canva", label: "Canva", icon: PenTool };
  if (host === "drive.google.com" || host === "docs.google.com") return { kind: "drive", label: "Drive", icon: FolderOpen };
  if (
    host.endsWith("youtube.com") ||
    host === "youtu.be" ||
    host.endsWith("vimeo.com") ||
    host.endsWith("tiktok.com") ||
    (host.endsWith("instagram.com") && /\/(reel|p|tv)\//.test(url))
  ) {
    return { kind: "video", label: "Vídeo", icon: CirclePlay };
  }
  return { kind: "link", label: host || "Link", icon: Link2 };
}

/** Links found in the given texts, de-duplicated, in order of appearance. */
export function extractLinks(texts: Array<string | null | undefined>): CardLink[] {
  const seen = new Set<string>();
  const links: CardLink[] = [];

  for (const text of texts) {
    if (!text) continue;
    for (const match of text.match(URL_PATTERN) ?? []) {
      const url = match.replace(/[.,;:!?]+$/, "");
      if (seen.has(url)) continue;
      seen.add(url);
      links.push({ url, ...classifyLink(url) });
    }
  }

  return links;
}

const avatarPalette = [
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
];

/** Stable color per person, so the same name always gets the same avatar color. */
export function avatarClass(name: string) {
  const sum = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  return avatarPalette[sum % avatarPalette.length];
}

export function sameName(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.trim().localeCompare(b.trim(), "pt-BR", { sensitivity: "base" }) === 0;
}
