/**
 * Görev metinleri buluta gitmeden önce yerel maskeleme. Kasa içeriği zaten AI'a hiç gönderilmez;
 * bu katman görev açıklamalarına yanlışlıkla yazılmış IP, e-posta, UNC yolu ve parolaları yakalar.
 */
const RULES: [RegExp, string][] = [
  [/\b(password|parola|şifre|sifre|pwd|secret|token|apikey|api_key)\s*[:=]\s*\S+/gi, '$1: [gizli]'],
  [/\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/g, '[IP]'],
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[e-posta]'],
  [/\\\\[\w.-]+\\[^\s]+/g, '[UNC yolu]'],
  [/\b(sk-ant-[\w-]{8,}|ghp_[\w]{20,}|AKIA[0-9A-Z]{16})\b/g, '[anahtar]'],
];

export function redactSensitive(text: string): string {
  return RULES.reduce((acc, [re, rep]) => acc.replace(re, rep), text);
}
