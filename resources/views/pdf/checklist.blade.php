<!DOCTYPE html>
<html lang="id">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta charset="UTF-8">
    <title>BAST Checklist {{ $booking->booking_number }}</title>
    <style>
        @page {
            margin: 8mm 12mm;
            size: A4 portrait;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
            color: #111;
            font-size: 8.5px;
            line-height: 1.25;
            background: #fff;
            margin: 0;
            padding: 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        .header-table td {
            vertical-align: top;
        }
        .border-black {
            border: 1px solid #000;
        }
        .border-bottom-black {
            border-bottom: 1px solid #000;
        }
        .border-bottom-double {
            border-bottom: 2px solid #000;
        }
        .bg-gray-100 {
            background-color: #f3f4f6;
        }
        .bg-gray-50 {
            background-color: #f9fafb;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .text-emerald { color: #047857; }
        .text-red { color: #b91c1c; }
        .text-amber { color: #b45309; }
        .text-gray { color: #4b5563; }
        .font-mono { font-family: Courier, monospace; }

        .section-box {
            border: 1px solid #000;
            margin-bottom: 6px;
        }
        .section-title {
            background-color: #f3f4f6;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9px;
            padding: 3px 6px;
            border-bottom: 1px solid #000;
        }
        .info-table td {
            padding: 2px 4px;
            font-size: 9px;
            vertical-align: top;
        }
        .check-table td {
            padding: 2.5px 5px;
            font-size: 8.5px;
            border-bottom: 1px solid #e5e7eb;
        }
        .badge-status {
            padding: 1px 4px;
            font-weight: bold;
            font-size: 8px;
            border-radius: 2px;
            border: 1px solid #ccc;
            display: inline-block;
        }
        .badge-ok {
            background-color: #ecfdf5;
            color: #065f46;
            border-color: #a7f3d0;
        }
        .badge-rusak {
            background-color: #fef2f2;
            color: #991b1b;
            border-color: #fecaca;
        }
        .badge-baret {
            background-color: #fffbeb;
            color: #92400e;
            border-color: #fde68a;
        }
        .badge-penyok {
            background-color: #fff7ed;
            color: #9a3412;
            border-color: #fed7aa;
        }
    </style>
</head>
<body>
    @php
        $isDelivery = ($type ?? 'delivery') === 'delivery';
        $checklist = $checklistData ?? ($isDelivery ? ($booking->delivery_checklist ?? []) : ($booking->return_checklist ?? []));
        $rawPhone = trim($booking->customer?->phone ?? '');
        $maskedPhone = ($rawPhone !== '' && strlen($rawPhone) > 5)
            ? substr($rawPhone, 0, -5) . 'XXXXX'
            : ($rawPhone ?: '-');

        $mulai = $booking->booking_date ? \Carbon\Carbon::parse($booking->booking_date)->format('d/m/Y') : '-';
        $selesai = $booking->return_date ? \Carbon\Carbon::parse($booking->return_date)->format('d/m/Y') : '-';

        $km = $checklist['km_out'] ?? ($isDelivery ? ($booking->rental?->km_out ?? $booking->car?->last_km ?? '-') : ($booking->rental?->km_in ?? $booking->car?->last_km ?? '-'));
        $fuel = $checklist['fuel_out'] ?? ($isDelivery ? ($booking->rental?->fuel_out ?? 100) : ($booking->rental?->fuel_in ?? 100));
        $handoverLoc = $checklist['handover_location'] ?? ($isDelivery ? ($booking->pickup_location ?: '-') : ($booking->dropoff_location ?: $booking->pickup_location ?: '-'));
        $rawCheckoutDate = $checklist['checkout_date'] ?? null;
        if (!empty($checklist['checkout_datetime'])) {
            $checkoutDate = \Carbon\Carbon::parse($checklist['checkout_datetime'])->format('d/m/Y');
            $checkoutTime = $checklist['checkout_time'] ?? \Carbon\Carbon::parse($checklist['checkout_datetime'])->format('H:i');
        } elseif (!empty($rawCheckoutDate)) {
            $strDate = (string) $rawCheckoutDate;
            if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $strDate)) {
                $checkoutDate = $strDate;
            } else {
                try {
                    $checkoutDate = \Carbon\Carbon::parse($strDate)->format('d/m/Y');
                } catch (\Throwable) {
                    $checkoutDate = $strDate;
                }
            }
            $checkoutTime = $checklist['checkout_time'] ?? date('H:i');
        } else {
            $checkoutDate = date('d/m/Y');
            $checkoutTime = $checklist['checkout_time'] ?? date('H:i');
        }
        $lat = $checklist['latitude'] ?? null;
        $long = $checklist['longitude'] ?? null;

        $checklistItems = [
            'kunci_kontak' => 'Kunci Kontak Utama & Cadangan',
            'copy_stnk' => 'Copy STNK Asli / Pajak Hidup',
            'ban_serep' => 'Ban Serep / Cadangan Standard',
            'dongkrak' => 'Dongkrak Kit Set Complete',
            'kunci_roda' => 'Kunci Roda Set Tool Package',
            'stang_dongkrak' => 'Stang Dongkrak Putar',
            'ac_mobil' => 'AC Mobil Dingin & Blower Aktif',
            'audio_mobil' => 'Audio System / Bluetooth Tape',
        ];

        // Process documentation photos (up to 4 for clean layout)
        $rawPhotos = $checklistData['photos'] ?? [];
        if (empty($rawPhotos)) {
            $rawPhotos = $isDelivery
                ? ($booking->delivery_checklist['photos'] ?? [])
                : ($booking->return_checklist['photos'] ?? []);
        }
        if (!is_array($rawPhotos)) {
            $rawPhotos = [];
        }

        $embedFn = function ($photoList) {
            $result = [];
            foreach ($photoList as $p) {
                if (!is_string($p) || empty($p)) {
                    continue;
                }

                if (str_starts_with($p, 'data:image')) {
                    $result[] = $p;
                    continue;
                }

                $pathCandidate = parse_url($p, PHP_URL_PATH) ?: $p;
                $pathCandidate = ltrim($pathCandidate, '/');

                $localFile = null;
                if (str_starts_with($pathCandidate, 'storage/')) {
                    $sub = substr($pathCandidate, 8);
                    if (file_exists(storage_path('app/public/' . $sub))) {
                        $localFile = storage_path('app/public/' . $sub);
                    } elseif (file_exists(public_path('storage/' . $sub))) {
                        $localFile = public_path('storage/' . $sub);
                    }
                } elseif (file_exists(public_path($pathCandidate))) {
                    $localFile = public_path($pathCandidate);
                } elseif (file_exists($p)) {
                    $localFile = $p;
                }

                $rawContent = null;
                if ($localFile && file_exists($localFile)) {
                    $rawContent = @file_get_contents($localFile);
                } elseif (filter_var($p, FILTER_VALIDATE_URL)) {
                    try {
                        $ctx = stream_context_create(['http' => ['timeout' => 3]]);
                        $rawContent = @file_get_contents($p, false, $ctx);
                    } catch (\Throwable) {}
                }

                if ($rawContent) {
                    $finalBytes = $rawContent;
                    $mime = 'image/jpeg';

                    if (extension_loaded('gd') && function_exists('imagecreatefromstring')) {
                        try {
                            $src = @imagecreatefromstring($rawContent);
                            if ($src) {
                                $w = imagesx($src);
                                $h = imagesy($src);
                                $maxW = 600;
                                if ($w > $maxW) {
                                    $newW = $maxW;
                                    $newH = (int) round(($h / $w) * $newW);
                                    $dst = imagecreatetruecolor($newW, $newH);
                                    imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
                                    imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $w, $h);
                                    imagedestroy($src);
                                    $src = $dst;
                                }
                                ob_start();
                                imagejpeg($src, null, 75);
                                $compressed = ob_get_clean();
                                imagedestroy($src);
                                if ($compressed && strlen($compressed) > 0) {
                                    $finalBytes = $compressed;
                                }
                            }
                        } catch (\Throwable) {}
                    }

                    $data = base64_encode($finalBytes);
                    $result[] = "data:{$mime};base64,{$data}";
                }
            }
            return $result;
        };

        $embeddedPhotos = $embedFn($rawPhotos);

        $rawKtpPhotos = [];
        $rawSimPhotos = [];
        $embeddedIdPhotos = [];

        if ($isDelivery) {
            $rawKtpPhotos = $checklistData['ktp_photos'] ?? ($booking->delivery_checklist['ktp_photos'] ?? []);
            if (!is_array($rawKtpPhotos)) {
                $rawKtpPhotos = [];
            }

            $rawSimPhotos = $checklistData['sim_photos'] ?? ($booking->delivery_checklist['sim_photos'] ?? []);
            if (!is_array($rawSimPhotos)) {
                $rawSimPhotos = [];
            }

            // Fallback to customer photos if neither was uploaded during checklist
            if (empty($rawKtpPhotos) && empty($rawSimPhotos) && !empty($booking->customer)) {
                if (!empty($booking->customer->ktp_photo)) {
                    $rawKtpPhotos[] = $booking->customer->ktp_photo;
                }
                if (!empty($booking->customer->sim_photo)) {
                    $rawSimPhotos[] = $booking->customer->sim_photo;
                }
            }

            // Fallback to legacy identity_photos array only if ktp_photos & sim_photos are empty
            if (empty($rawKtpPhotos) && empty($rawSimPhotos)) {
                $legacyId = $checklistData['identity_photos'] ?? ($booking->delivery_checklist['identity_photos'] ?? []);
                if (is_array($legacyId) && !empty($legacyId)) {
                    $embeddedIdPhotos = $embedFn(array_values(array_unique($legacyId)));
                }
            }
        }

        $embeddedKtpPhotos = $embedFn($rawKtpPhotos);
        $embeddedSimPhotos = $embedFn($rawSimPhotos);
    @endphp

    {{-- KOP SURAT / HEADER --}}
    <table class="header-table border-bottom-double" style="padding-bottom: 4px; margin-bottom: 6px;">
        <tr>
            <td style="width: 60%;">
                <h1 style="margin: 0; font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
                    PT. CAHAYA AUTO NUSANTARA
                </h1>
                <p style="margin: 2px 0 0; font-size: 8.5px; color: #4b5563;">
                    Jasa Sewa & Rental Mobil Terbaik di Lombok | Nusa Tenggara Barat
                </p>
            </td>
            <td style="width: 40%; text-align: right;">
                <div style="border: 1px solid #000; padding: 4px 6px; background-color: #f9fafb; display: inline-block; text-align: right;">
                    <div style="font-size: 9px; font-weight: bold;">
                        No. Booking: <span class="font-mono">{{ $booking->booking_number }}</span>
                    </div>
                    <div style="font-size: 8px; color: #4b5563;">
                        Tgl Cetak: {{ date('d/m/Y H:i') }}
                    </div>
                    <div style="font-size: 8px; font-weight: bold;">
                        Layanan: {{ $booking->rental_type ?? 'Lepas Kunci' }}
                    </div>
                </div>
            </td>
        </tr>
    </table>

    {{-- JUDUL DOKUMEN --}}
    <div class="text-center" style="margin-bottom: 6px;">
        <h2 style="margin: 0; font-size: 11px; font-weight: 900; letter-spacing: 0.5px; text-decoration: underline; text-transform: uppercase;">
            BERITA ACARA SERAH TERIMA KENDARAAN (BAST)
        </h2>
        <div style="font-size: 8.5px; font-weight: bold; margin-top: 1px; color: #374151;">
            {{ $isDelivery ? 'FORMULIR PENYERAHAN UNIT JALAN (CHECK-OUT)' : 'FORMULIR PENGEMBALIAN UNIT KENDARAAN (CHECK-IN)' }}
        </div>
    </div>

    {{-- GRID: DATA PENYEWA & DATA KENDARAAN --}}
    <table style="margin-bottom: 6px;">
        <tr>
            {{-- DATA PENYEWA --}}
            <td style="width: 49.5%; vertical-align: top;">
                <div class="section-box" style="margin-bottom: 0;">
                    <div class="section-title">I. Data Pihak Penyewa</div>
                    <table class="info-table">
                        <tr>
                            <td style="width: 90px; color: #4b5563;">Nama Penyewa</td>
                            <td style="width: 5px;">:</td>
                            <td class="font-bold">{{ $booking->customer?->name ?? '-' }}</td>
                        </tr>
                        <tr>
                            <td style="color: #4b5563;">No. Telepon / WA</td>
                            <td>:</td>
                            <td class="font-bold font-mono">{{ $maskedPhone }}</td>
                        </tr>
                        <tr>
                            <td style="color: #4b5563;">No. KTP / SIM</td>
                            <td>:</td>
                            <td>{{ $booking->customer?->nik ?: ($booking->customer?->sim_number ?: '-') }}</td>
                        </tr>
                        <tr>
                            <td style="color: #4b5563;">Alamat</td>
                            <td>:</td>
                            <td>{{ $booking->customer?->address ?: '-' }}</td>
                        </tr>
                    </table>
                </div>
            </td>
            <td style="width: 1%;"></td>
            {{-- DATA KENDARAAN --}}
            <td style="width: 49.5%; vertical-align: top;">
                <div class="section-box" style="margin-bottom: 0;">
                    <div class="section-title">II. Data Kendaraan & Jadwal</div>
                    <table class="info-table">
                        <tr>
                            <td style="width: 90px; color: #4b5563;">Unit Mobil</td>
                            <td style="width: 5px;">:</td>
                            <td class="font-bold">{{ $booking->car?->name ?: $booking->car_type }}</td>
                        </tr>
                        <tr>
                            <td style="color: #4b5563;">No. Polisi (Plat)</td>
                            <td>:</td>
                            <td class="font-bold font-mono">{{ $booking->car?->plate_number ?: '-' }}</td>
                        </tr>
                        <tr>
                            <td style="color: #4b5563;">Periode Sewa</td>
                            <td>:</td>
                            <td>{{ $mulai }} s/d {{ $selesai }}</td>
                        </tr>
                        <tr>
                            <td style="color: #4b5563;">Lokasi {{ $isDelivery ? 'Antar' : 'Kembali' }}</td>
                            <td>:</td>
                            <td>{{ $handoverLoc }}</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>

    {{-- SECTION: METERAN & KONDISI TEKNIS --}}
    <div class="section-box">
        <div class="section-title">
            III. Status Meteran, Bahan Bakar & Waktu {{ $isDelivery ? 'Penyerahan' : 'Pengembalian' }}
        </div>
        <table>
            <tr>
                <td style="width: 25%; text-align: center; padding: 4px; border-right: 1px solid #000;">
                    <div style="font-size: 8px; color: #4b5563; text-transform: uppercase;">Odometer (KM)</div>
                    <div style="font-size: 11px; font-weight: 900; font-family: Courier, monospace; margin-top: 1px;">
                        {{ is_numeric($km) ? number_format($km, 0, ',', '.') : $km }} KM
                    </div>
                </td>
                <td style="width: 25%; text-align: center; padding: 4px; border-right: 1px solid #000;">
                    <div style="font-size: 8px; color: #4b5563; text-transform: uppercase;">Bahan Bakar (BBM)</div>
                    <div style="font-size: 11px; font-weight: 900; font-family: Courier, monospace; margin-top: 1px;">
                        {{ $fuel }}%
                        <span style="font-size: 8px; font-weight: normal; color: #4b5563;">
                            ({{ $fuel >= 90 ? 'Full' : ($fuel >= 70 ? '3/4' : ($fuel >= 45 ? '1/2' : ($fuel >= 20 ? '1/4' : 'E'))) }})
                        </span>
                    </div>
                </td>
                <td style="width: 25%; text-align: center; padding: 4px; border-right: 1px solid #000;">
                    <div style="font-size: 8px; color: #4b5563; text-transform: uppercase;">Waktu {{ $isDelivery ? 'Penyerahan' : 'Pengembalian' }}</div>
                    <div style="font-size: 9px; font-weight: bold; margin-top: 1px;">
                        {{ $checkoutDate }} {{ $checkoutTime }}
                    </div>
                </td>
                <td style="width: 25%; text-align: center; padding: 4px;">
                    <div style="font-size: 8px; color: #4b5563; text-transform: uppercase;">Koordinat GPS</div>
                    <div style="font-size: 8.5px; font-family: Courier, monospace; margin-top: 1px;">
                        {{ ($lat && $long) ? number_format($lat, 4) . ', ' . number_format($long, 4) : '-' }}
                    </div>
                </td>
            </tr>
        </table>
    </div>

    {{-- SECTION: CHECKLIST KELENGKAPAN UNIT --}}
    <div class="section-box">
        <div class="section-title">
            IV. Pemeriksaan Kelengkapan Standar Kendaraan (8 Item)
        </div>
        <table>
            <tr>
                <td style="width: 50%; vertical-align: top; border-right: 1px solid #000;">
                    <table class="check-table">
                        @php $i = 1; @endphp
                        @foreach(array_slice($checklistItems, 0, 4, true) as $key => $label)
                            @php $val = $checklist[$key] ?? null; @endphp
                            <tr>
                                <td>{{ $i++ }}. {{ $label }}</td>
                                <td style="width: 90px; text-align: right; font-weight: bold;">
                                    @if($val === 'OK')
                                        <span class="text-emerald" style="font-family: 'DejaVu Sans', sans-serif; font-weight: bold;">[ &#10004; ] ADA / BAIK</span>
                                    @elseif($val === 'Tidak')
                                        <span class="text-red" style="font-family: 'DejaVu Sans', sans-serif; font-weight: bold;">[ &#10008; ] TIDAK ADA</span>
                                    @else
                                        <span class="text-gray">[ - ] Belum Dicek</span>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </table>
                </td>
                <td style="width: 50%; vertical-align: top;">
                    <table class="check-table">
                        @foreach(array_slice($checklistItems, 4, 4, true) as $key => $label)
                            @php $val = $checklist[$key] ?? null; @endphp
                            <tr>
                                <td>{{ $i++ }}. {{ $label }}</td>
                                <td style="width: 90px; text-align: right; font-weight: bold;">
                                    @if($val === 'OK')
                                        <span class="text-emerald" style="font-family: 'DejaVu Sans', sans-serif; font-weight: bold;">[ &#10004; ] ADA / BAIK</span>
                                    @elseif($val === 'Tidak')
                                        <span class="text-red" style="font-family: 'DejaVu Sans', sans-serif; font-weight: bold;">[ &#10008; ] TIDAK ADA</span>
                                    @else
                                        <span class="text-gray">[ - ] Belum Dicek</span>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </table>
                </td>
            </tr>
        </table>
    </div>

    {{-- SECTION: INSPEKSI KONDISI FISIK BODI MOBIL (5 SISI) --}}
    <div class="section-box">
        <div class="section-title">
            V. Hasil Inspeksi Kondisi Fisik Bodi Mobil (5 Sisi)
        </div>
        <table style="text-align: center;">
            <tr>
                @php
                    $sides = [
                        ['label' => 'Samping Kiri', 'key' => 'body_kiri', 'note' => 'body_kiri_note'],
                        ['label' => 'Samping Kanan', 'key' => 'body_kanan', 'note' => 'body_kanan_note'],
                        ['label' => 'Tampak Depan', 'key' => 'body_depan', 'note' => 'body_depan_note'],
                        ['label' => 'Tampak Belakang', 'key' => 'body_belakang', 'note' => 'body_belakang_note'],
                        ['label' => 'Tampak Atas', 'key' => 'body_atap', 'note' => 'body_atap_note'],
                    ];
                @endphp
                @foreach($sides as $side)
                    @php
                        $val = $checklist[$side['key']] ?? 'Baik';
                        $note = $checklist[$side['note']] ?? null;
                        $badgeClass = match($val) {
                            'Baret' => 'badge-baret',
                            'Penyok' => 'badge-penyok',
                            'Rusak' => 'badge-rusak',
                            default => 'badge-ok',
                        };
                    @endphp
                    <td style="width: 20%; padding: 4px; vertical-align: top; {{ !$loop->last ? 'border-right: 1px solid #000;' : '' }}">
                        <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; margin-bottom: 3px;">
                            {{ $side['label'] }}
                        </div>
                        <div>
                            <span class="badge-status {{ $badgeClass }}">{{ $val ?: 'Baik' }}</span>
                        </div>
                        @if($note)
                            <div style="font-size: 7.5px; color: #4b5563; font-style: italic; margin-top: 2px; line-height: 1.1;">
                                {{ $note }}
                            </div>
                        @endif
                    </td>
                @endforeach
            </tr>
        </table>
    </div>

    {{-- SECTION: CATATAN TAMBAHAN --}}
    <div class="section-box" style="padding: 4px 6px;">
        <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #374151; margin-bottom: 2px;">
            Catatan Tambahan & Kondisi Khusus:
        </div>
        <div style="font-size: 8.5px; font-style: italic; color: #111;">
            {{ $booking->delivery_notes ?: ($checklist['notes'] ?? 'Tidak ada catatan khusus. Kendaraan dalam kondisi normal dan siap operasional.') }}
        </div>
    </div>

    {{-- SURAT PERJANJIAN & KETENTUAN SEWA MENYEWA --}}
    <div class="section-box" style="padding: 4px 6px; font-size: 7px; line-height: 1.25; margin-bottom: 5px; page-break-inside: avoid;">
        <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #000; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 3px;">
            Surat Perjanjian & Ketentuan Sewa Kendaraan
        </div>
        <div style="font-weight: bold; margin-bottom: 2px; color: #000;">
            Dengan Ini menyatakan bahwa saya :
        </div>
        <ol style="margin: 0; padding-left: 14px; color: #111;">
            <li style="margin-bottom: 1.5px;">Bersedia untuk di Survei dan menyerahkan identitas asli yaitu KTP Asli, Kartu Keluarga Asli, NPWP Asli, atau Pasport Asli (Untuk WNA) atau Jaminan Sertifikat.</li>
            <li style="margin-bottom: 1.5px;">Tidak boleh mengendarai mobil secara ugal-ugalan/kebut-kebutan.</li>
            <li style="margin-bottom: 1.5px;">Bersedia membayar sewa di depan saat menerima kunci mobil.</li>
            <li style="margin-bottom: 1.5px;">Jika melebihi waktu sewa maka akan dikenakan biaya tambahan Rp.50.000/Jam.</li>
            <li style="margin-bottom: 1.5px;">Bersedia menjaga &amp; Merawat mobil.</li>
            <li style="margin-bottom: 1.5px;">Tidak menggunakan mobil untuk sesuatu yang melanggar hukum seperti : kejahatan, Narkoba, Buronan &amp; Teroris.</li>
            <li style="margin-bottom: 1.5px;">Tidak boleh memindah tangankan mobil Seperti menggadaikan mobil, Menjual atau melakukan perbuatan-perbuatan lain yang akan merugikan pihak perusahaan.</li>
            <li style="margin-bottom: 1.5px;">Jika terjadi kecelakaan dan kehilangan pada saat masa sewa, maka saya tidak akan menuntut tentang asuransi dan bersedia untuk bertanggung jawab atas kerusakan dan kehilangan unit dan tidak akan memperbaiki di bengkel manapun selain di KRIDA TOYOTA/SESUAI DENGAN MERK MOBIL/ DEALER RESMI atau bengkel yang ditunjuk oleh PT. CAHAYA AUTO NUSANTARA.</li>
            <li style="margin-bottom: 1.5px;">Saya bersedia untuk bertanggung jawab untuk membayar sewa unit selama masa perbaikan sesuai dengan harga sewa dan mengganti kerugian sebesar Rp.500.000/ Panel.</li>
            <li style="margin-bottom: 1.5px;">Pada saat pengembalian unit mobil, kondisi kendaraan dan bahan bakar harus sama pada posisi awal seperti saat Pertama kali mengambil mobil.</li>
            <li style="margin-bottom: 1.5px;">Kendaraan hanya bisa digunakan di area pulau Lombok Pihak PT. CAHAYA AUTO NUSANTARA melarang penyewa untuk membawa kendaraan keluar pulau Lombok.</li>
        </ol>
    </div>

    {{-- KOLOM TANDA TANGAN 3 PIHAK --}}
    <table style="text-align: center; margin-top: 4px;">
        <tr>
            {{-- PIHAK PENYEWA --}}
            <td style="width: 32%; vertical-align: top;">
                <div class="section-box" style="padding: 4px; min-height: 72px;">
                    <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #4b5563; margin-bottom: 32px;">
                        Pihak Penyewa
                    </div>
                    <div style="font-size: 9px; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
                        {{ $booking->customer?->name ?: '( ...................................... )' }}
                    </div>
                    <div style="font-size: 7.5px; color: #6b7280;">Penyewa / Penanggung Jawab</div>
                </div>
            </td>
            <td style="width: 2%;"></td>
            {{-- PETUGAS PELUNCUR --}}
            <td style="width: 32%; vertical-align: top;">
                <div class="section-box" style="padding: 4px; min-height: 72px;">
                    <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #4b5563; margin-bottom: 32px;">
                        {{ $isDelivery ? 'Petugas Penyerah Unit' : 'Petugas Penerima Unit' }}
                    </div>
                    <div style="font-size: 9px; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
                        {{ $booking->peluncur?->name ?: ($officerName ?? '( ...................................... )') }}
                    </div>
                    <div style="font-size: 7.5px; color: #6b7280;">Petugas Lapangan / Peluncur</div>
                </div>
            </td>
            <td style="width: 2%;"></td>
            {{-- MANAJEMEN RENTAL --}}
            <td style="width: 32%; vertical-align: top;">
                <div class="section-box" style="padding: 4px; min-height: 72px;">
                    <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #4b5563; margin-bottom: 32px;">
                        Manajemen Rental
                    </div>
                    <div style="font-size: 9px; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
                        PT. Cahaya Auto Nusantara
                    </div>
                    <div style="font-size: 7.5px; color: #6b7280;">Pemberi Sewa Kendaraan</div>
                </div>
            </td>
        </tr>
    </table>

    {{-- SECTION: LAMPIRAN FOTO DOKUMENTASI & IDENTITAS (KESAMPING) --}}
    @php
        $allAttachmentPhotos = [];
        if (!empty($embeddedPhotos)) {
            foreach ($embeddedPhotos as $idx => $photoSrc) {
                $allAttachmentPhotos[] = [
                    'src' => $photoSrc,
                    'label' => count($embeddedPhotos) > 1 ? 'Foto Unit #' . ($idx + 1) : 'Dokumentasi Unit',
                ];
            }
        }
        if ($isDelivery && !empty($embeddedKtpPhotos)) {
            foreach ($embeddedKtpPhotos as $idx => $photoSrc) {
                $allAttachmentPhotos[] = [
                    'src' => $photoSrc,
                    'label' => count($embeddedKtpPhotos) > 1 ? 'KTP #' . ($idx + 1) : 'Foto KTP',
                ];
            }
        }
        if ($isDelivery && !empty($embeddedSimPhotos)) {
            foreach ($embeddedSimPhotos as $idx => $photoSrc) {
                $allAttachmentPhotos[] = [
                    'src' => $photoSrc,
                    'label' => count($embeddedSimPhotos) > 1 ? 'SIM #' . ($idx + 1) : 'Foto SIM',
                ];
            }
        }
        if ($isDelivery && !empty($embeddedIdPhotos)) {
            foreach ($embeddedIdPhotos as $idx => $photoSrc) {
                $allAttachmentPhotos[] = [
                    'src' => $photoSrc,
                    'label' => count($embeddedIdPhotos) > 1 ? 'Identitas #' . ($idx + 1) : 'Foto Identitas',
                ];
            }
        }
    @endphp

    @if(!empty($allAttachmentPhotos))
        <div style="margin-top: 10px; border-top: 2px solid #000; padding-top: 5px; page-break-inside: avoid;">
            <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #111; margin-bottom: 5px;">
                Lampiran Foto Dokumentasi &amp; Identitas ({{ count($allAttachmentPhotos) }} Foto)
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    @foreach($allAttachmentPhotos as $idx => $item)
                        <td style="width: 25%; padding: 2px 4px; vertical-align: top; text-align: center;">
                            <div style="border: 1px solid #000; background-color: #f9fafb; padding: 2px;">
                                <div style="height: 85px; width: 100%; overflow: hidden; text-align: center;">
                                    <img src="{{ $item['src'] }}" style="max-height: 85px; max-width: 100%;" alt="{{ $item['label'] }}">
                                </div>
                                <div style="font-size: 7.5px; color: #1f2937; padding-top: 2px; font-weight: bold;">
                                    {{ $item['label'] }}
                                </div>
                            </div>
                        </td>
                        @if(($idx + 1) % 4 === 0 && !$loop->last)
                            </tr><tr>
                        @endif
                    @endforeach
                    @php
                        $remainder = count($allAttachmentPhotos) % 4;
                    @endphp
                    @if($remainder > 0)
                        @for($k = 0; $k < (4 - $remainder); $k++)
                            <td style="width: 25%;"></td>
                        @endfor
                    @endif
                </tr>
            </table>
        </div>
    @endif
</body>
</html>
