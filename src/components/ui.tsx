import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle' | 'accent';

const variants: Record<Variant, string> = {
  // Sinyal sarısı: ana eylem (koyu metin 16.9:1)
  primary:
    'notch-sm bg-volt text-obsidian-950 hover:bg-[#fff35a] hover:shadow-[0_0_18px_rgb(252_238_10/0.45)] active:bg-[#e6d800] disabled:bg-volt/[0.06] disabled:text-volt/75 disabled:shadow-[inset_0_0_0_1px_rgb(252_238_10/0.35)]',
  // Magenta: ikincil vurgulu eylem (koyu metin 5.9:1; beyaz metin 4.4:1 ile AA'yı geçmiyordu)
  accent:
    'notch-sm bg-magenta text-obsidian-950 hover:bg-[#ff4f9c] hover:shadow-[0_0_18px_rgb(255_46_136/0.45)] active:bg-brand disabled:opacity-40',
  ghost: 'text-ink-muted hover:text-cyan hover:bg-cyan/[0.07] active:bg-cyan/[0.12] disabled:opacity-40',
  subtle:
    'notch-sm notch-frame notch-frame-sm bg-cyan/[0.06] text-ink border border-line-strong hover:border-cyan/60 hover:text-cyan hover:bg-cyan/10 hover:[--notch-color:rgb(0_240_255/0.6)] active:bg-cyan/[0.16] disabled:opacity-40',
  danger:
    'notch-sm notch-frame notch-frame-sm bg-danger/10 text-danger border border-danger/45 [--notch-color:rgb(255_46_99/0.45)] hover:bg-danger/20 hover:shadow-[0_0_14px_rgb(255_46_99/0.35)] active:bg-danger/25 disabled:opacity-40',
};

export function Button({
  variant = 'subtle',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`font-display relative inline-flex h-9 shrink-0 items-center justify-center gap-2 px-3.5 text-[15px] font-semibold tracking-wide whitespace-nowrap uppercase transition-[background-color,color,border-color,box-shadow,transform] duration-150 select-none active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0 [&_svg]:shrink-0 ${variants[variant]} ${className}`}
    />
  );
}

/** Yalnızca ikon taşıyan kare düğme (satır eylemleri, panel başlıkları). Erişilebilir ad için title/aria-label verin. */
export function IconButton({
  tone = 'default',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'danger' }) {
  return (
    <button
      {...props}
      className={`grid size-8 shrink-0 place-items-center border border-transparent text-ink-muted transition-[background-color,color,border-color,box-shadow] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 [&_svg]:size-4 ${
        tone === 'danger'
          ? 'hover:border-danger/45 hover:bg-danger/10 hover:text-danger'
          : 'hover:border-cyan/40 hover:bg-cyan/[0.07] hover:text-cyan'
      } ${className}`}
    />
  );
}

const field =
  'w-full border border-line-field bg-obsidian-950/70 px-3 text-sm text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow,background-color] duration-150 hover:border-cyan/45 focus:border-cyan/80 focus:bg-obsidian-950/90 focus:shadow-[0_0_0_1px_rgb(0_240_255/0.35),0_0_14px_rgb(0_240_255/0.18)] focus:outline-none disabled:opacity-50';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-9 ${field} ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`py-2 leading-relaxed ${field} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-9 cursor-pointer ${field} ${props.className ?? ''}`} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="group/field flex flex-col gap-1.5">
      <span className="hud-label transition-colors group-focus-within/field:text-cyan">{label}</span>
      {children}
      {hint && <span className="text-xs leading-snug text-ink-subtle">{hint}</span>}
    </label>
  );
}

/** Kesik köşeli HUD paneli. Sol üstte ince neon köşe işareti, kesik köşelerde diyagonal çerçeve çizgisi taşır. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`glass notch notch-frame relative ${className}`}>
      <span aria-hidden className="pointer-events-none absolute top-0 left-[10px] h-px w-10 bg-cyan/70 shadow-[0_0_8px_rgb(0_240_255/0.8)]" />
      {children}
    </section>
  );
}

/** Panel içi bölüm başlığı: HUD etiketi + isteğe bağlı ikon ve sağ tarafta eylemler. */
export function SectionTitle({ icon, children, actions, className = '' }: { icon?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-6 items-center gap-2 ${className}`}>
      {icon && <span className="text-cyan [&_svg]:size-3.5">{icon}</span>}
      <span className="hud-label flex-1 truncate">{children}</span>
      {actions}
    </div>
  );
}

/** Boş durum: ince çerçeveli ikon karosu + açıklama. Metni çağıran taraf verir. */
export function EmptyState({ icon, children, className = '' }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-10 text-center ${className}`}>
      <span className="notch-sm notch-frame notch-frame-sm relative grid size-11 place-items-center border border-line-strong bg-cyan/[0.04] text-ink-subtle [&_svg]:size-5">
        {icon}
      </span>
      <div className="max-w-xs text-sm text-ink-subtle">{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="flex shrink-0 items-end justify-between gap-4 px-8 pt-6 pb-5">
      <div className="min-w-0">
        <div aria-hidden className="mb-1.5 flex items-center gap-2">
          <span className="h-3 w-1 bg-magenta shadow-[0_0_10px_rgb(255_46_136/0.9)]" />
          <span className="h-px w-12 bg-gradient-to-r from-magenta to-transparent" />
        </div>
        <h1 className="text-[28px] leading-none font-bold tracking-[0.06em] uppercase">{title}</h1>
        {subtitle && <p className="mt-2 truncate text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
