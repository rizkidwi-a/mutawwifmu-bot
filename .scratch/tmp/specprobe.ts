import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
const pesan = [
  "anak saya sudah bisa",
  "nanti saya kabari kalau sudah bisa",
  "uang muka sudah saya transfer",
  "saya sudah termasuk keluarga 4 orang",
  "vaksin meningitis wajib ga",
  "pilih paket yang bagus", // not ending tag
  "kita berangkat tanggal 15",
  "sudah bisa",
  "kalau upgrade armada boleh",
  "hotelnya aman",
  "ga bisa",
  "apakah hotelnya bagus",
  "saya mau umroh", 
];
for (const p of pesan) {
  const r = classifyInbound(p);
  console.log(JSON.stringify(p), "->", r.kind, "trigger" in r ? (r as {trigger:string}).trigger : "");
}
