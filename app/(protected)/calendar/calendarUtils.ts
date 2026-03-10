export const MONTHS_NL = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

export const DAYS_NL = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
}

const PROJECT_COLORS = [
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800", dot: "bg-blue-400" },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800", dot: "bg-violet-400" },
  { bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-800", dot: "bg-teal-400" },
  { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800", dot: "bg-orange-400" },
  { bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-800", dot: "bg-pink-400" },
  { bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-800", dot: "bg-cyan-400" },
  { bg: "bg-lime-100", border: "border-lime-300", text: "text-lime-800", dot: "bg-lime-400" },
  { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-800", dot: "bg-rose-400" },
] as const;

export function projectColor(projectId: string) {
  let h = 0;
  for (let i = 0; i < projectId.length; i++) h = (h * 31 + projectId.charCodeAt(i)) & 0xffffffff;
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length];
}
