# Label triase

Skill menggunakan label triase kanonis berikut. Nama label di direktori ini sama dengan nama perannya, dan hanya label ini yang boleh muncul pada baris `Status:` sebuah tiket.

| Peran kanonis | Label | Arti |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer perlu mengevaluasi isu ini |
| `needs-info` | `needs-info` | Menunggu informasi tambahan dari pelapor |
| `ready-for-agent` | `ready-for-agent` | Spesifikasi sudah cukup lengkap untuk dikerjakan agent |
| `ready-for-human` | `ready-for-human` | Memerlukan implementasi oleh manusia |
| `wontfix` | `wontfix` | Tidak akan ditindaklanjuti |
| `resolved` | `resolved` | Tiket selesai: seluruh kriteria tercentang dan tidak ada tindakan terbuka tersisa |

Jika skill menyebut sebuah peran—misalnya label siap dikerjakan agent—gunakan label yang sesuai pada tabel ini.

Gunakan `resolved` sebagai satu-satunya status akhir. Jangan menandai tiket selesai dengan `done` atau `completed`: kata itu tidak ada dalam tabel ini sehingga tiket yang memakainya akan terbaca sebagai status yang tidak dikenal.
