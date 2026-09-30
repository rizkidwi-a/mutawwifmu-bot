/**
 * Entry point `npm run cutover:check`: menilai kesiapan konfigurasi sebelum
 * cutover ke nomor produksi dan mencetak laporannya. Keluar dengan kode 1 bila
 * belum siap, sehingga dapat dipakai sebagai gate manual dalam runbook cutover
 * (lihat docs/whatsapp-number-cutover.md).
 */

import { evaluateCutoverReadiness, formatCutoverReadiness } from "./cutoverPreflight.ts";

const readiness = evaluateCutoverReadiness(process.env);
console.log(formatCutoverReadiness(readiness));
process.exitCode = readiness.ready ? 0 : 1;
