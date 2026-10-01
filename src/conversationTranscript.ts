/**
 * Transkrip percakapan sebagai berkas CSV (tiket 08): satu baris per pesan
 * teks, agar riwayat percakapan dapat dibuka pemilik di Excel/Google Sheets.
 * Ini catatan tambahan di sisi proses — bukan pengganti balasan, handoff ke
 * admin, maupun riwayat konteks percakapan.
 *
 * Seam ini sengaja tetap di luar seam percakapan (`handleInbound`), seperti
 * metrik dan kanal admin: perilaku percakapan tidak berubah.
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ConversationTurn } from "./conversation/types.ts";

/**
 * Lokasi default di root repo. `data/` diabaikan git karena memuat data
 * pribadi (nomor + isi pesan). Belum ada variabel konfigurasi: path ini cukup
 * sampai muncul kebutuhan nyata untuk memindahkannya.
 */
export const DEFAULT_CONVERSATION_TRANSCRIPT_PATH = fileURLToPath(
  new URL("../data/transkrip-percakapan.csv", import.meta.url),
);

/** Peran baris transkrip, sama dengan peran giliran percakapan. */
export type ConversationRole = ConversationTurn["role"];

/** Satu pesan teks yang dicatat; `at` disimpan sebagai waktu WIB. */
export interface TranscriptEntry {
  readonly at: Date;
  /** Nomor calon jemaah dalam format E.164 tanpa tanda '+'. */
  readonly number: string;
  readonly role: ConversationRole;
  readonly text: string;
}

export interface ConversationTranscript {
  /**
   * Catat satu pesan. Boleh melempar (mis. berkas tidak dapat ditulis);
   * pemanggil yang menjaga agar balasan bot tidak ikut gagal.
   */
  record(entry: TranscriptEntry): void;
}

const HEADER_FIELDS = ["waktu", "nomor", "peran", "pesan"] as const;
const BOM = "\uFEFF";
const CRLF = "\r\n";

/**
 * Transkrip CSV aman untuk Excel: UTF-8 dengan BOM, akhir baris CRLF, dan
 * escaping RFC 4180 (koma, tanda kutip, dan baris baru di dalam pesan).
 * Berkas dibuat otomatis beserta headernya; pesan berikutnya ditulis append.
 */
export class CsvConversationTranscript implements ConversationTranscript {
  private readonly path: string;

  constructor(path: string = DEFAULT_CONVERSATION_TRANSCRIPT_PATH) {
    this.path = path;
  }

  record(entry: TranscriptEntry): void {
    if (!existsSync(this.path)) {
      mkdirSync(dirname(this.path), { recursive: true });
      appendFileSync(this.path, BOM + HEADER_FIELDS.join(",") + CRLF, "utf8");
    }
    const fields = [formatWibTime(entry.at), entry.number, entry.role, entry.text];
    appendFileSync(this.path, fields.map(escapeCsvField).join(",") + CRLF, "utf8");
  }
}

/** Waktu WIB (UTC+7) format `YYYY-MM-DD HH:MM:SS`, terlepas dari zona waktu proses. */
function formatWibTime(at: Date): string {
  const wib = new Date(at.getTime() + 7 * 60 * 60 * 1000);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())} ` +
    `${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())}:${pad(wib.getUTCSeconds())}`
  );
}

/** Bungkus dengan tanda kutip hanya bila perlu; kutip di dalam digandakan (RFC 4180). */
function escapeCsvField(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replaceAll('"', '""')}"`;
}
