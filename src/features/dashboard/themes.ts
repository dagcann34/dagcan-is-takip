import type { CSSProperties } from 'react';
import type { Status } from '../board/types';

export type DashboardThemeId = 'neon' | 'whiteboard' | 'chalkboard' | 'executive' | 'blueprint';

export interface DashboardTheme {
  id: DashboardThemeId;
  /** Tuval arka planı (CSS background) */
  background: string;
  /** Çerçeve (CSS border/box-shadow) */
  frame: CSSProperties;
  panel: CSSProperties;
  ink: string;
  muted: string;
  grid: string;
  accent: string;
  headingFont: string;
  numberFont: string;
  bodyFont: string;
  /** El çizimi görünümü (beyaz tahta / kara tahta) */
  sketch: boolean;
  /**
   * Durum serisi renkleri. dataviz doğrulayıcısıyla her temanın yüzeyine karşı test edildi
   * (açık: #2a78d6,#1baf7a,#eb6834,#6250d6 · koyu: #3987e5,#199e70,#d95926,#9085e9).
   * Kontrastı 3:1 altında kalan tonlar için grafiklerde doğrudan etiket + tablo kullanılır.
   */
  status: Record<Status, string>;
  /** Akış grafiği: yeni / tamamlanan (doğrulanmış komşu çift: mavi ↔ aqua) */
  created: string;
  completed: string;
  swatch: [string, string, string];
}

const LIGHT_STATUS: Record<Status, string> = { todo: '#2a78d6', inprogress: '#1baf7a', blocked: '#eb6834', done: '#6250d6' };
const DARK_STATUS: Record<Status, string> = { todo: '#3987e5', inprogress: '#199e70', blocked: '#d95926', done: '#9085e9' };

const RAJDHANI = '"Rajdhani", "Inter Variable", sans-serif';
const INTER = '"Inter Variable", system-ui, sans-serif';
const CAVEAT = '"Caveat", "Inter Variable", cursive';
const MONO = '"JetBrains Mono Variable", ui-monospace, monospace';

export const DASHBOARD_THEMES: Record<DashboardThemeId, DashboardTheme> = {
  neon: {
    id: 'neon',
    background:
      'radial-gradient(900px 500px at 0% 0%, rgb(224 33 138 / .20), transparent 60%), radial-gradient(900px 600px at 100% 100%, rgb(0 240 255 / .14), transparent 60%), linear-gradient(rgb(0 240 255 / .05) 1px, transparent 1px) 0 0 / 40px 40px, linear-gradient(90deg, rgb(0 240 255 / .05) 1px, transparent 1px) 0 0 / 40px 40px, #06070E',
    frame: { boxShadow: 'inset 0 0 0 1px rgb(0 240 255 / .35), inset 0 0 80px rgb(0 240 255 / .06)' },
    panel: { background: 'rgb(15 18 38 / .82)', border: '1px solid rgb(0 240 255 / .22)', clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' },
    ink: '#E8F7FF',
    muted: '#93A6CC',
    grid: 'rgb(255 255 255 / .08)',
    accent: '#FF2E88',
    headingFont: RAJDHANI,
    numberFont: RAJDHANI,
    bodyFont: INTER,
    sketch: false,
    status: DARK_STATUS,
    created: '#3987e5',
    completed: '#199e70',
    swatch: ['#06070E', '#00F0FF', '#FF2E88'],
  },
  whiteboard: {
    id: 'whiteboard',
    background: 'radial-gradient(1200px 700px at 30% 20%, #ffffff, #f2f2ec 70%), #F7F7F2',
    frame: { border: '14px solid #c9ccd1', boxShadow: 'inset 0 0 0 2px #e9ebee, 0 0 0 1px #9aa0a6' },
    panel: { background: 'transparent', border: '2.5px solid #1F2328', borderRadius: '14px 18px 12px 16px' },
    ink: '#1F2328',
    muted: '#52514e',
    grid: 'rgb(0 0 0 / .10)',
    accent: '#D3302F',
    headingFont: CAVEAT,
    numberFont: CAVEAT,
    bodyFont: INTER,
    sketch: true,
    status: LIGHT_STATUS,
    created: '#2a78d6',
    completed: '#1baf7a',
    swatch: ['#F7F7F2', '#1F2328', '#D3302F'],
  },
  chalkboard: {
    id: 'chalkboard',
    background:
      'radial-gradient(800px 500px at 20% 30%, rgb(255 255 255 / .06), transparent 60%), radial-gradient(700px 400px at 80% 70%, rgb(255 255 255 / .05), transparent 60%), #1F3B2D',
    frame: { border: '16px solid #6B4A2B', boxShadow: 'inset 0 0 0 3px #4a321c, inset 0 0 90px rgb(0 0 0 / .35)' },
    panel: { background: 'rgb(255 255 255 / .03)', border: '2px solid rgb(244 241 232 / .55)', borderRadius: '10px 14px 9px 12px' },
    ink: '#F4F1E8',
    muted: '#C9D3C5',
    grid: 'rgb(255 255 255 / .12)',
    accent: '#F6E27A',
    headingFont: CAVEAT,
    numberFont: CAVEAT,
    bodyFont: INTER,
    sketch: true,
    status: DARK_STATUS,
    created: '#3987e5',
    completed: '#199e70',
    swatch: ['#1F3B2D', '#F4F1E8', '#F6E27A'],
  },
  executive: {
    id: 'executive',
    background: '#FFFFFF',
    frame: { boxShadow: 'inset 0 0 0 1px #E5E7EB' },
    panel: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px' },
    ink: '#111827',
    muted: '#4B5563',
    grid: '#E5E7EB',
    accent: '#111827',
    headingFont: INTER,
    numberFont: INTER,
    bodyFont: INTER,
    sketch: false,
    status: LIGHT_STATUS,
    created: '#2a78d6',
    completed: '#1baf7a',
    swatch: ['#FFFFFF', '#111827', '#2a78d6'],
  },
  blueprint: {
    id: 'blueprint',
    background:
      'linear-gradient(rgb(255 255 255 / .10) 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(90deg, rgb(255 255 255 / .10) 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(rgb(255 255 255 / .18) 1px, transparent 1px) 0 0 / 100px 100px, linear-gradient(90deg, rgb(255 255 255 / .18) 1px, transparent 1px) 0 0 / 100px 100px, #0F3B6E',
    frame: { boxShadow: 'inset 0 0 0 2px rgb(255 255 255 / .6), inset 0 0 0 8px #0F3B6E, inset 0 0 0 9px rgb(255 255 255 / .35)' },
    panel: { background: 'rgb(15 59 110 / .7)', border: '1.5px dashed rgb(255 255 255 / .55)' },
    ink: '#FFFFFF',
    muted: '#C7DBF2',
    grid: 'rgb(255 255 255 / .18)',
    accent: '#F6E27A',
    headingFont: MONO,
    numberFont: MONO,
    bodyFont: INTER,
    sketch: false,
    status: DARK_STATUS,
    created: '#3987e5',
    completed: '#199e70',
    swatch: ['#0F3B6E', '#FFFFFF', '#F6E27A'],
  },
};

export const THEME_ORDER: DashboardThemeId[] = ['neon', 'whiteboard', 'chalkboard', 'executive', 'blueprint'];
