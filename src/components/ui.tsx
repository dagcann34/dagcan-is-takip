import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle' | 'accent';

const variants: Record<Variant, string> = {
  // Sinyal sarısı: ana eylem
  primary: 'notch-sm bg-volt text-obsidian-950 hover:bg-[#fff35a] hover:shadow-[0_0_18px_rgb(252_238_10/0.45)]',
  // Magenta: ikincil vurgulu eylem
  accent: 'notch-sm bg-brand text-white hover:bg-brand-hover hover:shadow-[0_0_18px_rgb(255_46_136/0.45)]',
  ghost: 'text-ink-muted hover:text-cyan hover:bg-cyan/5',
  subtle: 'notch-sm bg-cyan/[0.06] text-ink border border-line hover:border-cyan/50 hover:text-cyan hover:bg-cyan/10',
  danger: 'notch-sm bg-danger/10 text-danger border border-danger/40 hover:bg-danger/20 hover:shadow-[0_0_14px_rgb(255_46_99/0.35)]',
};

export function Button({
  variant = 'subtle',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`font-display inline-flex h-9 items-center justify-center gap-2 px-3.5 text-[15px] font-semibold tracking-wide uppercase transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    />
  );
}

const field =
  'w-full border border-line bg-obsidian-950/70 px-3 text-sm text-ink placeholder:text-ink-subtle transition-all focus:border-cyan/70 focus:shadow-[0_0_0_1px_rgb(0_240_255/0.35),0_0_14px_rgb(0_240_255/0.18)] focus:outline-none';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-9 ${field} ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`py-2 ${field} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-9 ${field} ${props.className ?? ''}`} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="hud-label">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

/** Kesik köşeli HUD paneli. Sol üstte ince neon köşe işareti taşır. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`glass notch relative ${className}`}>
      <span aria-hidden className="pointer-events-none absolute top-0 left-[10px] h-px w-10 bg-cyan/70 shadow-[0_0_8px_rgb(0_240_255/0.8)]" />
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="flex shrink-0 items-end justify-between gap-4 px-8 pt-6 pb-5">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
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
