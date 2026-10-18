import { t as tr, type MessageKey } from '../../i18n';
import { priorityLabel, type Task } from '../board/types';
import { redactSensitive } from './redact';

/**
 * Multi-Output AI Engine — prompt şablonları.
 *
 * Tasarım ilkeleri:
 * - Sistem promptu rolü, okuyucuyu ve "neden"leri anlatır; kural listesi kısa tutulur.
 * - Veriler XML etiketleriyle ayrılır; model talimat ile veriyi karıştırmaz.
 * - Uydurma metrik yok: eksik sayı köşeli parantezli yer tutucu olarak kalır, kullanıcı doldurur.
 * - Çıktı biçimi kesin tanımlanır ki arayüz doğrudan kopyalanabilir metin göstersin.
 */

export type Language = 'tr' | 'en';
export type Audience = 'cto' | 'cfo' | 'operations' | 'general';

export const AUDIENCES: Audience[] = ['cto', 'cfo', 'operations', 'general'];
export const audienceLabel = (a: Audience, lang?: Language) => tr(`ai.audience.${a}` as MessageKey, undefined, lang);

const AUDIENCE_FOCUS: Record<Audience, string> = {
  cto: 'risk azaltma, güvenlik duruşu, mimari süreklilik ve teknik borcun azalması',
  cfo: 'maliyet, lisans/donanım tasarrufu, önlenen kayıp ve yatırımın geri dönüşü (ROI)',
  operations: 'hizmet sürekliliği, kullanıcıya etkisi, SLA ve iş akışlarının hızlanması',
  general: 'işin şirkete etkisi, önlenen kesinti ve risk, bir sonraki karar ihtiyacı',
};

export interface PromptPair {
  system: string;
  prompt: string;
}

/** Görev metnindeki açılı ayraçları kaçırır: kullanıcı verisi prompt'taki XML etiketlerini kapatamaz. */
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function taskXml(tasks: Task[], redact: boolean): string {
  const clean = (s?: string) => (s ? escapeXml((redact ? redactSensitive(s) : s).trim()) : '');
  return tasks
    .map((t) =>
      [
        `<is anahtar="${t.key}" oncelik="${priorityLabel(t.priority)}"${t.completedAt ? ` tamamlanma="${t.completedAt}"` : ''}>`,
        `  <baslik>${clean(t.title)}</baslik>`,
        t.description ? `  <aciklama>${clean(t.description)}</aciklama>` : '',
        t.outcome ? `  <sonuc>${clean(t.outcome)}</sonuc>` : '  <sonuc>(belirtilmemiş)</sonuc>',
        `</is>`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n');
}

const languageLine = (lang: Language) =>
  lang === 'en' ? 'Write the final output in professional business English.' : 'Çıktıyı akıcı, kurumsal Türkçe ile yaz.';

// ───────────────────────── 1) Yönetici Özeti (Executive Summary) ─────────────────────────

export function buildExecutiveSummary(opts: {
  tasks: Task[];
  audience: Audience;
  language: Language;
  recipientName?: string;
  senderName?: string;
  period?: string;
  extraContext?: string;
  redact: boolean;
}): PromptPair {
  const system = `Sen kurumsal bir BT altyapı ekibinin deneyimli hizmet yöneticisisin. Görevin, ekibin teknik iş kayıtlarını üst yöneticiye gidecek kısa ve ikna edici bir e-posta taslağına çevirmek.

Okuyucu teknik değildir ve e-postayı birkaç dakikada okuyup karar verecektir. Bu okuyucu için asıl önemli olan: ${AUDIENCE_FOCUS[opts.audience]}. Teknik ayrıntıyı ancak bu etkiyi açıklamak için gerekiyorsa, tek cümleyle ve sade dille kullan.

Doğruluk her şeyden önemlidir; bu e-posta bir yöneticiye ekip adına gönderilecek. Bu yüzden yalnızca <tamamlanan_isler> içindeki olguları ve sayıları kullan. Kesinti süresi, kullanıcı sayısı, maliyet veya tasarruf gibi bir değer verilmemişse tahmin etme; yerine köşeli parantezli bir yer tutucu bırak, örneğin [kesinti süresi: ? dk] veya [tahmini tasarruf: ? TL]. Kullanıcı bunları göndermeden önce dolduracak.

Ton: kendinden emin, abartısız, saygılı. Övgü sıfatları yerine somut sonuç kullan.

${languageLine(opts.language)}

Çıktıyı yalnızca aşağıdaki biçimde ver, başka açıklama ekleme:

Konu: <tek satır, en önemli iş etkisini içeren konu>

<hitap>,

<2-3 cümlelik özet: bu dönemde ne başarıldı ve şirkete etkisi ne>

**Öne çıkanlar**
- <iş> — <iş etkisi>

**Risk ve kesinti**
- <önlenen risk, yaşanan veya önlenen kesinti; yoksa bu bölümü tek cümleyle geç>

**Sonraki adımlar**
- <varsa karar veya onay ihtiyacı en üstte>

<kısa kapanış ve imza>`;

  const prompt = `<donem>${opts.period || 'son çalışma dönemi'}</donem>
<alici>${opts.recipientName || audienceLabel(opts.audience, opts.language)}</alici>
<gonderen>${opts.senderName || 'Dağcan'}</gonderen>
<tamamlanan_isler>
${taskXml(opts.tasks, opts.redact)}
</tamamlanan_isler>
${opts.extraContext ? `<ek_baglam>\n${opts.redact ? redactSensitive(opts.extraContext) : opts.extraContext}\n</ek_baglam>\n` : ''}
Bu işlere dayanarak yönetici e-posta taslağını yaz.`;

  return { system, prompt };
}

// ───────────────────────── 2) CV / Portfolyo Dönüştürücü (STAR) ─────────────────────────

export function buildCareerStar(opts: {
  tasks: Task[];
  language: Language;
  targetRole?: string;
  seniority?: string;
  redact: boolean;
}): PromptPair {
  const system = `Sen teknoloji sektöründe işe alım deneyimi olan bir kariyer koçusun. Sistem ve altyapı mühendislerinin yaptığı işleri; CV, LinkedIn ve mülakatta kullanılabilecek güçlü ama doğru ifadelere dönüştürürsün.

STAR yöntemini kullan: Durum (Situation), Görev (Task), Eylem (Action), Sonuç (Result). İşe alımcılar ve ATS sistemleri; güçlü bir eylem fiiliyle başlayan, kullanılan teknolojiyi doğru adıyla anan ve sonucu ölçen cümleleri öne çıkarır. "Sorumluydum", "yardımcı oldum" gibi pasif kalıplar adayın katkısını gizler; bunun yerine adayın bizzat ne yaptığını yaz.

Abartı adayın mülakatta zor durumda kalmasına yol açar. Bu yüzden sonucu yalnızca <sonuc> alanındaki ölçümlerle nicelendir. Ölçüm yoksa uydurma; yerine [ölçüm ekle: örn. etkilenen kullanıcı sayısı] gibi bir yer tutucu bırak. Verilmeyen bir teknolojiyi veya ekip büyüklüğünü ekleme.

${languageLine(opts.language)}

Her iş için yalnızca şu biçimi kullan:

### <anahtar> — <kısa iş adı>
**CV maddesi:** <tek cümle, en fazla 30 kelime, eylem fiiliyle başlar>
**LinkedIn:** <2-3 cümle, birinci tekil şahıs, doğal ve profesyonel>
**Mülakat (STAR):**
- **Durum:** …
- **Görev:** …
- **Eylem:** …
- **Sonuç:** …

Tüm işlerden sonra:
### Öne çıkan yetkinlikler
<ATS uyumlu 6-10 anahtar kelime, virgülle ayrılmış>`;

  const prompt = `<hedef_rol>${opts.targetRole || 'Sistem / Altyapı Mühendisi'}</hedef_rol>
<kidem>${opts.seniority || 'belirtilmemiş'}</kidem>
<isler>
${taskXml(opts.tasks, opts.redact)}
</isler>

Bu işleri STAR yöntemine göre CV, LinkedIn ve mülakat ifadelerine dönüştür.`;

  return { system, prompt };
}

// ───────────────────────── 3) Değişiklik Talebi (RFC / CAB) ─────────────────────────

export function buildChangeRequest(opts: {
  tasks: Task[];
  language: Language;
  window?: string;
  extraContext?: string;
  redact: boolean;
}): PromptPair {
  const system = `Sen ITIL uyumlu değişiklik yönetimi süreçlerinde deneyimli bir BT altyapı mühendisisin. Görevin, planlanan işleri Değişiklik Danışma Kurulu'na (CAB) sunulacak bir değişiklik talebine (RFC) dönüştürmek.

CAB üyeleri riskin gerçekçi değerlendirildiğini ve geri dönüş planının uygulanabilir olduğunu görmek ister; iyimser ama dayanaksız bir talep reddedilir. Bu yüzden risk ve etkiyi verilen bilgilere dayanarak değerlendir. Bilinmeyen değerleri (etkilenen sistem sayısı, süre, onaylayan kişi) uydurma; [? — doldurulacak] biçiminde yer tutucu bırak. Uygulama ve geri dönüş adımlarını numaralı, birbirinden bağımsız doğrulanabilir adımlar olarak yaz.

${languageLine(opts.language)}

Yalnızca şu bölümleri, bu sırayla ve Markdown başlıklarıyla üret:
## Özet
## Gerekçe ve iş faydası
## Kapsam ve etkilenen sistemler
## Risk değerlendirmesi (Olasılık / Etki / Risk düzeyi ve azaltma önlemleri)
## Uygulama planı
## Doğrulama / test adımları
## Geri dönüş (rollback) planı
## İletişim planı
## Değişiklik sınıfı önerisi (Standart / Normal / Acil) ve kısa gerekçe`;

  const prompt = `<bakim_penceresi>${opts.window || '[? — doldurulacak]'}</bakim_penceresi>
<planlanan_isler>
${taskXml(opts.tasks, opts.redact)}
</planlanan_isler>
${opts.extraContext ? `<ek_baglam>\n${opts.redact ? redactSensitive(opts.extraContext) : opts.extraContext}\n</ek_baglam>\n` : ''}
Bu işler için CAB'a sunulacak değişiklik talebini yaz.`;

  return { system, prompt };
}

// ───────────────────────── 4) Olay Sonrası Rapor (Postmortem) ─────────────────────────

export function buildPostmortem(opts: {
  tasks: Task[];
  language: Language;
  incident: string;
  redact: boolean;
}): PromptPair {
  const system = `Sen suçlamasız (blameless) olay sonrası inceleme kültürünü benimsemiş deneyimli bir site güvenilirlik (SRE) mühendisisin. Görevin, bir altyapı olayına ait notları ve ilgili görevleri ekip ve yönetimle paylaşılacak bir olay sonrası rapora dönüştürmek.

Raporun amacı kişileri değil sistemleri ve süreçleri iyileştirmektir; bu yüzden kişi suçlayan ifadelerden kaçın ve kök nedeni "neden?" sorusunu yeterince derinleştirerek ara. Zaman çizelgesinde yalnızca verilen zamanları kullan; bilinmeyen zamanlar için [saat: ?] yer tutucusu bırak. Etki (süre, etkilenen kullanıcı/hizmet) verilmemişse tahmin etme.

${languageLine(opts.language)}

Yalnızca şu bölümleri, bu sırayla ve Markdown başlıklarıyla üret:
## Özet (2-3 cümle)
## Etki
## Zaman çizelgesi
## Kök neden analizi (5 Neden)
## İyi giden ve gelişmesi gereken noktalar
## Aksiyonlar (tablo: Aksiyon | Sahibi | Öncelik | Hedef tarih — sahip ve tarih bilinmiyorsa yer tutucu)`;

  const prompt = `<olay_ozeti>
${opts.redact ? redactSensitive(opts.incident) : opts.incident}
</olay_ozeti>
<ilgili_isler>
${taskXml(opts.tasks, opts.redact)}
</ilgili_isler>

Bu bilgilere dayanarak olay sonrası raporu yaz.`;

  return { system, prompt };
}
