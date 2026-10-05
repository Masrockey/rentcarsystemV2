<?php

namespace App\Http\Controllers;

use App\Models\WaServerSetting;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WaServerController extends Controller
{
    /**
     * Check role access - Super Admin only.
     */
    protected function checkAccess(Request $request): void
    {
        $user = $request->user();
        if (! $user?->isSuperAdmin()) {
            abort(403, 'Akses ditolak. Menu WA Server hanya dapat diakses oleh Super Administrator.');
        }
    }

    /**
     * Display the WA Server connection & management page.
     */
    public function index(Request $request): Response
    {
        $this->checkAccess($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $serverHealth = $waService->getServerHealth();
        $status = $waService->getStatus();
        $devices = $waService->listDevices();
        $groups = ($status['is_logged_in'] ?? false) ? $waService->getMyGroups() : [];

        return Inertia::render('wa-server/index', [
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
            'serverHealth' => $serverHealth,
            'connectionStatus' => $status,
            'devices' => $devices,
            'groups' => $groups,
        ]);
    }

    /**
     * Update server connection settings.
     */
    public function updateSettings(Request $request): RedirectResponse
    {
        $this->checkAccess($request);

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

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pengaturan WA Server berhasil disimpan.',
        ]);

        return to_route('wa-server.index');
    }

    /**
     * Get live QR code for scanning.
     */
    public function getQr(Request $request): JsonResponse
    {
        $this->checkAccess($request);

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
        $this->checkAccess($request);

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
     * Check real-time connection status (polling endpoint).
     */
    public function checkStatus(Request $request): JsonResponse
    {
        $this->checkAccess($request);

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
    public function reconnect(Request $request): JsonResponse|RedirectResponse
    {
        $this->checkAccess($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $deviceId = $request->input('device_id', $setting->device_id);
        $result = $waService->reconnect($deviceId);

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        Inertia::flash('toast', [
            'type' => $result['success'] ? 'success' : 'error',
            'message' => $result['message'],
        ]);

        return back();
    }

    /**
     * Logout / disconnect device.
     */
    public function logout(Request $request): JsonResponse|RedirectResponse
    {
        $this->checkAccess($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $deviceId = $request->input('device_id', $setting->device_id);
        $result = $waService->logout($deviceId);

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        Inertia::flash('toast', [
            'type' => $result['success'] ? 'success' : 'error',
            'message' => $result['message'],
        ]);

        return back();
    }

    /**
     * Create new device slot.
     */
    public function addDevice(Request $request): JsonResponse|RedirectResponse
    {
        $this->checkAccess($request);

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

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        Inertia::flash('toast', [
            'type' => $result['success'] ? 'success' : 'error',
            'message' => $result['message'],
        ]);

        return back();
    }

    /**
     * Delete device slot.
     */
    public function deleteDevice(Request $request, string $deviceId): JsonResponse|RedirectResponse
    {
        $this->checkAccess($request);

        $setting = WaServerSetting::current();
        $waService = new WhatsAppService($setting);

        $result = $waService->deleteDevice($deviceId);

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        Inertia::flash('toast', [
            'type' => $result['success'] ? 'success' : 'error',
            'message' => $result['message'],
        ]);

        return back();
    }

    /**
     * Get real-time WhatsApp groups list.
     */
    public function getGroups(Request $request): JsonResponse
    {
        $this->checkAccess($request);

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
     * Send test WhatsApp message.
     */
    public function sendTestMessage(Request $request): JsonResponse
    {
        $this->checkAccess($request);

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

    /**
     * Save target WhatsApp group for booking notifications.
     */
    public function setTargetGroup(Request $request): JsonResponse|RedirectResponse
    {
        $this->checkAccess($request);

        $validated = $request->validate([
            'target_group_jid' => ['nullable', 'string', 'max:255'],
            'target_group_name' => ['nullable', 'string', 'max:255'],
        ]);

        $setting = WaServerSetting::current();
        $setting->update($validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Grup notifikasi booking berhasil disimpan.',
                'target_group_jid' => $setting->target_group_jid,
                'target_group_name' => $setting->target_group_name,
            ]);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Grup notifikasi booking berhasil disimpan.',
        ]);

        return back();
    }
}
