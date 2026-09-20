<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends BaseApiController
{
    /**
     * Display a listing of user's notifications.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $limit = (int) $request->query('limit', 20);

        $notifications = AppNotification::where('user_id', $user->id)
            ->latest('id')
            ->paginate($limit);

        $unreadCount = AppNotification::where('user_id', $user->id)
            ->unread()
            ->count();

        return $this->sendResponse([
            'notifications' => $notifications->items(),
            'unread_count' => $unreadCount,
        ], 'Daftar notifikasi berhasil diambil.', 200, [
            'current_page' => $notifications->currentPage(),
            'last_page' => $notifications->lastPage(),
            'per_page' => $notifications->perPage(),
            'total' => $notifications->total(),
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, AppNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            return $this->sendError('Akses ditolak.', [], 403);
        }

        $notification->markAsRead();

        return $this->sendResponse(
            $notification->fresh(),
            'Notifikasi berhasil ditandai telah dibaca.'
        );
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();

        $count = AppNotification::where('user_id', $user->id)
            ->unread()
            ->update(['read_at' => now()]);

        return $this->sendResponse([
            'updated_count' => $count,
        ], "{$count} notifikasi berhasil ditandai telah dibaca.");
    }

    /**
     * Delete a notification.
     */
    public function destroy(Request $request, AppNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            return $this->sendError('Akses ditolak.', [], 403);
        }

        $notification->delete();

        return $this->sendResponse(null, 'Notifikasi berhasil dihapus.');
    }
}
