import { Percakapan, setujuiPermintaanTindakLanjut } from "../../tests/conversation/pembantuPercakapan.ts";
import { formatAdminHandoff } from "../../src/adminChannel.ts";
for (const pesan of ["anak saya sudah bisa", "nanti saya kabari kalau sudah bisa", "ga bisa"]) {
  const p = new Percakapan();
  const awal = p.kirim(pesan);
  const req = setujuiPermintaanTindakLanjut(p);
  const teks = formatAdminHandoff({ from: "628123456789", reason: "follow-up-request", request: req });
  console.log("== ", JSON.stringify(pesan));
  console.log("  reply:", awal.reply.text.slice(0, 90).replace(/\n/g, " | "));
  console.log("  noted:", JSON.stringify(req.notedQuestions));
  console.log("  admin baris:", teks.split("\n").filter(l => l.includes("Pertanyaan yang dicatat")).join(" ~ "));
}
