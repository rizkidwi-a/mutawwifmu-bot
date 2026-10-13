#!/bin/bash
# Pemulihan akses SSH ke EC2 MUTAWWIFMU saat port 22 ter-DROP di dalam host.
#
# Konteks (12 Okt 2026): Security Group sudah mengizinkan tcp/22 dari
# 0.0.0.0/0, tetapi port 22 timeout dari mesin pemilik, dari 3 node luar, dan
# dari EC2 Instance Connect. Artinya paket di-drop SETELAH Security Group —
# yaitu oleh firewall di dalam host (paling mungkin ufw). Karena SSH/EIC
# sama-sama lewat port 22, satu-satunya jalan masuk adalah lewat user data
# yang dijalankan cloud-init saat boot.
#
# CARA PAKAI (semua di konsol AWS, perlu admin — user IAM `claude` read-only):
#   1. EC2 -> Instances -> pilih instance (ip-172-31-44-27) -> Instance state -> Stop
#   2. Actions -> Instance settings -> Edit user data -> tempel skrip ini -> Save
#   3. Instance state -> Start
#   4. Tunggu ~60 detik, lalu uji: ssh mutawwifmu 'ufw status verbose'
#
# Sifat skrip: idempoten, hanya MENAMBAH akses, tidak menghapus aturan apa pun,
# tidak menyentuh .env, tidak mengirim data pribadi. Log lokal:
# /var/log/ssh-recovery.log
#
# Catatan: skrip ini TIDAK menutup port 22 di Security Group. Setelah masuk,
# rapikan SG (buang 0.0.0.0/0, sisakan IP Anda + prefix list EC2 Instance
# Connect), lalu hapus user data ini supaya tidak jalan lagi tiap boot.

exec >/var/log/ssh-recovery.log 2>&1
set -x
date -u

echo "===== SEBELUM ====="
command -v ufw >/dev/null 2>&1 && ufw status verbose || echo "ufw: tidak terpasang"
systemctl is-active ssh 2>/dev/null || true
systemctl is-active sshd 2>/dev/null || true
systemctl is-active fail2ban 2>/dev/null || true
ss -tlpn | grep -F ':22' || echo "TIDAK ADA listener di :22"
iptables -S | head -60
iptables -t nat -S 2>/dev/null | head -20

echo "===== PERBAIKAN ====="
# 1. Jaring pengaman: ACCEPT tcp/22 di posisi paling atas chain INPUT, supaya
#    tetap masuk walau ada aturan DROP lain. Tidak persisten (hilang saat
#    reboot) — cukup untuk masuk dan memperbaiki aturan permanen.
iptables -C INPUT -p tcp --dport 22 -j ACCEPT 2>/dev/null \
  || iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT

# 2. Perbaikan permanen: kalau ufw aktif, izinkan SSH. Kalau ufw tidak aktif,
#    perintah ini hanya menambah aturan yang belum terpakai (aman).
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp || true
  ufw allow OpenSSH || true
  ufw reload || true
fi

# 3. Pastikan sshd hidup dan aktif saat boot.
systemctl enable --now ssh 2>/dev/null || systemctl enable --now sshd 2>/dev/null || true

echo "===== SESUDAH ====="
command -v ufw >/dev/null 2>&1 && ufw status verbose || true
ss -tlpn | grep -F ':22' || echo "MASIH tidak ada listener di :22"
iptables -S | head -20

# 4. Opsional (best-effort): unggah log ke paste publik sementara supaya bisa
#    dibaca dari luar kalau SSH tetap gagal. Isinya hanya status ufw/iptables/
#    sshd — tidak ada token atau isi .env. HAPUS baris ini bila tidak diinginkan.
curl -s --max-time 15 --data-binary @/var/log/ssh-recovery.log https://paste.rs/ || true
echo

exit 0
