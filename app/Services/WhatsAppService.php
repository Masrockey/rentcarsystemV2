<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\WaServerSetting;
use Illuminate\Http\Client\PendingRequest;
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
                'error' => "Server merespons status HTTP {$res->status()}",
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
                'error' => "HTTP {$res->status()}: ".($res->json('message') ?? 'Status tidak dapat diambil'),
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
                'error' => $res->json('message') ?? 'Gagal membuat QR Login dari WA Server',
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
                'error' => $res->json('message') ?? 'Gagal meminta kode pairing.',
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
                'message' => $res->json('message') ?? ($res->successful() ? 'Perintah reconnect berhasil dikirim.' : 'Gagal reconnect.'),
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
                'message' => $res->json('message') ?? ($res->successful() ? 'Device berhasil logout.' : 'Gagal logout device.'),
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
                'message' => $res->json('message') ?? "Gagal mengirim pesan (HTTP {$res->status()})",
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

            $booking->loadMissing(['customer', 'user', 'car']);

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

            $pickupLocation = $booking->pickup_location ?: '-';
            $dropoffLocation = $booking->dropoff_location ?: '-';
            $marketingName = $booking->user?->name ?? auth()->user()?->name ?? 'System';
            $createdAt = $booking->created_at ? $booking->created_at->format('d/m/Y H:i') : now()->format('d/m/Y H:i');

            $message = "━━━━━━━━━━━━━━━━━━━━\n"
                ."PT. Cahaya Auto Nusantara\n"
                ."DETAIL BOOKING\n"
                ."━━━━━━━━━━━━━━━━━━━━\n"
                ."No. Booking: {$booking->booking_number}\n"
                ."Customer: {$customerName}\n"
                ."Telepon: {$customerPhone}\n"
                ."Type: {$rentalType}\n\n"
                ."--- Kendaraan ---\n"
                ."Mobil: {$carType}\n\n"
                ."--- Waktu Sewa ---\n"
                ."Mulai: {$mulai}\n"
                ."Selesai: {$selesai}\n"
                ."Lokasi Pengambilan: {$pickupLocation}\n"
                ."Lokasi Pengembalian: {$dropoffLocation}\n\n"
                ."Marketing: {$marketingName}\n"
                ."Dibuat pada: {$createdAt}\n"
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
}
