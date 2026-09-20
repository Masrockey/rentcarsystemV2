<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get the latest notifications and unread count for the authenticated user (JSON response for navbar bell polling).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['notifications' => [], 'unread_count' => 0]);
        }

        $limit = (int) $request->query('limit', 15);
        $notifications = AppNotification::where('user_id', $user->id)
            ->latest('id')
            ->take($limit)
            ->get();

        $unreadCount = AppNotification::where('user_id', $user->id)
            ->unread()
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, AppNotification $notification): JsonResponse|RedirectResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403, 'Akses ditolak.');
        }

        $notification->markAsRead();

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Notifikasi ditandai telah dibaca.']);
        }

        return back();
    }

    /**
     * Mark all notifications of the authenticated user as read.
     */
    public function markAllAsRead(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        AppNotification::where('user_id', $user->id)
            ->unread()
            ->update(['read_at' => now()]);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Semua notifikasi ditandai telah dibaca.']);
        }

        return back();
    }

    /**
     * Delete a specific notification.
     */
    public function destroy(Request $request, AppNotification $notification): JsonResponse|RedirectResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403, 'Akses ditolak.');
        }

        $notification->delete();

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Notifikasi berhasil dihapus.']);
        }

        return back();
    }
}
