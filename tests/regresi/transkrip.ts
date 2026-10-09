/**
 * Pembaca transkrip percakapan WhatsApp di `data/` untuk tes regresi (tiket 06).
 *
 * Format yang didukung: ekspor `chat.md` dengan penanda `[jam] **pengirim:**`
 * (lihat `data/Vira Arman/chat.md`). Kutipan balasan (`> _..._`), pesan sistem,
 * dan placeholder media dibuang sehingga yang tersisa adalah pesan apa adanya
 * dari calon jemaah. `data/` tidak ter-versioning (berisi data pribadi), jadi
 * tes yang memakai berkas ini harus dilewati bila direktorinya tidak ada.
 */
import { readFileSync } from "node:fs";

/** Satu pesan dalam transkrip beserta pengirimnya apa adanya. */
export interface PesanTranskrip {
  readonly pengirim: string;
  readonly teks: string;
}

/** Nama pengirim untuk admin yang mengekspor chat pada berkas transkrip. */
const PENGIRIM_ADMIN = "You";

/** Parse satu berkas transkrip menjadi daftar pesan berurutan. */
export function parseTranskrip(jalur: string): PesanTranskrip[] {
  const baris = readFileSync(jalur, "utf8").split(/\r?\n/);
  const pesan: PesanTranskrip[] = [];
  let sekarang: { pengirim: string; baris: string[] } | null = null;
  const tutup = (): void => {
    if (sekarang) {
      pesan.push({ pengirim: sekarang.pengirim, teks: sekarang.baris.join("\n").trim() });
      sekarang = null;
    }
  };
  for (const barisPesan of baris) {
    const kepala = /^\[(\d{1,2}\.\d{2})\] \*\*(.+?):\*\*\s?(.*)$/.exec(barisPesan);
    if (kepala?.[2] !== undefined) {
      tutup();
      sekarang = { pengirim: kepala[2], baris: [kepala[3] ?? ""] };
      continue;
    }
    // Pesan sistem dan tanggal memutus blok pesan yang sedang berjalan.
    if (/^\[\d{1,2}\.\d{2}\]/.test(barisPesan) || /^(## |---)/.test(barisPesan)) {
      tutup();
      continue;
    }
    if (sekarang) {
      sekarang.baris.push(barisPesan);
    }
  }
  tutup();
  return pesan.map(buangKutipan).filter(pesanBermakna);
}

/** Pesan calon jemaah saja (tanpa balasan admin), teks apa adanya. */
export function pesanJemaah(jalur: string): string[] {
  return parseTranskrip(jalur)
    .filter((p) => p.pengirim !== PENGIRIM_ADMIN)
    .map((p) => p.teks);
}

/** Buang kutipan balasan (`> _..._`) sehingga hanya isi pesan yang tersisa. */
function buangKutipan(pesan: PesanTranskrip): PesanTranskrip {
  const hasil: string[] = [];
  let dalamKutip = false;
  for (const baris of pesan.teks.split("\n")) {
    if (baris.startsWith(">")) {
      dalamKutip = !baris.trimEnd().endsWith("_");
      continue;
    }
    if (dalamKutip) {
      if (baris.trimEnd().endsWith("_")) {
        dalamKutip = false;
      }
      continue;
    }
    hasil.push(baris);
  }
  return { pengirim: pesan.pengirim, teks: hasil.join("\n").trim() };
}

/** Pesan bermakna: bukan placeholder sistem/media dan bukan catatan pesan dihapus. */
function pesanBermakna(pesan: PesanTranskrip): boolean {
  return (
    pesan.teks.length > 0 &&
    !/^_{2}/.test(pesan.teks) &&
    !/deleted this message/.test(pesan.teks) &&
    !/doesn't support it/.test(pesan.teks)
  );
}
