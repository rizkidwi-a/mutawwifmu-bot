/**
 * Perintah kendali bot dari pesan WhatsApp masuk (tiket 02): pengenalan teks
 * (`#jeda`, `#lanjut`, `#bot on/off`, `#status`) dan penerapan efeknya lewat
 * port state jeda (`src/jedaStore.ts`).
 *
 * Modul ini berada di layer server, **di luar** seam percakapan: perintah
 * hanya diterima dari nomor admin (diputuskan di `src/server.ts`) dan tidak
 * pernah memanggil `handleInbound`. Pesan berawalan `#` dari nomor lain tetap
 * diproses sebagai pesan biasa oleh pemanggil.
 */

import { normalizePhoneNumber } from "./config.ts";
import { formatWibTime } from "./conversationTranscript.ts";
import type { JedaStore } from "./jedaStore.ts";

/** Perintah admin yang dikenali; `nomor` masih mentah dan dinormalisasi saat diterapkan. */
export type AdminCommand =
  /** Jeda satu kontak; `nomor` null berarti pakai kontak handoff terakhir. */
  | { readonly kind: "jeda"; readonly nomor: string | null }
  /** Akhiri jeda satu kontak. */
  | { readonly kind: "lanjut"; readonly nomor: string }
  /** Nonaktif Sementara global. */
  | { readonly kind: "bot-off" }
  /** Aktifkan kembali balasan otomatis. */
  | { readonly kind: "bot-on" }
  /** Ringkasan status global + kontak dijeda. */
  | { readonly kind: "status" };

/** Balasan saat nomor pada parameter tidak lolos normalisasi E.164. */
export const PESAN_NOMOR_TIDAK_VALID =
  "Nomor tidak valid. Kirim nomor format E.164 tanpa tanda +, mis: #jeda 628123456789";

/** Daftar perintah; dibalas saat admin mengirim `#` yang tidak dikenal. */
export const DAFTAR_PERINTAH_ADMIN = [
  "Perintah admin yang dikenali:",
  "#jeda <nomor> - jeda satu kontak (Ambil Alih)",
  "#jeda - jeda kontak handoff terakhir",
  "#lanjut <nomor> - akhiri jeda satu kontak",
  "#bot off - hentikan balasan otomatis untuk semua kontak",
  "#bot on - aktifkan kembali balasan otomatis",
  "#status - status Nonaktif Sementara + kontak yang dijeda",
].join("\n");

/** Apakah teks berpotensi perintah (berawalan `#`); dipakai untuk membalas daftar perintah. */
export function isCommandText(text: string | null): boolean {
  return typeof text === "string" && text.trimStart().startsWith("#");
}

/**
 * Urai teks menjadi perintah terstruktur. Mengembalikan null untuk teks yang
 * bukan perintah maupun perintah tak dikenal/berargumen salah, sehingga
 * pemanggil dapat membedakan keduanya lewat `isCommandText`.
 */
export function parseAdminCommand(text: string | null): AdminCommand | null {
  if (!isCommandText(text)) {
    return null;
  }
  const tokens = (text as string).trim().split(/\s+/);
  const kata = tokens[0]!.toLowerCase();
  switch (kata) {
    case "#jeda":
      if (tokens.length === 1) {
        return { kind: "jeda", nomor: null };
      }
      return tokens.length === 2 ? { kind: "jeda", nomor: tokens[1]! } : null;
    case "#lanjut":
      return tokens.length === 2 ? { kind: "lanjut", nomor: tokens[1]! } : null;
    case "#bot": {
      if (tokens.length !== 2) {
        return null;
      }
      const argumen = tokens[1]!.toLowerCase();
      if (argumen === "off") {
        return { kind: "bot-off" };
      }
      return argumen === "on" ? { kind: "bot-on" } : null;
    }
    case "#status":
      return tokens.length === 1 ? { kind: "status" } : null;
    default:
      return null;
  }
}

/** Konteks penerapan perintah; sengaja hanya port state jeda agar dapat diuji palsu. */
export interface AdminCommandContext {
  readonly store: JedaStore;
}

/**
 * Terapkan perintah lewat port state jeda dan kembalikan balasan singkat untuk
 * nomor admin. Nomor tidak valid tidak mengubah state; balasan tidak pernah
 * menjanjikan waktu balasan admin.
 */
export function applyAdminCommand(command: AdminCommand, ctx: AdminCommandContext): string {
  switch (command.kind) {
    case "jeda":
      return jedaKontak(command.nomor, ctx.store);
    case "lanjut":
      return lanjutKontak(command.nomor, ctx.store);
    case "bot-off":
      ctx.store.pauseGlobally();
      return "Nonaktif Sementara aktif: bot berhenti membalas semua kontak sampai dikirim: #bot on";
    case "bot-on":
      ctx.store.resumeGlobally();
      return "Balasan otomatis aktif kembali.";
    case "status":
      return statusJeda(ctx.store);
  }
}

function jedaKontak(parameter: string | null, store: JedaStore): string {
  if (parameter === null) {
    const terakhir = store.snapshot().lastHandoffContact;
    if (terakhir === null) {
      return "Belum ada kontak handoff terakhir. Kirim nomornya, mis: #jeda 628123456789";
    }
    return terapkanJeda(terakhir, store);
  }
  const nomor = normalizeOpsional(parameter);
  if (nomor === null) {
    return PESAN_NOMOR_TIDAK_VALID;
  }
  return terapkanJeda(nomor, store);
}

function terapkanJeda(nomor: string, store: JedaStore): string {
  store.pauseContact(nomor);
  // Kontak yang baru dijeda menjadi kontak handoff terakhir, sehingga `#jeda`
  // tanpa nomor berikutnya menunjuk kontak yang sama.
  store.setLastHandoffContact(nomor);
  return `Kontak ${nomor} dijeda. Bot berhenti membalas kontak ini sampai dikirim: #lanjut ${nomor}`;
}

function lanjutKontak(parameter: string, store: JedaStore): string {
  const nomor = normalizeOpsional(parameter);
  if (nomor === null) {
    return PESAN_NOMOR_TIDAK_VALID;
  }
  store.resumeContact(nomor);
  return `Jeda kontak ${nomor} diakhiri. Bot kembali membalas kontak ini.`;
}

function statusJeda(store: JedaStore): string {
  const status = store.snapshot();
  const baris = [
    `Nonaktif Sementara: ${status.globallyPaused ? "aktif" : "tidak aktif"}`,
    `Kontak dijeda: ${status.pausedContacts.length}`,
  ];
  for (const kontak of status.pausedContacts) {
    baris.push(`- ${kontak.number} (sejak ${formatWibTime(kontak.since)} WIB)`);
  }
  if (status.lastHandoffContact !== null) {
    baris.push(`Kontak handoff terakhir: ${status.lastHandoffContact}`);
  }
  return baris.join("\n");
}

/** Normalisasi E.164 ketat seperti `normalizePhoneNumber`; null bila tidak valid. */
function normalizeOpsional(raw: string): string | null {
  try {
    return normalizePhoneNumber(raw);
  } catch {
    return null;
  }
}
