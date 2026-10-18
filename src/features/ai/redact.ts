/**
 * Görev metinleri buluta gitmeden önce yerel maskeleme. Kasa içeriği zaten AI'a hiç gönderilmez;
 * bu katman görev açıklamalarına yanlışlıkla yazılmış IP, e-posta, UNC yolu ve parolaları yakalar.
 */
const RULES: [RegExp, string][] = [
  [/\\\\[\w.-]+\\[^\s]+/g, '[UNC yolu]'],
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[e-posta]'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[özel anahtar]'],
  [/\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}\b/g, '[JWT]'],
  [/\bBearer\s+[\w.~+/-]{16,}=*/gi, 'Bearer [token]'],
  [/\b(sk-[\w-]{16,}|xox[bpas]-[\w-]{10,}|ghp_[\w]{20,}|github_pat_[\w]{20,}|AKIA[0-9A-Z]{16})\b/g, '[anahtar]'],
  [/\bTR\d{2}[ ]?(?:\d{4}[ ]?){5}\d{2}\b/gi, '[IBAN]'],
  [/\b[1-9]\d{10}\b/g, '[TCKN]'],
  [/\b[A-Z0-9-]{2,15}\\[\w.$-]{2,}\b/g, '[DOMAIN\\kullanıcı]'],
  [/\b(?:[0-9a-f]{1,4}:){4,7}[0-9a-f]{1,4}\b/gi, '[IPv6]'],
  [/\b(?:[a-z0-9-]+\.)+(?:corp|local|lan|internal|intra|ad|domain)\b/gi, '[host]'],
  [/\b(password|parola|şifre|sifre|pwd|secret|token|apikey|api_key)\s*[:=]\s*\S+/gi, '$1: [gizli]'],
  [/\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/g, '[IP]'],
  [/\b(sk-ant-[\w-]{8,}|ghp_[\w]{20,}|AKIA[0-9A-Z]{16})\b/g, '[anahtar]'],
];

export function redactSensitive(text: string): string {
  return RULES.reduce((acc, [re, rep]) => acc.replace(re, rep), text);
}
