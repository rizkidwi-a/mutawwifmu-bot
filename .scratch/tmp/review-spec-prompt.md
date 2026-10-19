You are the **Spec** reviewer in a two-axis code review. Repo: C:\Users\Advan\.ab\chatbot (the current directory).

Review the uncommitted work-in-progress diff: run `git diff HEAD` (HEAD = 2b0a6a3) and `git status --short` to include untracked files `tests/korpus/topik-gap.json` and `tests/conversation/topikGapHandoff.test.ts` (read them directly because git diff won't show untracked files). Ignore `.scratch/tmp/*` (throwaway probe scripts).

The originating spec is ticket 10:
- `.scratch/lead-intake/issues/10-materi-gap-dari-transkrip.md` — read it fully, including the "Keputusan pemilik" and "Implementasi" sections in Comments (the owner decided all 10 topics stay `handoff` and chose option (i): non-urgent questions as the first message enter intake first, get recorded as needs, and appear on the Ringkasan Kebutuhan sent to admin).
Related context to read for the intended behaviour:
- `.scratch/lead-intake/spec.md` (feature spec; testing decisions and invariants)
- `docs/adr/0009-fokus-intake-kebutuhan.md` (intake is the main flow; non-price questions are noted, not answered)
- `docs/adr/0005-harga-indikatif-penyempitan-pola-harga.md` (pricing/availability rules)
- `docs/adr/0010-handoff-admin-tanpa-riwayat.md` (handoff payload)
- `.scratch/pencocokan-korpus-transkrip/analisis.md` (source analysis: 10 gap topics)
- `tests/korpus/transkrip-nyata.json` (real messages per topic)

Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words. Do not modify any file.
