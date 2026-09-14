# Dokumentasi REST API Rent Car System (v1)

Dokumentasi resmi REST API versi 1 (`/api/v1`) untuk Rent Car System. API ini dirancang untuk integrasi frontend, aplikasi mobile (iOS / Android), maupun sistem pihak ketiga.

---

## Daftar Isi
1. [Ikhtisar & Base URL](#ikhtisar--base-url)
2. [Autentikasi & Otorisasi](#autentikasi--otorisasi)
3. [Format Response Standar](#format-response-standar)
4. [Daftar Endpoint](#daftar-endpoint)
   - [Autentikasi & Profil](#1-autentikasi--profil-user)
   - [Dashboard Analytics](#2-dashboard-analytics)
   - [Master Data Lookup](#3-master-data-lookup)
   - [Manajemen Pengguna (Users)](#4-manajemen-pengguna-users)
   - [Pelanggan (Customers)](#5-pelanggan-customers)
   - [Armada Mobil (Cars)](#6-armada-mobil-cars)
   - [Tipe & Jenis Mobil (Car Types)](#7-tipe--jenis-mobil-car-types)
   - [Supir (Drivers)](#8-supir-drivers)
   - [Pemesanan & Alur Kerja (Bookings)](#9-pemesanan--alur-kerja-bookings)
   - [Alokasi Armada & Petugas](#10-alokasi-armada--petugas)
   - [Kontrak Rental (Rentals)](#11-kontrak-rental-rentals)
   - [Pengembalian Unit (Returns)](#12-pengembalian-unit-returns)
   - [Pembayaran (Payments)](#13-pembayaran-payments)
   - [Perawatan & Servis (Services)](#14-perawatan--servis-services)
   - [Asuransi Kendaraan (Insurances)](#15-asuransi-kendaraan-insurances)
   - [Pajak Kendaraan & STNK (Vehicle Taxes)](#16-pajak-kendaraan--stnk-vehicle-taxes)
   - [Blacklist Konsumen](#17-blacklist-konsumen)
   - [Laporan Bulanan (Reports)](#18-laporan-bulanan-reports)
5. [Contoh Penggunaan dengan cURL](#contoh-penggunaan-dengan-curl)

---

## Ikhtisar & Base URL

- **Base URL Pengembangan**: `http://localhost:8000/api/v1`
- **Format Pertukaran Data**: JSON (`application/json`)
- **Header Permintaan Wajib**:
  ```http
  Accept: application/json
  Content-Type: application/json
  ```
  *(Gunakan `multipart/form-data` saat mengunggah berkas foto/dokumen).*

---

## Autentikasi & Otorisasi

API menggunakan **Laravel Sanctum Bearer Token**.

1. Dapatkan token dengan memanggil endpoint `POST /api/v1/auth/login`.
2. Sertakan token pada setiap request yang membutuhkan autentikasi melalui header `Authorization`:
   ```http
   Authorization: Bearer <token_anda>
   ```

### Hak Akses Berdasarkan Role:
- **Super Admin**: Akses penuh ke seluruh fitur dan CRUD, termasuk User Management, override status booking, penghapusan data sewa, dan kontrak manual.
- **Admin**: Akses manajemen operasional (Customer, Armada, Booking, Alokasi, Pembayaran, Servis, Pajak, Asuransi, Blacklist).
- **Marketing**: Akses modul pelanggan (terbatas hanya customer miliknya), pembuatan booking, dan monitoring dashboard marketing.
- **Peluncur**: Akses daftar alokasi, checklist penyerahan unit (*delivery*), dan serah terima pengembalian.
- **Petugas Cuci**: Akses daftar tugas pencucian unit dan konfirmasi pencucian selesai.

---

## Format Response Standar

### 1. Respons Berhasil (200 OK / 201 Created)
```json
{
  "success": true,
  "message": "Operasi berhasil dilakukan.",
  "data": { ... }
}
```

Untuk data dengan paginasi (`paginate`):
```json
{
  "success": true,
  "message": "Daftar data berhasil diambil.",
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 10,
    "total": 48
  }
}
```

### 2. Respons Error Validasi (422 Unprocessable Content)
```json
{
  "message": "Validasi gagal.",
  "errors": {
    "phone": [
      "Nomor HP sudah terdaftar untuk customer lain."
    ]
  }
}
```

### 3. Respons Tidak Terautentikasi (401 Unauthorized)
```json
{
  "message": "Unauthenticated."
}
```

### 4. Respons Akses Ditolak (403 Forbidden)
```json
{
  "message": "Akses ditolak. Anda tidak memiliki hak akses ke resource ini."
}
```

---

## Daftar Endpoint

### 1. Autentikasi & Profil User

#### `POST /auth/login`
Autentikasi akun dan dapatkan token API.
- **Header**: `Accept: application/json`
- **Body**:
  ```json
  {
    "login": "marketing@example.com", // atau username
    "password": "password",
    "device_name": "android-app" // opsional
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login berhasil.",
    "data": {
      "token": "1|abcdef123456...",
      "token_type": "Bearer",
      "user": {
        "id": 1,
        "name": "Budi Santoso",
        "username": "budi_marketing",
        "email": "marketing@example.com",
        "phone": "081234567890",
        "roles": ["Marketing"],
        "is_super_admin": false,
        "is_admin": false,
        "is_marketing": true
      }
    }
  }
  ```

#### `POST /auth/logout`
Mencabut / menghapus token aktif saat ini.
- **Header**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logout berhasil.",
    "data": null
  }
  ```

#### `GET /user`
Mendapatkan info profil dan role pengguna yang sedang login.
- **Header**: `Authorization: Bearer <token>`

#### `PUT /user/profile`
Memperbarui profil pengguna saat ini.
- **Body**:
  ```json
  {
    "name": "Budi Santoso S.E.",
    "email": "budi_new@example.com",
    "username": "budi_se",
    "phone": "081299998888"
  }
  ```

#### `PUT /user/password`
Memperbarui kata sandi akun pengguna.
- **Body**:
  ```json
  {
    "current_password": "passwordLama123",
    "password": "passwordBaru123",
    "password_confirmation": "passwordBaru123"
  }
  ```

---

### 2. Dashboard Analytics

#### `GET /dashboard`
Mengambil statistik operasional, ketersediaan unit, transaksi, dan target yang disesuaikan secara otomatis sesuai role user login.
- **Query Params (Opsional)**:
  - `preset`: `all` | `today` | `tomorrow` | `this_week` | `this_month` | `custom`
  - `start_date`: Format `YYYY-MM-DD`
  - `end_date`: Format `YYYY-MM-DD`
- **Response (200 OK)**: Mengembalikan `total_cars`, `cars_ready`, `cars_not_ready`, `utilization_rate`, `revenue_today`, `revenue_month`, `overdue_returns`, `tax_expiring_soon`, `service_due`, serta data spesifik role (Admin / Marketing / Peluncur / Petugas Cuci).

---

### 3. Master Data Lookup

#### `GET /lookups`
Mengambil seluruh data referensi dropdown formulir dalam 1 kali panggilan request:
- `ready_cars`: Mobil berstatus Ready
- `all_cars`: Seluruh data armada
- `car_types`: Daftar tipe mobil
- `ready_drivers`: Supir berstatus Active
- `all_drivers`: Seluruh data supir
- `peluncur_officers`: Staf dengan role Peluncur
- `wash_officers`: Staf dengan role Petugas Cuci
- `marketing_users`: User marketing & admin
- `customers`: Pelanggan (otomatis discoped jika role marketing)

---

### 4. Manajemen Pengguna (Users)
> *Hanya dapat diakses oleh Super Admin.*

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/users` | Daftar user (`?search=...`, `?per_page=10`) |
| `POST` | `/users` | Tambah user baru |
| `GET` | `/users/{id}` | Detail user |
| `PUT` | `/users/{id}` | Update user |
| `DELETE` | `/users/{id}` | Hapus user (tidak bisa menghapus akun sendiri) |

**Body Tambah User (`POST /users`)**:
```json
{
  "name": "Ahmad Dani",
  "username": "ahmaddani",
  "email": "ahmad@example.com",
  "phone": "0812345678",
  "password": "password123",
  "roles": ["Peluncur"]
}
```
*Role yang didukung: `Super Admin`, `Admin`, `Marketing`, `Peluncur`, `Petugas Cuci`.*

---

### 5. Pelanggan (Customers)
> *Role Marketing hanya dapat mengakses pelanggan miliknya sendiri. Admin & Super Admin memiliki akses menyeluruh.*

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/customers` | Daftar pelanggan (`?search=...`, `?per_page=10`) |
| `POST` | `/customers` | Tambah pelanggan |
| `GET` | `/customers/{id}` | Detail pelanggan |
| `POST` | `/customers/{id}` (`_method=PUT`) | Update pelanggan |
| `DELETE` | `/customers/{id}` | Hapus pelanggan |

**Form Data Tambah Pelanggan (`POST /customers`)**:
- `name`: Nama lengkap (*wajib*)
- `nik`: NIK KTP (16 digit)
- `phone`: Nomor WhatsApp / HP
- `email`: Alamat email
- `address`: Alamat tempat tinggal
- `emergency_contact`: Kontak darurat
- `sim_number`: Nomor SIM A
- `sim_expiry`: Masa berlaku SIM (`YYYY-MM-DD`)
- `ktp_photo`: File foto KTP (jpg, png, webp, maks 5MB)
- `sim_photo`: File foto SIM (jpg, png, webp, maks 5MB)
- `selfie_photo`: File foto selfie (jpg, png, webp, maks 5MB)
- `user_id`: ID Marketing penanggung jawab (*hanya Admin yang dapat memilih*)

---

### 6. Armada Mobil (Cars)
> *Role Marketing tidak dapat mengakses data armada.*

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/cars` | Daftar mobil (`?status=ready\|not_ready\|service\|belum_dicuci\|all`, `?search=...`) |
| `POST` | `/cars` | Tambah armada mobil |
| `GET` | `/cars/{id}` | Detail armada mobil |
| `POST` | `/cars/{id}` (`_method=PUT`) | Update mobil |
| `DELETE` | `/cars/{id}` | Hapus mobil |

**Field Mobil**:
`name`, `brand`, `model`, `type`, `year`, `plate_number`, `color`, `transmission` (`Manual`/`Automatic`), `fuel_type` (`Bensin`/`Diesel`/`Hybrid`/`Listrik`), `passenger_capacity`, `chassis_number`, `engine_number`, `last_km`, `daily_price`, `weekly_price`, `monthly_price`, `photo` (file), `owner_partner`, `status` (`Ready`, `Not Ready`, `Belum Dicuci`, `Service`).

---

### 7. Tipe & Jenis Mobil (Car Types)
> *Akses: Admin & Super Admin.*

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/car-types` | Daftar tipe mobil |
| `POST` | `/car-types` | Tambah tipe mobil (`name`, `type`, `category`, `description`) |
| `GET` | `/car-types/{id}` | Detail tipe mobil |
| `PUT` | `/car-types/{id}` | Update tipe mobil |
| `DELETE` | `/car-types/{id}` | Hapus tipe mobil |

---

### 8. Supir (Drivers)

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/drivers` | Daftar supir (`?status=Active\|Inactive`, `?search=...`) |
| `POST` | `/drivers` | Tambah supir (`name`, `phone`, `sim`, `address`, `status`, `daily_rate`) |
| `GET` | `/drivers/{id}` | Detail supir |
| `PUT` | `/drivers/{id}` | Update supir |
| `DELETE` | `/drivers/{id}` | Hapus supir |

---

### 9. Pemesanan & Alur Kerja (Bookings)

#### Daftar & Ekspor Booking
- `GET /bookings`: Mengambil daftar booking dengan filter:
  - `status`: `Pending`, `Confirmed`, `On Trip`, `Returned`, `Completed`, `Cancelled`, `all`
  - `marketing_id`: Filter per marketing
  - `start_date` & `end_date`: Filter tanggal
  - `date_field`: `booking_date` (default) | `return_date` | `active_period`
  - `search`: Pencarian nama, nomor booking, plat mobil, supir, dll.
- `GET /bookings/export`: Ekspor seluruh data booking terfilter dalam format JSON.

#### Membuat Booking (`POST /bookings`)
Mendukung 2 metode:
1. **Pelanggan yang sudah ada**: Kirimkan `customer_id`.
2. **Pelanggan baru instan**: Kirimkan `new_customer_name`, `new_customer_phone`, `new_customer_nik`, dan dokumen foto (`new_customer_ktp_photo`, dll).

**Body Request Contoh**:
```json
{
  "customer_id": 5,
  "car_type": "Toyota Avanza",
  "rental_type": "Lepas Kunci", // "Lepas Kunci" atau "With Driver"
  "booking_date": "2026-09-15",
  "return_date": "2026-09-18",
  "pickup_time": "09:00",
  "return_time": "09:00",
  "pickup_location": "Bandara Soekarno Hatta",
  "dropoff_location": "Hotel Grand Indonesia",
  "payment_method": "Transfer", // "Cash", "Transfer", "DP"
  "payment_status": "Pending",
  "amount": 1200000
}
```

#### Detail, Update, dan Hapus Booking
- `GET /bookings/{id}`: Detail booking lengkap dengan relasi pelanggan, mobil, supir, peluncur, petugas cuci, dan kontrak.
- `PUT /bookings/{id}`: Update booking & alokasi petugas/mobil.
- `DELETE /bookings/{id}`: Hapus booking (*Super Admin only*).

#### Pembatalan Pemesanan (`POST /bookings/{id}/cancel`)
- **Body**:
  ```json
  {
    "cancellation_reason": "Pelanggan membatalkan perjalanan karena urusan mendadak."
  }
  ```

#### Alur Checklist & Operasional Lapangan

1. **Ambil Data Checklist (`GET /bookings/{id}/checklist`)**:
   Mendapatkan formulir data checklist pengeluaran (`delivery_checklist`) dan pengembalian (`return_checklist`).

2. **Checklist Penyerahan Unit (`POST /bookings/{id}/delivery`)**:
   Dilakukan oleh Peluncur / Admin saat menyerahkan unit ke pelanggan.
   - **Efek Otomatis**:
     - Status Booking berubah ke `On Trip`.
     - Status Mobil berubah ke `Not Ready`, odometer `last_km` mobil diperbarui.
     - Kontrak sewa `Rental` otomatis dibuat/diperbarui.
   - **Body**:
     ```json
     {
       "checklist": {
         "body": "baik",
         "interior": "bersih",
         "spion": "lengkap",
         "ban_serep": "ada"
       },
       "km_out": 45120,
       "fuel_out": 100, // persentase BBM (0 - 100)
       "fuel_range_km": 450,
       "handover_location": "Bandara Terminal 3",
       "latitude": "-6.1255",
       "longitude": "106.6558",
       "photos": ["https://.../foto1.jpg"], // atau upload file multipart photos[]
       "notes": "Unit diserahkan bersih dan full tank."
     }
     ```

3. **Checklist Pengembalian Unit (`POST /bookings/{id}/return`)**:
   Dilakukan saat pelanggan mengembalikan mobil.
   - **Efek Otomatis**:
     - Status Booking berubah ke `Returned`.
     - Status Mobil berubah ke `Ready`, odometer `last_km` mobil diperbarui.
     - Kontrak sewa `Rental` diset `Returned` dan dicatat waktu masuk.
   - **Body**:
     ```json
     {
       "checklist": {
         "kondisi_body": "baik, tidak ada lecet baru",
         "kebersihan": "normal"
       },
       "km_out": 45450, // KM saat kembali
       "fuel_out": 90,  // BBM saat kembali
       "latitude": "-6.1255",
       "longitude": "106.6558"
     }
     ```

4. **Konfirmasi Selesai Cuci (`POST /bookings/{id}/wash`)**:
   Dilakukan oleh Petugas Cuci / Admin.
   - **Efek Otomatis**:
     - Status Booking berubah ke `Completed`.
     - Status Kontrak Rental berubah ke `Completed`.
     - Status Mobil berubah ke `Ready`.

---

### 10. Alokasi Armada & Petugas

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/allocations` | Daftar alokasi booking (`?status=allocated\|unallocated`, filter tanggal, search) |
| `GET` | `/allocations/export` | Ekspor alokasi armada format JSON |
| `PUT` | `/allocations/{booking_id}`| Menetapkan / menukar unit mobil, supir, peluncur, petugas cuci |
| `DELETE` | `/allocations/{booking_id}`| Hapus data alokasi/booking (*Super Admin only*) |

**Body Alokasi (`PUT /allocations/{booking_id}`)**:
```json
{
  "car_id": 3,
  "driver_id": 2, // jika sewa with driver
  "peluncur_id": 4,
  "petugas_cuci_id": 5,
  "amount": 1500000
}
```
*Catatan: Jika `car_id` dialokasikan pada booking yang berstatus `Pending`, status booking otomatis berubah menjadi `Confirmed`. Jika mobil ditukar pada sewa aktif, sistem otomatis menyinkronkan data mobil pada kontrak rental.*

---

### 11. Kontrak Rental (Rentals)

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/rentals` | Daftar kontrak rental |
| `POST` | `/rentals` | Buat kontrak manual (*Super Admin only*) |
| `GET` | `/rentals/{id}` | Detail kontrak sewa |
| `PUT` | `/rentals/{id}` | Update kontrak sewa & sinkron status unit |
| `DELETE` | `/rentals/{id}` | Hapus kontrak sewa |

---

### 12. Pengembalian Unit (Returns)

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/returns` | Daftar unit yang sedang On Trip menunggu proses pengembalian |
| `POST` | `/returns` | Finalisasi pengembalian unit |

**Body Finalisasi Pengembalian (`POST /returns`)**:
```json
{
  "booking_id": 12,
  "rental_id": 8, // opsional jika ada
  "checkin_datetime": "2026-09-18 14:00:00",
  "km_in": 45800,
  "fuel_in": 90,
  "fine_amount": 0,
  "notes": "Unit kembali tepat waktu tanpa kendala."
}
```

---

### 13. Pembayaran (Payments)
> *Akses: Admin & Super Admin.*

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/payments` | Daftar pembayaran & faktur |
| `POST` | `/payments` | Catat pembayaran baru (otomatis generate nomor `INV-...`) |
| `GET` | `/payments/{id}` | Detail pembayaran |
| `POST` | `/payments/{id}` (`_method=PUT`) | Update pembayaran |
| `DELETE` | `/payments/{id}` | Hapus pembayaran |

**Form Data Catat Pembayaran (`POST /payments`)**:
- `booking_id`: ID booking (*wajib*)
- `payment_method`: `Cash` | `Transfer` | `DP`
- `dp_amount`: Nominal DP (contoh: `500000`)
- `settlement_amount`: Nominal pelunasan
- `total_amount`: Total bayar
- `status`: `Pending` | `DP Dibayar` | `Lunas`
- `transfer_proof`: File bukti bayar (jpg, png, pdf, maks 5MB)

*Catatan: Sistem otomatis menyinkronkan status pembayaran booking (`Paid` jika Lunas, `Down Payment` jika DP Dibayar).*

---

### 14. Perawatan & Servis (Services)

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/services` | Daftar riwayat servis (`?car_id=...`) |
| `POST` | `/services` | Catat servis baru (otomatis update `last_km` mobil jika lebih tinggi) |
| `GET` | `/services/{id}` | Detail servis |
| `PUT` | `/services/{id}` | Update catatan servis |
| `DELETE` | `/services/{id}` | Hapus catatan servis |

**Body Tambah Servis (`POST /services`)**:
```json
{
  "car_id": 3,
  "service_date": "2026-09-10",
  "workshop": "Bengkel Resmi Toyota",
  "service_type": "Ganti Oli Mesin & Filter",
  "km": 40000,
  "cost": 650000,
  "next_service_date": "2026-12-10",
  "notes": "Kondisi rem dan ban masih bagus."
}
```

---

### 15. Asuransi Kendaraan (Insurances)

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/insurances` | Daftar polis asuransi mobil (`?car_id=...`) |
| `POST` | `/insurances` | Tambah polis asuransi |
| `GET` | `/insurances/{id}` | Detail polis |
| `PUT` | `/insurances/{id}` | Update polis |
| `DELETE` | `/insurances/{id}` | Hapus polis |

**Body Asuransi (`POST /insurances`)**:
```json
{
  "car_id": 3,
  "insurance_name": "Asuransi Astra Garda Oto",
  "policy_number": "POL-2026-0091",
  "start_date": "2026-01-01",
  "end_date": "2027-01-01",
  "premium": 3200000,
  "notes": "Klausul All Risk termasuk banjir."
}
```

---

### 16. Pajak Kendaraan & STNK (Vehicle Taxes)

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/vehicle-taxes` | Daftar pajak STNK armada & info `expiring_soon_count` (30 hari) |
| `POST` | `/vehicle-taxes` | Tambah catatan pajak STNK |
| `GET` | `/vehicle-taxes/{id}` | Detail catatan pajak |
| `PUT` | `/vehicle-taxes/{id}` | Update catatan pajak |
| `DELETE` | `/vehicle-taxes/{id}` | Hapus catatan pajak |

**Body Pajak STNK (`POST /vehicle-taxes`)**:
```json
{
  "car_id": 3,
  "stnk_number": "STNK-19827364",
  "valid_until": "2027-05-15",
  "annual_tax": 3200000,
  "five_year_tax": 3800000,
  "reminder_date": "2027-04-15",
  "notes": "Samsat Jakarta Barat"
}
```

---

### 17. Blacklist Konsumen
> *Akses: Admin & Super Admin.*

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/blacklists` | Daftar konsumen blacklist (`?search=...`) |
| `POST` | `/blacklists` | Tambah catatan blacklist & foto bukti |
| `POST` | `/blacklists/import` | Bulk import baris blacklist JSON |
| `GET` | `/blacklists/{id}` | Detail blacklist |
| `POST` | `/blacklists/{id}` (`_method=PUT`)| Update blacklist |
| `DELETE` | `/blacklists/{id}` | Hapus blacklist |

**Body Bulk Import Blacklist (`POST /blacklists/import`)**:
```json
{
  "rows": [
    {
      "name": "Oknum A",
      "phone": "081234567890",
      "nik": "3171000000000001",
      "address": "Jakarta Timur",
      "incident_date": "2026-08-01",
      "perpetrator_info": "Menggadaikan unit sewa",
      "blacklisted_by": "Rental Bersama"
    }
  ]
}
```

---

### 18. Laporan Bulanan (Reports)

#### `GET /reports`
Mengambil rekapitulasi data pendapatan dan total pemesanan yang dikelompokkan berdasarkan bulan transaksi.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Laporan bulanan berhasil diambil.",
    "data": [
      {
        "month": "2026-09",
        "total_bookings": 24,
        "total_earnings": "36500000.00"
      },
      {
        "month": "2026-08",
        "total_bookings": 32,
        "total_earnings": "48200000.00"
      }
    ]
  }
  ```

---

## Contoh Penggunaan dengan cURL

### 1. Login Akun
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"login":"admin@example.com","password":"password"}'
```

### 2. Mengambil Profil User Login
```bash
curl -X GET "http://localhost:8000/api/v1/user" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer 1|your_token_here"
```

### 3. Mengambil Data Dashboard
```bash
curl -X GET "http://localhost:8000/api/v1/dashboard?preset=this_month" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer 1|your_token_here"
```

### 4. Membuat Pemesanan Baru
```bash
curl -X POST "http://localhost:8000/api/v1/bookings" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 1|your_token_here" \
  -d '{
    "customer_id": 1,
    "car_type": "Innova Reborn",
    "rental_type": "Lepas Kunci",
    "booking_date": "2026-09-20",
    "return_date": "2026-09-23",
    "pickup_time": "10:00",
    "return_time": "10:00",
    "pickup_location": "Kantor Pusat",
    "dropoff_location": "Kantor Pusat",
    "payment_method": "Transfer",
    "amount": 2100000
  }'
```

### 5. Mengunggah Foto Pelanggan (Multipart Form-Data)
```bash
curl -X POST "http://localhost:8000/api/v1/customers" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer 1|your_token_here" \
  -F "name=Pelanggan Baru" \
  -F "phone=081122334455" \
  -F "ktp_photo=@/path/to/ktp.jpg"
```

