import { invoke } from '@tauri-apps/api/core';
import { t, type MessageKey } from '../../i18n';

export type ItemKind = 'password' | 'server' | 'script' | 'note' | 'api_key';

export const ITEM_KINDS: ItemKind[] = ['password', 'server', 'script', 'note', 'api_key'];
export const kindLabel = (k: ItemKind) => t(`vault.kind.${k}` as MessageKey);

/** Kriptografik olarak güvenli, sapmasız (rejection sampling) parola üretici. */
export function generatePassword(length = 24, symbols = true): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' + (symbols ? '!@#$%^&*()-_=+[]{};:,.?' : '');
  const limit = 256 - (256 % alphabet.length);
  const out: string[] = [];
  const buf = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < limit && out.length < length) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join('');
}

export interface VaultStatus {
  initialized: boolean;
  unlocked: boolean;
  autoLockMinutes: number;
}

export interface VaultItem {
  id: string;
  kind: ItemKind;
  title: string;
  username?: string | null;
  host?: string | null;
  notes?: string | null;
  tags: string[];
  updatedAt: number;
}

export interface VaultItemInput {
  id?: string;
  kind: ItemKind;
  title: string;
  username?: string;
  host?: string;
  /** Güncellemede boş bırakılırsa mevcut gizli değer korunur. */
  secret?: string;
  notes?: string;
  tags: string[];
}

// Tüm kriptografi Rust tarafında; bu modül sadece ince bir IPC katmanıdır.
export const vault = {
  status: () => invoke<VaultStatus>('vault_status'),
  init: (password: string) => invoke<void>('vault_init', { password }),
  unlock: (password: string) => invoke<void>('vault_unlock', { password }),
  lock: () => invoke<void>('vault_lock'),
  touch: () => invoke<void>('vault_touch'),
  setAutoLock: (minutes: number) => invoke<void>('vault_set_auto_lock', { minutes }),
  list: () => invoke<VaultItem[]>('vault_list'),
  upsert: (input: VaultItemInput) => invoke<string>('vault_upsert', { input }),
  remove: (id: string) => invoke<void>('vault_delete', { id }),
  reveal: (id: string) => invoke<string>('vault_reveal', { id }),
  copy: (id: string) => invoke<number>('vault_copy', { id }),
  exportBackup: () => invoke<string>('vault_export_backup'),
};
