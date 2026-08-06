1. Modul Marketing
Input Data Booking: Form untuk memasukkan nama konsumen, jenis mobil, dan memilih metode pembayaran (Cash, Transfer, atau DP).

2. Modul Admin Unit
Autentikasi: Fitur Login untuk Admin Unit.

Dashboard Booking: Halaman untuk melihat semua daftar data booking yang masuk.

Manajemen Alokasi (Assign) Mobil: Fitur untuk menentukan dan memilih armada mobil mana yang akan digunakan untuk booking tertentu.

Assign Peluncur: Fitur untuk menugaskan (assign) orderan atau mobil tersebut ke petugas Peluncur.

Assign Petugas Cuci: Fitur untuk menugaskan petugas cuci setelah mobil kembali dari konsumen.

3. Modul Peluncur
Checklist Pengeluaran (Di Lokasi): Form checklist kondisi fisik mobil saat diserahkan ke konsumen di lokasi.

Geotagging (Tag Lokasi): Fitur untuk mengunci atau mencatat koordinat lokasi penyerahan mobil.

Checklist Pengembalian: Form checklist kondisi fisik mobil saat mobil kembali dari konsumen.

4. Manajemen Status Mobil
Sistem akan otomatis mengubah status mobil berdasarkan aksi pengguna:

Not Ready: Otomatis berubah setelah Peluncur selesai melakukan checklist penulisan/tag lokasi.

Belum Dicuci: Otomatis berubah setelah Peluncur melakukan checklist pengembalian saat mobil kembali.

Ready: Otomatis berubah setelah proses cuci mobil selesai (diubah oleh sistem atau petugas cuci).

5. Data Mobil
Data Mobil: Form untuk memasukkan informasi detail mobil, seperti jenis mobil, tahun, nomor polisi, dan status ketersediaan.

Data Transaksi: Halaman untuk melihat semua daftar data transaksi yang masuk.

6. Laporan
Laporan Bulanan: Halaman untuk melihat laporan bulanan.

7. Dashboard
Dashboard Admin: Halaman untuk melihat statistik dan ringkasan data.

Dashboard Marketing: Halaman untuk melihat statistik dan ringkasan data.

Dashboard Peluncur: Halaman untuk melihat statistik dan ringkasan data.

8. Lainnya
User Login: Halaman untuk login pengguna.

modul user management : Halaman untuk mengelola user.
modul customer management : Halaman untuk mengelola customer.
modul payment management : Halaman untuk mengelola pembayaran.

9. Data yang di butuhkan untuk DATABASE

mobil
no polisi
merk
model
tipe
tahun
warna
transmisi
bahan bakar
kapasitas penumpang
nomor rangka
nomor mesin
status
km terakhir
harga harian
harga mingguan
harga bulanan
foto
Mitra pemilik

booking
Nomor Booking
Customer
Jenis Mobil
Tanggal Booking
Tanggal Mulai
Tanggal Selesai
Pickup Location
Dropoff Location
Status Booking
jenis sewa

Customer
Nama
NIK
Nomor SIM
Masa berlaku SIM
Alamat
No HP
Email
Foto KTP
Foto SIM
Foto Selfie
Emergency Contact

Rental
Booking
Jenis Mobil
Customer
Type Sewa
Driver
KM Keluar
BBM Keluar
KM Masuk
BBM Masuk
Total Bayar
Status

pembayaran
Invoice
Booking
Metode Pembayaran
DP
Pelunasan
Total
Denda
Status
Bukti Transfer

driver
Nama
Nomor HP
SIM
Alamat
Status
Tarif Harian

Service
Mobil
Tanggal
Bengkel
Jenis Service
KM
Biaya
Jadwal Service Berikutny

Asuransi
Mobil
Nama Asuransi
Nomor Polis
Mulai
Berakhir
Premi

Tabel Pajak/STNK
Mobil
STNK
Berlaku Sampai
Pajak Tahunan
Pajak Lima Tahunan
Reminder

Data Serah Terima
Nomor Kontrak
Tanggal & Jam Keluar
Tanggal & Jam Kembali
Nama Penyewa
Nama Petugas
Lokasi Serah Terima
Odometer (KM)
BBM (%)
Tanda tangan digital penyewa & petugas

- Dashboard
Total Mobil
Mobil Ready
Sedang Disewa
Sedang Service
Booking Hari Ini
Pendapatan Hari Ini
Pendapatan Bulan Ini
Utilization Rate
Mobil Telat Kembali
Pajak Hampir Habis
Service Jatuh Tempo

10. Alur System

marketing input nama kons dan jenis mobil dan pembayaran cash transfer atau DP,

admin unit login liat data booking nentuin mobil mana di assign dan melakukan assign ke peluncur,

peluncur melakukan checklist di lokasi dan tag lokasi, lalu status mobil berubah menjadi not ready, setelah mobil kembali ada checklist kembali lalu status mobil berubah menjadi belum dicuci.

lalu admin assign yang melakukan cuci mobil, setelah di cuci status mobil berubah menjadi ready 