<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\WaServerSetting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected WaServerSetting $setting;

    public function __construct(?WaServerSetting $setting = null)
    {
        $this->setting = $setting ?? WaServerSetting::current();
    }

    /**
     * Get configured HTTP client with base URL, headers, timeouts, and auth.
     */
    protected function client(?string $deviceId = null): PendingRequest
    {
        $baseUrl = rtrim($this->setting->server_url ?: 'http://localhost:3000', '/');
        $activeDeviceId = $deviceId ?: ($this->setting->device_id ?: 'rentcars_main');

        $request = Http::baseUrl($baseUrl)
            ->withoutVerifying()
            ->timeout(12)
            ->connectTimeout(5)
            ->withHeaders([
                'Accept' => 'application/json',
                'X-Device-Id' => $activeDeviceId,
            ]);

        if (! empty($this->setting->auth_username) && ! empty($this->setting->auth_password)) {
            $request = $request->withBasicAuth($this->setting->auth_username, $this->setting->auth_password);
        }

        return $request;
    }

    /**
     * Format Indonesian / international phone number for WhatsApp API (e.g. 0812 -> 62812).
     */
    public static function formatPhone(string $phone): string
    {
        $trimmed = trim($phone);

        if (str_ends_with($trimmed, '@g.us') || str_ends_with($trimmed, '@s.whatsapp.net')) {
            return $trimmed;
        }

        $cleaned = preg_replace('/[^0-9]/', '', $trimmed) ?? '';

        if (str_starts_with($cleaned, '0')) {
            return '62'.substr($cleaned, 1);
        }

        if (str_starts_with($cleaned, '8')) {
            return '62'.$cleaned;
        }

        return $cleaned;
    }

    /**
     * Extract a user-friendly error message from a non-successful HTTP response.
     */
    protected function extractErrorMessage(Response $res, string $defaultMessage = 'Permintaan gagal'): string
    {
        $status = $res->status();

        if ($status === 401) {
            return 'Autentikasi WA Server gagal (HTTP 401 Unauthorized): Username atau Password Basic Auth tidak cocok. Silakan periksa pengaturan Username dan Password WA Server.';
        }

        if ($status === 403) {
            return 'Akses ditolak oleh WA Server (HTTP 403 Forbidden).';
        }

        if ($status === 404) {
            return 'Endpoint tidak ditemukan di WA Server (HTTP 404 Not Found). Pastikan URL server benar.';
        }

        $serverMsg = $res->json('message') ?? $res->json('error');
        if (! empty($serverMsg) && is_string($serverMsg)) {
            return $serverMsg;
        }

        $body = trim($res->body());
        if (! empty($body) && strlen($body) < 200 && ! str_contains($body, '<html')) {
            return "HTTP {$status}: {$body}";
        }

        return "HTTP {$status}: {$defaultMessage}";
    }

    /**
     * Check WA Server Health and Info.
     *
     * @return array{healthy: bool, info: ?array, error: ?string}
     */
    public function getServerHealth(): array
    {
        try {
            $res = $this->client()->get('/app/info');

            if ($res->successful()) {
                return [
                    'healthy' => true,
                    'info' => $res->json('results') ?? $res->json(),
                    'error' => null,
                ];
            }

            if ($res->status() === 401) {
                return [
                    'healthy' => false,
                    'info' => null,
                    'error' => 'Server online, tetapi autentikasi gagal (HTTP 401 Unauthorized): Username atau Password salah. Periksa pengaturan Basic Auth di bawah.',
                ];
            }

            // Fallback to /health
            $healthRes = $this->client()->get('/health');
            if ($healthRes->successful()) {
                return [
                    'healthy' => true,
                    'info' => ['version' => 'v9.0.0', 'status' => 'OK'],
                    'error' => null,
                ];
            }

            return [
                'healthy' => false,
                'info' => null,
                'error' => $this->extractErrorMessage($res, 'Koneksi ke WA Server gagal.'),
            ];
        } catch (\Throwable $e) {
            return [
                'healthy' => false,
                'info' => null,
                'error' => 'Gagal terhubung ke WA Server: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Get Device Connection Status.
     *
     * @return array{is_connected: bool, is_logged_in: bool, device_id: string, jid: ?string, phone: ?string, raw: ?array, error: ?string}
     */
    public function getStatus(?string $deviceId = null): array
    {
        $activeDeviceId = $deviceId ?: ($this->setting->device_id ?: 'rentcars_main');

        try {
            $res = $this->client($activeDeviceId)->get('/app/status');

            if ($res->successful()) {
                $data = $res->json('results') ?? $res->json();
                $jid = $data['jid'] ?? null;
                $phone = null;

                if ($jid && str_contains($jid, '@')) {
                    $phone = explode('@', $jid)[0];
                    if (str_contains($phone, ':')) {
                        $phone = explode(':', $phone)[0];
                    }
                }

                return [
                    'is_connected' => (bool) ($data['is_connected'] ?? false),
                    'is_logged_in' => (bool) ($data['is_logged_in'] ?? false),
                    'device_id' => $data['device_id'] ?? $activeDeviceId,
                    'jid' => $jid,
                    'phone' => $phone,
                    'raw' => $data,
                    'error' => null,
                ];
            }

            return [
                'is_connected' => false,
                'is_logged_in' => false,
                'device_id' => $activeDeviceId,
                'jid' => null,
                'phone' => null,
                'raw' => null,
                'error' => $this->extractErrorMessage($res, 'Status tidak dapat diambil.'),
            ];
        } catch (\Throwable $e) {
            return [
                'is_connected' => false,
                'is_logged_in' => false,
                'device_id' => $activeDeviceId,
                'jid' => null,
                'phone' => null,
                'raw' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get QR Code for WhatsApp Pairing.
     *
     * @return array{success: bool, qr_link: ?string, qr_duration: int, raw: ?array, error: ?string}
     */
    public function getQrLogin(?string $deviceId = null): array
    {
        $activeDeviceId = $deviceId ?: ($this->setting->device_id ?: 'rentcars_main');

        try {
            $res = $this->client($activeDeviceId)->get('/app/login');

            if ($res->successful()) {
                $results = $res->json('results') ?? $res->json();
                $qrLink = $results['qr_link'] ?? $results['qr_code'] ?? $results['qr'] ?? null;

                if ($qrLink && ! str_starts_with($qrLink, 'http') && ! str_starts_with($qrLink, 'data:image')) {
                    $baseUrl = rtrim($this->setting->server_url, '/');
                    $qrLink = $baseUrl.'/'.ltrim($qrLink, '/');
                }

                return [
                    'success' => true,
                    'qr_link' => $qrLink,
                    'qr_duration' => (int) ($results['qr_duration'] ?? 20),
                    'raw' => $results,
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'qr_link' => null,
                'qr_duration' => 20,
                'raw' => null,
                'error' => $this->extractErrorMessage($res, 'Gagal membuat QR Login dari WA Server.'),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'qr_link' => null,
                'qr_duration' => 20,
                'raw' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get 8-character Pairing Code for Phone Number.
     *
     * @return array{success: bool, pair_code: ?string, error: ?string}
     */
    public function getPairingCode(string $phone, ?string $deviceId = null): array
    {
        $activeDeviceId = $deviceId ?: ($this->setting->device_id ?: 'rentcars_main');
        $formattedPhone = self::formatPhone($phone);

        try {
            $res = $this->client($activeDeviceId)->get('/app/login-with-code', [
                'phone' => $formattedPhone,
            ]);

            if ($res->successful()) {
                $results = $res->json('results') ?? $res->json();
                $pairCode = $results['pair_code'] ?? $results['code'] ?? null;

                return [
                    'success' => true,
                    'pair_code' => $pairCode,
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'pair_code' => null,
                'error' => $this->extractErrorMessage($res, 'Gagal meminta kode pairing.'),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'pair_code' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Reconnect Active Device to WhatsApp Server.
     *
     * @return array{success: bool, message: string}
     */
    public function reconnect(?string $deviceId = null): array
    {
        $activeDeviceId = $deviceId ?: ($this->setting->device_id ?: 'rentcars_main');

        try {
            $res = $this->client($activeDeviceId)->get('/app/reconnect');

            return [
                'success' => $res->successful(),
                'message' => $res->successful()
                    ? ($res->json('message') ?? 'Perintah reconnect berhasil dikirim.')
                    : $this->extractErrorMessage($res, 'Gagal reconnect.'),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Error: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Logout / Disconnect Device (Session cleared, slot kept).
     *
     * @return array{success: bool, message: string}
     */
    public function logout(?string $deviceId = null): array
    {
        $activeDeviceId = $deviceId ?: ($this->setting->device_id ?: 'rentcars_main');

        try {
            $res = $this->client($activeDeviceId)->get('/app/logout');

            return [
                'success' => $res->successful(),
                'message' => $res->successful()
                    ? ($res->json('message') ?? 'Device berhasil logout.')
                    : $this->extractErrorMessage($res, 'Gagal logout device.'),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Error: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Get list of registered devices from WA API.
     *
     * @return array<int, array>
     */
    public function listDevices(): array
    {
        try {
            $res = $this->client()->get('/devices');

            if ($res->successful()) {
                $devices = $res->json('results') ?? $res->json('data') ?? $res->json();

                return is_array($devices) ? $devices : [];
            }

            // Try fallback endpoint /app/devices
            $fallbackRes = $this->client()->get('/app/devices');
            if ($fallbackRes->successful()) {
                $fallbackDevices = $fallbackRes->json('results') ?? $fallbackRes->json('data') ?? $fallbackRes->json();

                return is_array($fallbackDevices) ? $fallbackDevices : [];
            }

            return [];
        } catch (\Throwable $e) {
            Log::warning('Failed to list WA devices: '.$e->getMessage());

            return [];
        }
    }

    /**
     * Add a new device slot on WA API.
     *
     * @return array{success: bool, message: string, data: ?array}
     */
    public function addDevice(string $deviceId, ?string $webhookUrl = null, ?string $webhookSecret = null): array
    {
        try {
            $payload = [
                'device_id' => $deviceId,
            ];
            if ($webhookUrl) {
                $payload['webhook_url'] = $webhookUrl;
            }
            if ($webhookSecret) {
                $payload['webhook_secret'] = $webhookSecret;
            }

            $res = $this->client()->post('/devices', $payload);

            return [
                'success' => $res->successful(),
                'message' => $res->json('message') ?? ($res->successful() ? 'Device berhasil ditambahkan.' : 'Gagal menambah device.'),
                'data' => $res->json('results') ?? $res->json(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Error: '.$e->getMessage(),
                'data' => null,
            ];
        }
    }

    /**
     * Delete a device slot from WA API.
     *
     * @return array{success: bool, message: string}
     */
    public function deleteDevice(string $deviceId): array
    {
        try {
            $res = $this->client()->delete("/devices/{$deviceId}");

            return [
                'success' => $res->successful(),
                'message' => $res->json('message') ?? ($res->successful() ? 'Device berhasil dihapus.' : 'Gagal menghapus device.'),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Error: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Send WhatsApp text message.
     *
     * @return array{success: bool, message_id: ?string, message: string, raw: ?array}
     */
    public function sendMessage(string $phone, string $message, ?string $replyMessageId = null, ?string $deviceId = null): array
    {
        $activeDeviceId = $deviceId ?: ($this->setting->device_id ?: 'rentcars_main');
        $formattedPhone = self::formatPhone($phone);

        try {
            $payload = [
                'phone' => $formattedPhone,
                'message' => $message,
            ];

            if ($replyMessageId) {
                $payload['reply_message_id'] = $replyMessageId;
            }

            $res = $this->client($activeDeviceId)->post('/send/message', $payload);

            if ($res->successful()) {
                $results = $res->json('results') ?? $res->json();
                $messageId = $results['message_id'] ?? $results['id'] ?? null;

                return [
                    'success' => true,
                    'message_id' => $messageId,
                    'message' => 'Pesan WhatsApp berhasil dikirim.',
                    'raw' => $results,
                ];
            }

            return [
                'success' => false,
                'message_id' => null,
                'message' => $this->extractErrorMessage($res, 'Gagal mengirim pesan WhatsApp.'),
                'raw' => $res->json(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message_id' => null,
                'message' => 'Error: '.$e->getMessage(),
                'raw' => null,
            ];
        }
    }

    /**
     * Send file or document attachment via WhatsApp API.
     *
     * @return array{success: bool, message_id: ?string, message: string, raw: ?array}
     */
    public function sendFile(string $phone, string $fileContentOrPath, ?string $caption = null, ?string $filename = null, ?string $deviceId = null): array
    {
        $activeDeviceId = $deviceId ?: ($this->setting->device_id ?: 'rentcars_main');
        $formattedPhone = self::formatPhone($phone);

        try {
            if (is_string($fileContentOrPath) && strlen($fileContentOrPath) < 4096 && @is_file($fileContentOrPath)) {
                $contents = file_get_contents($fileContentOrPath);
                $name = $filename ?: basename($fileContentOrPath);
            } else {
                $contents = $fileContentOrPath;
                $name = $filename ?: 'checklist.pdf';
            }

            $data = ['phone' => $formattedPhone];
            if ($caption) {
                $data['caption'] = $caption;
            }

            $res = $this->client($activeDeviceId)
                ->timeout(90)
                ->connectTimeout(15)
                ->attach('file', $contents, $name)
                ->post('/send/file', $data);

            if ($res->successful()) {
                $results = $res->json('results') ?? $res->json();
                $messageId = $results['message_id'] ?? $results['id'] ?? null;

                return [
                    'success' => true,
                    'message_id' => $messageId,
                    'message' => 'File WhatsApp berhasil dikirim.',
                    'raw' => $results,
                ];
            }

            return [
                'success' => false,
                'message_id' => null,
                'message' => $this->extractErrorMessage($res, 'Gagal mengirim file WhatsApp.'),
                'raw' => $res->json(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message_id' => null,
                'message' => 'Error: '.$e->getMessage(),
                'raw' => null,
            ];
        }
    }

    /**
     * Get list of WhatsApp groups the connected account is member of.
     *
     * @return array<int, array{jid: string, name: string}>
     */
    public function getMyGroups(?string $deviceId = null): array
    {
        $activeDeviceId = $deviceId ?: ($this->setting->device_id ?: 'rentcars_main');

        try {
            $res = $this->client($activeDeviceId)->get('/user/my/groups');

            if ($res->successful()) {
                $json = $res->json();
                $results = $json['results'] ?? $json['data'] ?? $json;

                if (isset($results['data']) && is_array($results['data'])) {
                    $results = $results['data'];
                }

                if (! is_array($results)) {
                    return [];
                }

                $groups = [];
                foreach ($results as $item) {
                    if (is_array($item)) {
                        $jid = $item['jid'] ?? $item['id'] ?? $item['JID'] ?? $item['group_id'] ?? null;
                        $name = $item['name'] ?? $item['subject'] ?? $item['Subject'] ?? $item['Name'] ?? $item['group_name'] ?? $jid;
                        if ($jid) {
                            $groups[] = [
                                'jid' => (string) $jid,
                                'name' => (string) ($name ?: $jid),
                            ];
                        }
                    }
                }

                usort($groups, fn ($a, $b) => strcasecmp($a['name'], $b['name']));

                return $groups;
            }

            return [];
        } catch (\Throwable $e) {
            Log::warning('Failed to fetch WA groups: '.$e->getMessage());

            return [];
        }
    }

    /**
     * Send new booking notification to the configured WhatsApp group.
     */
    public static function sendNewBookingNotification(Booking $booking): bool
    {
        try {
            $setting = WaServerSetting::current();

            if (empty($setting->target_group_jid)) {
                Log::info('WA booking notification skipped: target_group_jid is not configured.');

                return false;
            }

            $booking->loadMissing(['customer', 'user', 'car', 'payment']);

            $customerName = $booking->customer?->name ?? '-';
            $rawPhone = trim($booking->customer?->phone ?? '');
            if ($rawPhone !== '' && strlen($rawPhone) > 5) {
                $customerPhone = substr($rawPhone, 0, -5).'XXXXX';
            } elseif ($rawPhone !== '') {
                $customerPhone = 'XXXXX';
            } else {
                $customerPhone = '-';
            }
            $rentalType = $booking->rental_type ?? 'Lepas Kunci';
            $carType = $booking->car_type ?? ($booking->car?->name ?? '-');

            $mulai = $booking->booking_date
                ? Carbon::parse($booking->booking_date)->format('d/m/Y').($booking->pickup_time ? ' '.substr($booking->pickup_time, 0, 5) : '')
                : '-';

            $selesai = $booking->return_date
                ? Carbon::parse($booking->return_date)->format('d/m/Y').($booking->return_time ? ' '.substr($booking->return_time, 0, 5) : '')
                : '-';

            $durasi = $booking->duration_days ?? 'Hari';
            $marketingPhone = $booking->user?->phone ?? auth()->user()?->phone ?? '-';
            $pickupLocation = $booking->pickup_location ?: '-';
            $dropoffLocation = $booking->dropoff_location ?: '-';
            $marketingName = $booking->user?->name ?? auth()->user()?->name ?? 'System';
            $createdByName = auth()->user()?->name ?? $booking->user?->name ?? 'System';
            $createdAt = $booking->created_at ? $booking->created_at->format('d/m/Y H:i') : now()->format('d/m/Y H:i');

            // Format Rincian Biaya & Pembayaran
            $durationDays = max(1, (int) ($booking->duration_days ?: 1));
            $durationType = $booking->duration_type ?? 'Hari';
            $unitLabel = ($durationType === '24 Jam') ? 'x 24 jam' : 'hari';

            $price = (float) ($booking->price ?? 0);
            $deliveryFee = (float) ($booking->delivery_fee ?? 0);
            $driverFee = (float) ($booking->driver_fee ?? 0);

            if ($price <= 0 && (float) ($booking->amount ?? 0) > 0) {
                $calculatedSubtotal = max(0, (float) $booking->amount - $deliveryFee - $driverFee);
                $price = $durationDays > 0 ? ($calculatedSubtotal / $durationDays) : $calculatedSubtotal;
            }

            $subtotal = $price * $durationDays;
            $totalTagihan = ($booking->amount && (float) $booking->amount > 0)
                ? (float) $booking->amount
                : ($subtotal + $deliveryFee + $driverFee);

            $formattedPrice = number_format($price, 0, ',', '.');
            $formattedSubtotal = number_format($subtotal, 0, ',', '.');
            $formattedTotalTagihan = number_format($totalTagihan, 0, ',', '.');

            $totalBayar = 0;
            if ($booking->payment) {
                if ($booking->payment->status === 'Lunas') {
                    $totalBayar = $totalTagihan;
                } elseif ($booking->payment->status === 'DP Dibayar') {
                    $totalBayar = (float) $booking->payment->dp_amount;
                }
            } elseif ($booking->payment_status === 'Paid') {
                $totalBayar = $totalTagihan;
            } elseif ($booking->dp_amount && (float) $booking->dp_amount > 0) {
                $totalBayar = (float) $booking->dp_amount;
            }

            $sisa = max(0, $totalTagihan - $totalBayar);
            $formattedTotalBayar = number_format($totalBayar, 0, ',', '.');
            $formattedSisa = number_format($sisa, 0, ',', '.');

            $statusBayar = match ($booking->payment?->status ?? $booking->payment_status) {
                'Lunas', 'Paid' => 'Lunas',
                'DP Dibayar', 'Down Payment' => 'DP Dibayar',
                default => ($totalBayar > 0 ? 'DP Dibayar' : 'Belum Bayar'),
            };

            $rincianBiayaText = "*--- Rincian Biaya ---*\n"
                ."{$durationDays} {$unitLabel} x Rp {$formattedPrice} = Rp {$formattedSubtotal}\n";

            if ($deliveryFee > 0) {
                $formattedDeliveryFee = number_format($deliveryFee, 0, ',', '.');
                $rincianBiayaText .= "*Fee Pengantaran =* Rp {$formattedDeliveryFee}\n";
            }

            if ($driverFee > 0) {
                $formattedDriverFee = number_format($driverFee, 0, ',', '.');
                $rincianBiayaText .= "*Fee Driver =* Rp {$formattedDriverFee}\n";
            }

            $rincianBiayaText .= "─────────────────────\n"
                ."*TOTAL TAGIHAN =* Rp {$formattedTotalTagihan}\n\n";

            $pembayaranText = "*--- Pembayaran ---*\n"
                ."*Total Bayar =* Rp {$formattedTotalBayar}\n"
                ."*Sisa =* Rp {$formattedSisa}\n"
                ."*Status:* {$statusBayar}\n\n";

            $message = "━━━━━━━━━━━━━━━━━━━━\n"
                ."*PT. Cahaya Auto Nusantara*\n"
                ."*DETAIL BOOKING*\n"
                ."━━━━━━━━━━━━━━━━━━━━\n"
                ."*No. Booking:* {$booking->booking_number}\n"
                ."*Customer:* {$customerName}\n"
                ."*Telepon:* {$customerPhone}\n"
                ."*Type:* {$rentalType}\n\n"
                ."*--- Kendaraan ---*\n"
                ."*Mobil:* {$carType}\n\n"
                ."*--- Waktu Sewa ---*\n"
                ."*Mulai:* {$mulai}\n"
                ."*Selesai:* {$selesai}\n"
                ."*Durasi:* {$durasi}\n"
                ."*Lokasi Pengambilan:* {$pickupLocation}\n"
                ."*Lokasi Pengembalian:* {$dropoffLocation}\n\n"
                .$rincianBiayaText
                .$pembayaranText
                ."*--- Marketing ---*\n"
                ."*Marketing:* {$marketingName}\n"
                ."*Telepon:* {$marketingPhone}\n\n"
                ."*Dibuat pada:* {$createdAt}\n"
                ."*Dibuat Oleh:* {$createdByName}\n"
                .'━━━━━━━━━━━━━━━━━━━━';

            $waService = new self($setting);
            $res = $waService->sendMessage($setting->target_group_jid, $message);

            if (! ($res['success'] ?? false)) {
                Log::warning('Failed to send booking WA notification to group: '.($res['message'] ?? 'Unknown error'));

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Error sending booking WA notification: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Generate BAST checklist PDF file binary string.
     */
    public static function generateChecklistPdf(Booking $booking, string $type = 'delivery', ?string $officerName = null): ?string
    {
        try {
            $booking->loadMissing(['customer', 'car', 'user', 'peluncur', 'rental']);

            $checklistData = $type === 'delivery'
                ? ($booking->delivery_checklist ?? [])
                : ($booking->return_checklist ?? []);

            $pdf = Pdf::loadView('pdf.checklist', [
                'booking' => $booking,
                'type' => $type,
                'officerName' => $officerName,
                'checklistData' => $checklistData,
            ]);

            $pdf->setPaper('a4', 'portrait');
            $pdf->setOption('enable_font_subsetting', true);
            $pdf->setOption('isRemoteEnabled', true);

            return $pdf->output();
        } catch (\Throwable $e) {
            Log::error('Failed to generate checklist PDF: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Send unit delivery / handover notification and PDF to the configured WhatsApp group.
     */
    public static function sendDeliveryNotification(Booking $booking, ?string $officerName = null): bool
    {
        try {
            $setting = WaServerSetting::current();

            if (empty($setting->target_group_jid)) {
                Log::info('WA delivery notification skipped: target_group_jid is not configured.');

                return false;
            }

            $booking->loadMissing(['customer', 'user', 'car', 'peluncur', 'rental']);

            $customerName = $booking->customer?->name ?? '-';
            $rawPhone = trim($booking->customer?->phone ?? '');
            if ($rawPhone !== '' && strlen($rawPhone) > 5) {
                $customerPhone = substr($rawPhone, 0, -5).'XXXXX';
            } elseif ($rawPhone !== '') {
                $customerPhone = 'XXXXX';
            } else {
                $customerPhone = '-';
            }

            $rentalType = $booking->rental_type ?? 'Lepas Kunci';
            $carName = $booking->car?->name ?? ($booking->car_type ?: '-');
            $plateNumber = $booking->car?->plate_number ?? '-';

            $deliveryData = $booking->delivery_checklist ?? [];
            $lokasiAntar = $deliveryData['handover_location'] ?? ($booking->pickup_location ?: '-');
            $kmKeluar = $deliveryData['km_out'] ?? ($booking->car?->last_km ?: '-');
            $peluncurName = $booking->peluncur?->name ?? ($officerName ?? '-');

            $diantarPada = null;
            if (! empty($deliveryData['checkout_datetime'])) {
                $diantarPada = Carbon::parse($deliveryData['checkout_datetime'])->format('d/m/Y H:i');
            } elseif (! empty($deliveryData['checkout_date'])) {
                $rawDate = (string) $deliveryData['checkout_date'];
                if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $rawDate)) {
                    $dateFormatted = $rawDate;
                } else {
                    try {
                        $dateFormatted = Carbon::parse($rawDate)->format('d/m/Y');
                    } catch (\Throwable) {
                        $dateFormatted = $rawDate;
                    }
                }
                $timeFormatted = ! empty($deliveryData['checkout_time']) ? substr($deliveryData['checkout_time'], 0, 5) : date('H:i');
                $diantarPada = "{$dateFormatted} {$timeFormatted}";
            } else {
                $diantarPada = now()->format('d/m/Y H:i');
            }

            $marketingName = $booking->user?->name ?? '-';
            $dibuatOleh = $officerName ?? auth()->user()?->name ?? 'Petugas';

            $message = "━━━━━━━━━━━━━━━━━━━━\n"
                ."*PT. Cahaya Auto Nusantara*\n"
                ."*Serah Terima Unit / Unit Keluar*\n"
                ."━━━━━━━━━━━━━━━━━━━━\n"
                ."*No. Booking:* {$booking->booking_number}\n"
                ."*Customer:* {$customerName}\n"
                ."*Telepon:* {$customerPhone}\n"
                ."*Type:* {$rentalType}\n\n"
                ."*--- Kendaraan ---*\n"
                ."*Nama Kendaraan:* {$carName}\n"
                ."*No. Polisi:* {$plateNumber}\n"
                ."*Lokasi Antar:* {$lokasiAntar}\n"
                ."*KM Keluar (Awal):* {$kmKeluar}\n\n"
                ."*--- Petugas ---*\n"
                ."*Peluncur:* {$peluncurName}\n"
                ."*Diantar pada:* {$diantarPada}\n\n"
                ."*Marketing:* {$marketingName}\n"
                ."*Dibuat Oleh:* {$dibuatOleh}\n"
                .'━━━━━━━━━━━━━━━━━━━━';

            $waService = new self($setting);
            $res = $waService->sendMessage($setting->target_group_jid, $message);

            if (! ($res['success'] ?? false)) {
                Log::warning('Failed to send delivery WA notification message to group: '.($res['message'] ?? 'Unknown error'));
            }

            // Generate and send Checklist PDF to the group
            $pdfContent = self::generateChecklistPdf($booking, 'delivery', $dibuatOleh);
            if ($pdfContent) {
                $fileName = "BAST-Keluar-{$booking->booking_number}.pdf";
                $fileRes = $waService->sendFile(
                    $setting->target_group_jid,
                    $pdfContent,
                    "📄 Lampiran PDF Checklist Serah Terima Unit ({$booking->booking_number})",
                    $fileName
                );

                if (! ($fileRes['success'] ?? false)) {
                    Log::warning('Failed to send delivery WA checklist PDF: '.($fileRes['message'] ?? 'Unknown error'));
                }
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Error sending delivery WA notification: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Send unit return notification and PDF to the configured WhatsApp group.
     */
    public static function sendReturnNotification(Booking $booking, ?string $officerName = null): bool
    {
        try {
            $setting = WaServerSetting::current();

            if (empty($setting->target_group_jid)) {
                Log::info('WA return notification skipped: target_group_jid is not configured.');

                return false;
            }

            $booking->loadMissing(['customer', 'user', 'car', 'peluncur', 'rental']);

            $customerName = $booking->customer?->name ?? '-';
            $rawPhone = trim($booking->customer?->phone ?? '');
            if ($rawPhone !== '' && strlen($rawPhone) > 5) {
                $customerPhone = substr($rawPhone, 0, -5).'XXXXX';
            } elseif ($rawPhone !== '') {
                $customerPhone = 'XXXXX';
            } else {
                $customerPhone = '-';
            }

            $rentalType = $booking->rental_type ?? 'Lepas Kunci';
            $carName = $booking->car?->name ?? ($booking->car_type ?: '-');
            $plateNumber = $booking->car?->plate_number ?? '-';

            $returnData = $booking->return_checklist ?? [];
            $lokasiAntar = $returnData['handover_location'] ?? ($booking->dropoff_location ?: ($booking->pickup_location ?: '-'));
            $kmMasuk = $returnData['km_out'] ?? ($booking->rental?->km_in ?? ($booking->car?->last_km ?: '-'));
            $peluncurName = $booking->peluncur?->name ?? ($officerName ?? '-');

            $diantarPada = null;
            if (! empty($returnData['checkout_datetime'])) {
                $diantarPada = Carbon::parse($returnData['checkout_datetime'])->format('d/m/Y H:i');
            } elseif (! empty($returnData['checkout_date'])) {
                $rawDate = (string) $returnData['checkout_date'];
                if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $rawDate)) {
                    $dateFormatted = $rawDate;
                } else {
                    try {
                        $dateFormatted = Carbon::parse($rawDate)->format('d/m/Y');
                    } catch (\Throwable) {
                        $dateFormatted = $rawDate;
                    }
                }
                $timeFormatted = ! empty($returnData['checkout_time']) ? substr($returnData['checkout_time'], 0, 5) : date('H:i');
                $diantarPada = "{$dateFormatted} {$timeFormatted}";
            } else {
                $diantarPada = now()->format('d/m/Y H:i');
            }

            $marketingName = $booking->user?->name ?? '-';
            $dibuatOleh = $officerName ?? auth()->user()?->name ?? 'Petugas';

            $message = "━━━━━━━━━━━━━━━━━━━━\n"
                ."*PT. Cahaya Auto Nusantara*\n"
                ."*Pengembalian Unit / Unit Masuk*\n"
                ."━━━━━━━━━━━━━━━━━━━━\n"
                ."*No. Booking:* {$booking->booking_number}\n"
                ."*Customer:* {$customerName}\n"
                ."*Telepon:* {$customerPhone}\n"
                ."*Type:* {$rentalType}\n\n"
                ."*--- Kendaraan ---*\n"
                ."*Nama Kendaraan:* {$carName}\n"
                ."*No. Polisi:* {$plateNumber}\n"
                ."*Lokasi Antar:* {$lokasiAntar}\n"
                ."*KM Masuk (Kembali):* {$kmMasuk}\n\n"
                ."*--- Petugas ---*\n"
                ."*Peluncur:* {$peluncurName}\n"
                ."*Diantar pada:* {$diantarPada}\n\n"
                ."*Marketing:* {$marketingName}\n"
                ."*Dibuat Oleh:* {$dibuatOleh}\n"
                .'━━━━━━━━━━━━━━━━━━━━';

            $waService = new self($setting);
            $res = $waService->sendMessage($setting->target_group_jid, $message);

            if (! ($res['success'] ?? false)) {
                Log::warning('Failed to send return WA notification message to group: '.($res['message'] ?? 'Unknown error'));
            }

            // Generate and send Checklist PDF to the group
            $pdfContent = self::generateChecklistPdf($booking, 'return', $dibuatOleh);
            if ($pdfContent) {
                $fileName = "BAST-Kembali-{$booking->booking_number}.pdf";
                $fileRes = $waService->sendFile(
                    $setting->target_group_jid,
                    $pdfContent,
                    "📄 Lampiran PDF Checklist Pengembalian Unit ({$booking->booking_number})",
                    $fileName
                );

                if (! ($fileRes['success'] ?? false)) {
                    Log::warning('Failed to send return WA checklist PDF: '.($fileRes['message'] ?? 'Unknown error'));
                }
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Error sending return WA notification: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Calculate rental duration string from booking dates and times.
     */
    public static function calculateDuration(Booking $booking): string
    {
        if (! $booking->booking_date) {
            return '-';
        }

        $startDateStr = Carbon::parse($booking->booking_date)->format('Y-m-d');
        $endDateStr = $booking->return_date
            ? Carbon::parse($booking->return_date)->format('Y-m-d')
            : $startDateStr;

        $startTimeStr = $booking->pickup_time ? substr($booking->pickup_time, 0, 5) : null;
        $endTimeStr = $booking->return_time ? substr($booking->return_time, 0, 5) : null;

        if ($startTimeStr && $endTimeStr) {
            $start = Carbon::parse("{$startDateStr} {$startTimeStr}");
            $end = Carbon::parse("{$endDateStr} {$endTimeStr}");

            if ($end->greaterThanOrEqualTo($start)) {
                $totalMinutes = $start->diffInMinutes($end);
                $totalHours = (int) floor($totalMinutes / 60);
                $remainingMins = $totalMinutes % 60;
                $days = (int) floor($totalHours / 24);
                $remainingHours = $totalHours % 24;

                if ($start->isSameDay($end)) {
                    $hourText = $totalHours > 0 ? "{$totalHours} Jam" : '';
                    if ($remainingMins > 0) {
                        $hourText .= ($hourText ? ' ' : '')."{$remainingMins} Menit";
                    }

                    return $hourText ? "1 Hari ({$hourText})" : '1 Hari';
                }

                if ($days > 0 && $remainingHours === 0 && $remainingMins === 0) {
                    return "{$days} Hari";
                }

                if ($days > 0) {
                    $parts = ["{$days} Hari"];
                    if ($remainingHours > 0) {
                        $parts[] = "{$remainingHours} Jam";
                    }
                    if ($remainingMins > 0) {
                        $parts[] = "{$remainingMins} Menit";
                    }

                    return implode(' ', $parts);
                }

                $hourText = $totalHours > 0 ? "{$totalHours} Jam" : '';
                if ($remainingMins > 0) {
                    $hourText .= ($hourText ? ' ' : '')."{$remainingMins} Menit";
                }

                return $hourText ?: '1 Hari';
            }
        }

        $start = Carbon::parse($startDateStr);
        $end = Carbon::parse($endDateStr);

        if ($start->isSameDay($end)) {
            return '1 Hari';
        }

        $days = $start->diffInDays($end);

        return $days > 0 ? "{$days} Hari" : '1 Hari';
    }
}
