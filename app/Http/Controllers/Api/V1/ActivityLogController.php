<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends BaseApiController
{
    /**
     * Display a paginated listing of activity logs (Super Admin only).
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->isSuperAdmin()) {
            return $this->sendError('Akses ditolak. Menu Log Aktivitas hanya untuk Super Admin.', [], 403);
        }

        $filters = [
            'search' => $request->query('search', ''),
            'action' => $request->query('action', 'all'),
            'subject_type' => $request->query('subject_type', 'all'),
            'user_id' => $request->query('user_id', 'all'),
            'start_date' => $request->query('start_date', ''),
            'end_date' => $request->query('end_date', ''),
        ];

        $logs = ActivityLog::with('user:id,name,email')
            ->filter($filters)
            ->latest('id')
            ->paginate((int) $request->query('per_page', 20));

        return $this->sendResponse([
            'logs' => $logs->items(),
        ], 'Daftar log aktivitas berhasil diambil.', 200, [
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'per_page' => $logs->perPage(),
            'total' => $logs->total(),
        ]);
    }
}
