import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getBoard } from '../features/board/boardStore';
import { isDesktop, notify } from './platform';
import { toast } from './toast';
import { t } from '../i18n';

const NOTIFIED_KEY = 'dagcan.notified.v1';

/** Kullanıcı etkinliğini kasa boşta-kilit sayacına bildirir (20 sn'de bir en fazla). */
export function useIdleTouch() {
  useEffect(() => {
    if (!isDesktop) return;
    let last = 0;
    const touch = () => {
      const now = Date.now();
      if (now - last < 20_000) return;
      last = now;
      invoke('vault_touch').catch(() => {});
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'mousemove'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const unlisten = listen('clipboard-cleared', () => toast(t('vault.clipboardCleared')));
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      unlisten.then((f) => f());
    };
  }, []);
}

/** Son tarihi 24 saat içinde olan veya geçmiş görevler için bir kez yerel OS bildirimi gönderir. */
export function useDueReminders() {
  useEffect(() => {
    const check = () => {
      let sent: string[] = [];
      try {
        sent = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]');
      } catch {
        sent = [];
      }
      const now = Date.now();
      const due = getBoard().tasks.filter((t) => {
        if (!t.dueDate || t.status === 'done') return false;
        const ms = new Date(`${t.dueDate}T09:00:00`).getTime() - now;
        return ms < 24 * 3_600_000 && !sent.includes(`${t.id}:${t.dueDate}`);
      });
      for (const task of due) {
        const overdue = new Date(`${task.dueDate}T23:59:59`).getTime() < now;
        notify(overdue ? t('notify.overdue', { key: task.key }) : t('notify.upcoming', { key: task.key }), t('notify.openApp'));
        sent.push(`${task.id}:${task.dueDate}`);
      }
      if (due.length) localStorage.setItem(NOTIFIED_KEY, JSON.stringify(sent.slice(-500)));
    };
    const first = setTimeout(check, 3000);
    const timer = setInterval(check, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
}
