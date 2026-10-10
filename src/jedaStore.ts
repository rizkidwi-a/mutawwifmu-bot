/**
 * Port state Jeda Percakapan (tiket 01): daftar kontak yang sedang dijeda
 * beserta waktu mulai, status Nonaktif Sementara global, dan kontak handoff
 * terakhir. Implementasi berkas menyimpan state di `data/jeda-state.json`
 * sehingga bertahan saat proses restart.
 *
 * Seam ini provider-agnostic dan berada di luar seam percakapan: perilaku
 * `handleInbound` tidak berubah. Kegagalan I/O dicatat ke log proses dan tidak
 * dilempar ke jalur balasan (best-effort, pola transkrip CSV tiket 08).
 *
 * Keputusan sadar: berkas korup/tidak ada -> mulai dari state kosong dengan
 * peringatan, bukan fail-closed (lihat `.scratch/jeda-ambil-alih/issues/01`).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePhoneNumber } from "./config.ts";

/**
 * Lokasi default di root repo. `data/` diabaikan git karena memuat data
 * pribadi (nomor + isi percakapan).
 */
export const DEFAULT_JEDA_STATE_PATH = fileURLToPath(
  new URL("../data/jeda-state.json", import.meta.url),
);

/** Satu kontak yang sedang dijeda, beserta waktu mulai Jeda Percakapan. */
export interface PausedContact {
  /** Nomor E.164 tanpa tanda '+', hasil `normalizePhoneNumber`. */
  readonly number: string;
  /** Waktu mulai jeda; hanya untuk ditampilkan `#status`, bukan kadaluarsa. */
  readonly since: Date;
}

/** Ringkasan status jeda: global, per kontak, dan kontak handoff terakhir. */
export interface JedaSnapshot {
  /** Nonaktif Sementara global: bot diam untuk semua kontak. */
  readonly globallyPaused: boolean;
  /** Kontak yang sedang dijeda, urut waktu mulai. */
  readonly pausedContacts: readonly PausedContact[];
  /** Kontak handoff terakhir (#jeda tanpa nomor); null bila belum ada. */
  readonly lastHandoffContact: string | null;
}

/** Operasi state jeda; provider-agnostik dan sinkron seperti store lain. */
export interface JedaStore {
  /** Mulai Jeda Percakapan untuk satu kontak (idempoten). */
  pauseContact(nomor: string): void;
  /** Akhiri Jeda Percakapan untuk satu kontak (idempoten). */
  resumeContact(nomor: string): void;
  /** Nonaktif Sementara global: bot diam untuk semua kontak (idempoten). */
  pauseGlobally(): void;
  /** Aktifkan kembali balasan otomatis (idempoten). */
  resumeGlobally(): void;
  /** Apakah bot harus diam untuk nomor ini (jeda kontak atau global). */
  isPaused(nomor: string): boolean;
  /** Status lengkap untuk `#status`. */
  snapshot(): JedaSnapshot;
  /** Catat kontak handoff terakhir untuk `#jeda` tanpa nomor (idempoten). */
  setLastHandoffContact(nomor: string): void;
}

/** Injeksi yang menjaga tes deterministik tanpa menyentuh log proses. */
export interface FileJedaStoreOptions {
  /** Sumber waktu sekarang; default waktu sistem. */
  readonly now?: () => Date;
  /** Tujuan peringatan berkas korup dan kegagalan tulis; default log proses. */
  readonly warn?: (message: string, detail?: unknown) => void;
}

/**
 * State jeda dalam berkas JSON. Formatnya sengaja datar agar dapat dibaca dan
 * diperbaiki manual saat keadaan darurat.
 */
export class FileJedaStore implements JedaStore {
  private readonly path: string;
  private readonly now: () => Date;
  private readonly warn: (message: string, detail?: unknown) => void;
  private readonly paused = new Map<string, Date>();
  private globallyPaused = false;
  private lastHandoffContact: string | null = null;

  constructor(path: string = DEFAULT_JEDA_STATE_PATH, options: FileJedaStoreOptions = {}) {
    this.path = path;
    this.now = options.now ?? (() => new Date());
    this.warn =
      options.warn ??
      ((message, detail) => {
        if (detail === undefined) {
          console.warn(message);
        } else {
          console.warn(message, detail);
        }
      });
    this.load();
  }

  pauseContact(nomor: string): void {
    const number = normalizePhoneNumber(nomor);
    if (this.paused.has(number)) {
      return;
    }
    this.paused.set(number, this.now());
    this.persist();
  }

  resumeContact(nomor: string): void {
    const number = normalizePhoneNumber(nomor);
    if (!this.paused.delete(number)) {
      return;
    }
    this.persist();
  }

  pauseGlobally(): void {
    if (this.globallyPaused) {
      return;
    }
    this.globallyPaused = true;
    this.persist();
  }

  resumeGlobally(): void {
    if (!this.globallyPaused) {
      return;
    }
    this.globallyPaused = false;
    this.persist();
  }

  isPaused(nomor: string): boolean {
    return this.globallyPaused || this.paused.has(normalizePhoneNumber(nomor));
  }

  snapshot(): JedaSnapshot {
    const pausedContacts = [...this.paused.entries()]
      .map(([number, since]) => ({ number, since }))
      .sort((a, b) => a.since.getTime() - b.since.getTime() || a.number.localeCompare(b.number));
    return {
      globallyPaused: this.globallyPaused,
      pausedContacts,
      lastHandoffContact: this.lastHandoffContact,
    };
  }

  setLastHandoffContact(nomor: string): void {
    const number = normalizePhoneNumber(nomor);
    if (this.lastHandoffContact === number) {
      return;
    }
    this.lastHandoffContact = number;
    this.persist();
  }

  /**
   * Muat state dari berkas. Berkas belum ada = state kosong tanpa peringatan
   * (kondisi pertama kali). Berkas ada tetapi tidak dapat dibaca/rusak -> state
   * kosong dengan peringatan, bukan fail-closed.
   */
  private load(): void {
    if (!existsSync(this.path)) {
      return;
    }
    let raw: string;
    try {
      raw = readFileSync(this.path, "utf8");
    } catch (error) {
      this.warn("Pembacaan state jeda gagal, dimulai dari state kosong:", error);
      return;
    }
    try {
      const state = parseState(raw);
      for (const { number, since } of state.paused) {
        this.paused.set(number, since);
      }
      this.globallyPaused = state.globallyPaused;
      this.lastHandoffContact = state.lastHandoffContact;
    } catch (error) {
      this.paused.clear();
      this.globallyPaused = false;
      this.lastHandoffContact = null;
      this.warn("State jeda rusak, dimulai dari state kosong:", error);
    }
  }

  /** Tulis state best-effort: kegagalan I/O dicatat, tidak dilempar ke pemanggil. */
  private persist(): void {
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      writeFileSync(this.path, JSON.stringify(this.toJson(), null, 2) + "\n", "utf8");
    } catch (error) {
      this.warn("Penulisan state jeda gagal:", error);
    }
  }

  private toJson(): JedaStateJson {
    return {
      nonaktifGlobal: this.globallyPaused,
      dijeda: [...this.paused.entries()].map(([nomor, mulai]) => ({
        nomor,
        mulai: mulai.toISOString(),
      })),
      kontakHandoffTerakhir: this.lastHandoffContact,
    };
  }
}

/** Bentuk berkas `data/jeda-state.json`. */
interface JedaStateJson {
  readonly nonaktifGlobal: boolean;
  readonly dijeda: readonly { readonly nomor: string; readonly mulai: string }[];
  readonly kontakHandoffTerakhir: string | null;
}

/** State hasil pembacaan berkas, siap dipakai store. */
interface ParsedJedaState {
  readonly globallyPaused: boolean;
  readonly paused: readonly { readonly number: string; readonly since: Date }[];
  readonly lastHandoffContact: string | null;
}

/**
 * Baca dan validasi berkas state. Melempar bila bentuknya tidak sesuai;
 * pemanggil mengubahnya menjadi state kosong + peringatan.
 */
function parseState(raw: string): ParsedJedaState {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== "object" || value === null) {
    throw new Error("state jeda bukan objek");
  }
  const record = value as Record<string, unknown>;
  const nonaktifGlobal = record.nonaktifGlobal;
  const dijeda = record.dijeda;
  const kontakHandoffTerakhir = record.kontakHandoffTerakhir;
  if (typeof nonaktifGlobal !== "boolean") {
    throw new Error("field nonaktifGlobal bukan boolean");
  }
  if (!Array.isArray(dijeda)) {
    throw new Error("field dijeda bukan larik");
  }
  if (kontakHandoffTerakhir !== null && typeof kontakHandoffTerakhir !== "string") {
    throw new Error("field kontakHandoffTerakhir bukan string/null");
  }
  const paused = dijeda.map((entri: unknown) => {
    if (typeof entri !== "object" || entri === null) {
      throw new Error("entri dijeda bukan objek");
    }
    const { nomor, mulai } = entri as Record<string, unknown>;
    if (typeof nomor !== "string" || typeof mulai !== "string") {
      throw new Error("entri dijeda tidak memuat nomor/mulai");
    }
    const since = new Date(mulai);
    if (Number.isNaN(since.getTime())) {
      throw new Error(`waktu mulai jeda tidak valid: "${mulai}"`);
    }
    return { number: normalizePhoneNumber(nomor), since };
  });
  return {
    globallyPaused: nonaktifGlobal,
    paused,
    lastHandoffContact:
      kontakHandoffTerakhir === null ? null : normalizePhoneNumber(kontakHandoffTerakhir),
  };
}
