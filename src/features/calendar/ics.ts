import type { Recurrence, Task } from '../board/types';

const RRULE: Record<Recurrence, string> = {
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
  quarterly: 'FREQ=MONTHLY;INTERVAL=3',
  yearly: 'FREQ=YEARLY',
};

/** RFC 5545 metin kaçışı ve 75 oktet satır katlama. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const ch of line) {
    if (new TextEncoder().encode(current + ch).length > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = ch;
    } else current += ch;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const ymd = (iso: string) => iso.replaceAll('-', '');
function nextDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}

/** Açık görevlerin teslim tarihlerini tüm gün etkinlikleri olarak dışa aktarır. */
export function buildIcs(tasks: Task[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dagcan Is Takip//TR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Dağcan İş Takip'];
  for (const t of tasks) {
    if (!t.dueDate || t.status === 'done') continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@dagcan-is-takip`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(t.dueDate)}`,
      `DTEND;VALUE=DATE:${ymd(nextDay(t.dueDate))}`,
      `SUMMARY:${esc(`${t.key} · ${t.title}`)}`,
    );
    if (t.description) lines.push(`DESCRIPTION:${esc(t.description)}`);
    if (t.recurrence) lines.push(`RRULE:${RRULE[t.recurrence]}`);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(t.title)}`, 'TRIGGER:-PT15H', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
