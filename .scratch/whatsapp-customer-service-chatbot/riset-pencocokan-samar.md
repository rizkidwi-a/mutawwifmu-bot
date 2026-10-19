# Riset: Pencocokan Samar vs Model Klasifikasi

Status: temuan riset (bukan ADR). Ditulis untuk menjawab pertanyaan pemilik:
*"apakah opsi B (lapisan pencocokan samar) sama dengan implementasi model klasifikasi yang baru?"*

Metode: pencarian sumber primer lewat agent-reach (backend Exa), 4 topik, 2026-10-07.

## Jawaban singkat

**Tidak sama**, tetapi keduanya berada pada satu spektrum. Yang membedakan adalah
**apakah ada bobot yang dilatih dari data**. Opsi B versi aturan-statistik **bukan**
model klasifikasi; hanya sub-varian berbasis embedding yang **memang** model klasifikasi.

## Landasan: tiga kelas teknik yang berbeda

### 1. Metrik string & automata — bukan model, murni algoritma

Levenshtein distance adalah **string metric**, dihitung deterministik tanpa data latih:

> "The Levenshtein distance between two words is the minimal number of insertions,
> deletions or substitutions that are needed to transform one word into the other."
> — Schulz & Mihov, *Fast String Correction with Levenshtein Automata* (2002)
> <https://dmice.ohsu.edu/bedricks/courses/cs655/pdf/readings/2002_Schulz.pdf>

> "A Levenshtein automaton is a **finite-state machine** that recognizes exactly the
> strings lying within a specified Levenshtein distance of a fixed pattern."
> — <https://www.levenshtein.net/levenshtein-automata>

Sifatnya: deterministik, dapat diaudit, tanpa pembelajaran. **Bukan model klasifikasi.**

### 2. Stemming bahasa Indonesia — juga aturan, bukan model

Algoritma Nazief & Adriani dirancang sebagai **stemmer berbasis aturan murni**:

> "A Purely Rule-based Stemmer for Bahasa Indonesia"
> — <https://www.illc.uva.nl/Publications/ResearchReports/MoL-2003-02.text.pdf>

Implementasi siap pakai tersedia (mis. `katadasaR` untuk R:
<https://github.com/nurandi/katadasaR>), dan perbandingan performanya sudah dipelajari
dibanding metode n-gram (<https://kc.umn.ac.id/id/eprint/1675/>).

Relevansi: bot ini dwibahasa ID/EN. Tanpa stemming, kata seperti *memesan / pesan /
pemesanan* dianggap token berbeda, sehingga pola regex harus mendaftarkan semuanya
manual. Stemming aturan menyelesaikan itu tanpa menambah model.

### 3. Model klasifikasi intent — ini yang memang "model"

Literatur menyebutnya eksplisit sebagai **klasifikasi terlatih**:

- fastText + neural network classifier:
  <https://www.mdpi.com/2078-2489/10/5/161> — *"intent detection system that is based
  on fastText word embeddings and a neural network classifier"*
- BERT embedding + contrastive learning untuk few-shot:
  <https://aclanthology.org/2023.acl-industry.71.pdf>
- Zero/few-shot dengan LLM:
  <https://arxiv.org/pdf/2305.07157>

Kelas ini **butuh bobot hasil latih** (atau model pralatih berat). Ini yang dimaksud
"implementasi model klasifikasi yang baru".

### 4. Pembeda leksikal vs semantik (retrieval)

Survei IR membedakan dua kelas secara eksplisit:

> "Information retrieval systems have progressed notably **from lexical techniques such
> as BM25 and TF-IDF** to modern **semantic retrievers**."
> — <https://ar5iv.labs.arxiv.org/html/2508.17694>

BM25/TF-IDF = **leksikal/statistik**, dihitung dari korpus, tanpa latihan.
Embedding BERT-style = **padat/terlatih**.

> "how sparse retrieval (BM25/TF-IDF), dense retrieval (BERT-style embeddings), and
> hybrid systems ... compare on recall, semantic understanding, computational cost,
> and operational complexity"
> — <https://www.abhik.ai/concepts/embeddings/sparse-vs-dense>

## Peta opsi terhadap pertanyaan pemilik

| Sub-opsi | Teknik | Model klasifikasi? | Data latih | Deterministik | Dependency |
| --- | --- | --- | --- | --- | --- |
| **B1** | Normalisasi token + stemming Nazief-Adriani + sinonim manual + edit distance/trigram | ❌ **Bukan** | Tidak perlu | Ya | Bisa nol |
| **B2** | Skoring TF-IDF / BM25 cosine antar entri FAQ | ❌ **Bukan** (statistik korpus) | Tidak perlu | Ya | Kecil / bisa nol |
| **B3** | Sentence embedding / fastText / LLM zero-shot | ✅ **Ya** | Umumnya perlu | Probabilistik | Berat |

Catatan jujur: B2 berada di **zona abu-abu** — membangun ruang vektor dari korpus,
sehingga sebagian orang menyebutnya "model" kecil. Yang jelas **bukan** model
klasifikasi adalah B1. Yang **jelas** model klasifikasi adalah B3.

## Implikasi untuk proyek ini

ADR-0002 memilih runtime tanpa dependency, ADR-0004 melarang bot mengarang fakta,
dan ADR-0005 sengaja menyempitkan pola harga demi keselamatan.

- **B1 lolos seluruh ketiga kendala itu** — jawaban tetap ditulis manual dari materi,
  yang berubah hanya cara *pencocokannya*; tetap deterministik dan dapat diuji.
- **B2 masih lolos**, dengan catatan ambang skor harus diuji agar tidak salah pilih topik.
- **B3 melanggar ADR-0002 dan butuh ADR baru** (dipersyaratkan eksplisit oleh ADR-0004),
  plus risiko halusinasi angka harga yang justru dihindari ADR-0005.

## Rekomendasi

B1 → B2 → baru pertimbangkan B3. Kasus nyata yang menunjukkan kebutuhan ini:
pesan **"boleh minta pricelist?"** tidak dikenali karena `PRICE_WORD` memakai
`\bprices?\b` dan `pricelist` tidak punya word boundary setelah *price*.
B1 akan menangani kasus itu tanpa menyentuh ADR mana pun.

## Sumber

1. Schulz & Mihov (2002), *Fast String Correction with Levenshtein Automata* — <https://dmice.ohsu.edu/bedricks/courses/cs655/pdf/readings/2002_Schulz.pdf>
2. Levenshtein Automata: Finite-State Fuzzy String Matching — <https://www.levenshtein.net/levenshtein-automata>
3. *A Study of Stemming Effects on Information Retrieval in Bahasa Indonesia* — <https://www.illc.uva.nl/Publications/ResearchReports/MoL-2003-02.text.pdf>
4. Nazief and Adriani Algorithm (implementasi) — <https://audhiaprilliant.github.io/nazief-and-adriani-algorithm/>
5. katadasaR, stemming Bahasa Indonesia — <https://github.com/nurandi/katadasaR>
6. Perbandingan algoritma stemming — <https://kc.umn.ac.id/id/eprint/1675/>
7. FastText-Based Intent Detection for Inflected Languages — <https://www.mdpi.com/2078-2489/10/5/161>
8. Zero & Few-shot Intent Classification — <https://aclanthology.org/2023.acl-industry.71.pdf>
9. Data-scarce intent detection — <https://arxiv.org/pdf/2305.07157>
10. Semantic Search for Information Retrieval (survei) — <https://ar5iv.labs.arxiv.org/html/2508.17694>
11. Sparse vs Dense vs Hybrid Retrieval — <https://www.abhik.ai/concepts/embeddings/sparse-vs-dense>
