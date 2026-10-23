<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\WaServerSetting;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaServerController extends BaseApiController
{
    /**
     * Check role access - Super Admin only.
     */
    protected function checkSuperAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user?->isSuperAdmin()) {
            abort(403, 'Akses ditolak. Fitur WA Server hanya dapat diakses oleh Super Administrator.');
        }
    }

    /**
     * Display status, settings, devices, and groups of WA Server.
     */
    public function index(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $serverHealth = $waService->getServerHealth();
        $status = $waService->getStatus();
        $devices = $waService->listDevices();
        $groups = ($status['is_logged_in'] ?? false) ? $waService->getMyGroups() : [];

        return $this->sendResponse([
            'settings' => [
                'server_url' => $setting->server_url,
                'device_id' => $setting->device_id,
                'auth_username' => $setting->auth_username,
                'auth_password' => $setting->auth_password ? '********' : '',
                'has_password' => ! empty($setting->auth_password),
                'webhook_url' => $setting->webhook_url,
                'webhook_secret' => $setting->webhook_secret,
                'auto_reconnect' => (bool) $setting->auto_reconnect,
                'target_group_jid' => $setting->target_group_jid,
                'target_group_name' => $setting->target_group_name,
            ],
            'server_health' => $serverHealth,
            'connection_status' => $status,
            'devices' => $devices,
            'groups' => $groups,
        ], 'Status dan konfigurasi WA Server berhasil diambil.');
    }

    /**
     * Update WA server settings.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $validated = $request->validate([
            'server_url' => ['required', 'string', 'max:255'],
            'device_id' => ['required', 'string', 'max:100'],
            'auth_username' => ['nullable', 'string', 'max:100'],
            'auth_password' => ['nullable', 'string', 'max:100'],
            'webhook_url' => ['nullable', 'string', 'max:255'],
            'webhook_secret' => ['nullable', 'string', 'max:255'],
            'auto_reconnect' => ['boolean'],
            'target_group_jid' => ['nullable', 'string', 'max:255'],
            'target_group_name' => ['nullable', 'string', 'max:255'],
        ]);

        $setting = WaServerSetting::current();

        if (empty($validated['auth_password']) && $request->input('keep_password', true) && ! empty($setting->auth_password)) {
            unset($validated['auth_password']);
        }

        $setting->update($validated);

        return $this->sendResponse([
            'server_url' => $setting->server_url,
            'device_id' => $setting->device_id,
            'auth_username' => $setting->auth_username,
            'webhook_url' => $setting->webhook_url,
            'webhook_secret' => $setting->webhook_secret,
            'auto_reconnect' => (bool) $setting->auto_reconnect,
            'target_group_jid' => $setting->target_group_jid,
            'target_group_name' => $setting->target_group_name,
        ], 'Pengaturan WA Server berhasil diperbarui.');
    }

    /**
     * Get live QR code for scanning.
     */
    public function getQr(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $deviceId = $request->query('device_id', $setting->device_id);
        $qrResult = $waService->getQrLogin($deviceId);

        return response()->json($qrResult);
    }

    /**
     * Get pairing code for phone number.
     */
    public function getPairingCode(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $validated = $request->validate([
            'phone' => ['required', 'string', 'min:8', 'max:20'],
            'device_id' => ['nullable', 'string'],
        ]);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $deviceId = $validated['device_id'] ?? $setting->device_id;
        $result = $waService->getPairingCode($validated['phone'], $deviceId);

        return response()->json($result);
    }

    /**
     * Check real-time connection status.
     */
    public function checkStatus(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $deviceId = $request->query('device_id', $setting->device_id);
        $status = $waService->getStatus($deviceId);
        $health = $waService->getServerHealth();

        return response()->json([
            'status' => $status,
            'health' => $health,
        ]);
    }

    /**
     * Reconnect device.
     */
    public function reconnect(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $deviceId = $request->input('device_id', $setting->device_id);
        $result = $waService->reconnect($deviceId);

        return response()->json($result);
    }

    /**
     * Logout / disconnect device.
     */
    public function logout(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $deviceId = $request->input('device_id', $setting->device_id);
        $result = $waService->logout($deviceId);

        return response()->json($result);
    }

    /**
     * Create new device slot.
     */
    public function addDevice(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $validated = $request->validate([
            'device_id' => ['required', 'string', 'max:100'],
            'webhook_url' => ['nullable', 'string', 'max:255'],
            'webhook_secret' => ['nullable', 'string', 'max:255'],
        ]);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $result = $waService->addDevice(
            $validated['device_id'],
            $validated['webhook_url'] ?? null,
            $validated['webhook_secret'] ?? null
        );

        return response()->json($result);
    }

    /**
     * Delete device slot.
     */
    public function deleteDevice(Request $request, string $deviceId): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $result = $waService->deleteDevice($deviceId);

        return response()->json($result);
    }

    /**
     * Get real-time WhatsApp groups list.
     */
    public function getGroups(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $deviceId = $request->query('device_id', $setting->device_id);
        $groups = $waService->getMyGroups($deviceId);

        return response()->json([
            'success' => true,
            'groups' => $groups,
        ]);
    }

    /**
     * Save target WhatsApp group for booking notifications.
     */
    public function setTargetGroup(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $validated = $request->validate([
            'target_group_jid' => ['nullable', 'string', 'max:255'],
            'target_group_name' => ['nullable', 'string', 'max:255'],
        ]);

        $setting = WaServerSetting::current();
        $setting->update($validated);

        return $this->sendResponse([
            'target_group_jid' => $setting->target_group_jid,
            'target_group_name' => $setting->target_group_name,
        ], 'Grup notifikasi booking berhasil disimpan.');
    }

    /**
     * Send test WhatsApp message.
     */
    public function sendTestMessage(Request $request): JsonResponse
    {
        $this->checkSuperAdmin($request);

        $validated = $request->validate([
            'phone' => ['required', 'string', 'min:5', 'max:100'],
            'message' => ['required', 'string', 'max:2000'],
            'device_id' => ['nullable', 'string'],
        ]);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $deviceId = $validated['device_id'] ?? $setting->device_id;
        $result = $waService->sendMessage($validated['phone'], $validated['message'], null, $deviceId);

        return response()->json($result);
    }
}
