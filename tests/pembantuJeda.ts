/**
 * JedaStore palsu untuk tes: menerapkan efek di memori dan merekam panggilan,
 * sehingga tes perintah admin dapat memastikan efeknya lewat port state jeda
 * (tiket 01) tanpa menyentuh `data/jeda-state.json` nyata.
 */

import type { JedaSnapshot, JedaStore } from "../src/jedaStore.ts";

/** Waktu mulai jeda yang dapat diprediksi di tes. */
export const MULAI_JEDA = new Date("2026-10-10T03:00:00.000Z");

export interface OpsiJedaPalsu {
  readonly now?: () => Date;
  readonly globallyPaused?: boolean;
  readonly dijeda?: readonly string[];
  readonly lastHandoffContact?: string | null;
}

export class JedaStorePalsu implements JedaStore {
  private readonly paused = new Map<string, Date>();
  private globallyPaused: boolean;
  private lastHandoffContact: string | null;
  private readonly now: () => Date;
  /** Riwayat panggilan, untuk memastikan state tidak berubah saat perintah ditolak. */
  readonly panggilan: string[] = [];

  constructor(opsi: OpsiJedaPalsu = {}) {
    this.now = opsi.now ?? (() => MULAI_JEDA);
    this.globallyPaused = opsi.globallyPaused ?? false;
    for (const nomor of opsi.dijeda ?? []) {
      this.paused.set(nomor, this.now());
    }
    this.lastHandoffContact = opsi.lastHandoffContact ?? null;
  }

  pauseContact(nomor: string): void {
    this.panggilan.push(`pauseContact:${nomor}`);
    if (!this.paused.has(nomor)) {
      this.paused.set(nomor, this.now());
    }
  }

  resumeContact(nomor: string): void {
    this.panggilan.push(`resumeContact:${nomor}`);
    this.paused.delete(nomor);
  }

  pauseGlobally(): void {
    this.panggilan.push("pauseGlobally");
    this.globallyPaused = true;
  }

  resumeGlobally(): void {
    this.panggilan.push("resumeGlobally");
    this.globallyPaused = false;
  }

  isPaused(nomor: string): boolean {
    return this.globallyPaused || this.paused.has(nomor);
  }

  snapshot(): JedaSnapshot {
    return {
      globallyPaused: this.globallyPaused,
      pausedContacts: [...this.paused.entries()]
        .map(([number, since]) => ({ number, since }))
        .sort((a, b) => a.since.getTime() - b.since.getTime() || a.number.localeCompare(b.number)),
      lastHandoffContact: this.lastHandoffContact,
    };
  }

  setLastHandoffContact(nomor: string): void {
    this.panggilan.push(`setLastHandoffContact:${nomor}`);
    this.lastHandoffContact = nomor;
  }
}
