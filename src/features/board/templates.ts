import { getLang } from '../../i18n';
import type { Priority, Recurrence } from './types';

/** BT altyapı işleri için hazır görev şablonları (TR / EN). */
interface Template {
  id: string;
  title: { tr: string; en: string };
  priority: Priority;
  recurrence?: Recurrence;
  /** Bugünden kaç gün sonra teslim. */
  dueInDays: number;
  steps: { tr: string; en: string }[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'patch',
    title: { tr: 'Aylık yama (Patch Tuesday)', en: 'Monthly patching (Patch Tuesday)' },
    priority: 'high',
    recurrence: 'monthly',
    dueInDays: 7,
    steps: [
      { tr: 'Microsoft güncelleme notlarını incele', en: 'Review Microsoft release notes' },
      { tr: 'Test grubuna dağıt', en: 'Deploy to pilot ring' },
      { tr: '48 saat izleme', en: 'Monitor for 48 hours' },
      { tr: 'Üretime dağıt', en: 'Deploy to production' },
      { tr: 'Uyumluluk raporunu al', en: 'Pull compliance report' },
    ],
  },
  {
    id: 'cert',
    title: { tr: 'SSL/TLS sertifika yenileme', en: 'SSL/TLS certificate renewal' },
    priority: 'high',
    recurrence: 'yearly',
    dueInDays: 14,
    steps: [
      { tr: 'CSR oluştur', en: 'Generate CSR' },
      { tr: 'Sertifikayı CA üzerinden yenile', en: 'Renew certificate with the CA' },
      { tr: 'Sunuculara/yük dengeleyiciye yükle', en: 'Install on servers / load balancer' },
      { tr: 'Zinciri ve son kullanma tarihini doğrula', en: 'Verify chain and expiry date' },
    ],
  },
  {
    id: 'backup',
    title: { tr: 'Yedek geri yükleme testi', en: 'Backup restore test' },
    priority: 'medium',
    recurrence: 'monthly',
    dueInDays: 5,
    steps: [
      { tr: 'Rastgele bir VM/dosya seç', en: 'Pick a random VM/file' },
      { tr: 'İzole ortama geri yükle', en: 'Restore to an isolated environment' },
      { tr: 'Uygulama/veri bütünlüğünü doğrula', en: 'Verify application/data integrity' },
      { tr: 'Süreyi (RTO) kaydet', en: 'Record restore time (RTO)' },
    ],
  },
  {
    id: 'onboarding',
    title: { tr: 'Yeni çalışan hesabı', en: 'New employee onboarding' },
    priority: 'medium',
    dueInDays: 3,
    steps: [
      { tr: 'AD/Entra ID hesabı oluştur', en: 'Create AD/Entra ID account' },
      { tr: 'Lisans ve grup üyelikleri', en: 'Assign licenses and groups' },
      { tr: 'Cihazı Intune ile kaydet', en: 'Enroll device in Intune' },
      { tr: 'MFA kurulumu', en: 'Set up MFA' },
      { tr: 'Hoş geldin e-postası', en: 'Send welcome email' },
    ],
  },
  {
    id: 'offboarding',
    title: { tr: 'Ayrılan çalışan hesabı kapatma', en: 'Employee offboarding' },
    priority: 'critical',
    dueInDays: 1,
    steps: [
      { tr: 'Hesabı devre dışı bırak, oturumları sonlandır', en: 'Disable account, revoke sessions' },
      { tr: 'Posta kutusunu paylaşılan kutuya çevir', en: 'Convert mailbox to shared' },
      { tr: 'Cihazı sil / geri al', en: 'Wipe / collect device' },
      { tr: 'Lisansları geri al', en: 'Reclaim licenses' },
    ],
  },
  {
    id: 'access-review',
    title: { tr: 'Çeyreklik yetki gözden geçirme', en: 'Quarterly access review' },
    priority: 'medium',
    recurrence: 'quarterly',
    dueInDays: 10,
    steps: [
      { tr: 'Ayrıcalıklı grupları dışa aktar', en: 'Export privileged groups' },
      { tr: 'Yöneticilerden onay al', en: 'Collect manager attestations' },
      { tr: 'Gereksiz yetkileri kaldır', en: 'Remove unneeded access' },
    ],
  },
];

export function templateTitle(tpl: Template): string {
  return tpl.title[getLang()];
}

export function templateToTask(tpl: Template) {
  const lang = getLang();
  const due = new Date();
  due.setDate(due.getDate() + tpl.dueInDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    title: tpl.title[lang],
    priority: tpl.priority,
    recurrence: tpl.recurrence,
    dueDate: `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`,
    checklist: tpl.steps.map((s) => ({ id: crypto.randomUUID(), text: s[lang], done: false })),
  };
}
