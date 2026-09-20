<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

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

    /**
     * Delete activity logs based on period or custom date range (Super Admin only).
     */
    public function destroy(Request $request): JsonResponse
    {
        if (! $request->user()->isSuperAdmin()) {
            return $this->sendError('Akses ditolak. Menu Log Aktivitas hanya untuk Super Admin.', [], 403);
        }

        $validated = $request->validate([
            'period' => ['required', 'string', 'in:1_day,1_week,2_weeks,1_month,custom,all'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ]);

        $query = ActivityLog::query();
        $label = '';

        switch ($validated['period']) {
            case '1_day':
                $query->where('created_at', '>=', now()->subDay());
                $label = '1 hari terakhir';
                break;
            case '1_week':
                $query->where('created_at', '>=', now()->subDays(7));
                $label = '1 minggu terakhir';
                break;
            case '2_weeks':
                $query->where('created_at', '>=', now()->subDays(14));
                $label = '2 minggu terakhir';
                break;
            case '1_month':
                $query->where('created_at', '>=', now()->subDays(30));
                $label = '1 bulan terakhir';
                break;
            case 'custom':
                if (! empty($validated['start_date'])) {
                    $query->where('created_at', '>=', Carbon::parse($validated['start_date'])->startOfDay());
                }
                if (! empty($validated['end_date'])) {
                    $query->where('created_at', '<=', Carbon::parse($validated['end_date'])->endOfDay());
                }
                $sDate = $validated['start_date'] ?? 'Awal';
                $eDate = $validated['end_date'] ?? 'Sekarang';
                $label = "rentang {$sDate} s/d {$eDate}";
                break;
            case 'all':
                $label = 'semua riwayat';
                break;
        }

        $count = $query->count();
        $query->delete();

        return $this->sendResponse([
            'deleted_count' => $count,
            'period' => $validated['period'],
        ], "Berhasil menghapus {$count} entri log aktivitas ({$label}).");
    }
}
