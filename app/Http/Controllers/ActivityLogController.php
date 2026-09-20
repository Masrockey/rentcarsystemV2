<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    /**
     * Ensure only Super Admin can access activity logs.
     */
    private function authorizeSuperAdmin(): void
    {
        if (! auth()->user()?->isSuperAdmin()) {
            abort(403, 'Akses ditolak. Menu Log Aktivitas hanya dapat diakses oleh Super Admin.');
        }
    }

    /**
     * Display a listing of the activity logs with filters and summary statistics.
     */
    public function index(Request $request): Response
    {
        $this->authorizeSuperAdmin();

        $filters = [
            'search' => $request->query('search', ''),
            'action' => $request->query('action', 'all'),
            'subject_type' => $request->query('subject_type', 'all'),
            'user_id' => $request->query('user_id', 'all'),
            'start_date' => $request->query('start_date', ''),
            'end_date' => $request->query('end_date', ''),
            'preset' => $request->query('preset', 'all'),
        ];

        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();
        $startOfMonth = Carbon::now()->startOfMonth();

        // Statistics
        $totalToday = ActivityLog::whereDate('created_at', $today)->count();
        $totalWeek = ActivityLog::where('created_at', '>=', $startOfWeek)->count();
        $totalMonth = ActivityLog::where('created_at', '>=', $startOfMonth)->count();
        $totalAll = ActivityLog::count();

        // Top user today / recent
        $topUserRecord = ActivityLog::whereNotNull('user_name')
            ->selectRaw('user_name, count(*) as count')
            ->groupBy('user_name')
            ->orderByDesc('count')
            ->first();

        $topUser = $topUserRecord ? "{$topUserRecord->user_name} ({$topUserRecord->count} aksi)" : '-';

        // Filtered logs
        $logs = ActivityLog::with('user:id,name,email')
            ->filter($filters)
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        // Options for dropdown filters
        $users = User::orderBy('name')->get(['id', 'name', 'email']);

        $availableActions = [
            ['value' => 'all', 'label' => 'Semua Aksi'],
            ['value' => 'created', 'label' => 'Tambah Data (Create)'],
            ['value' => 'updated', 'label' => 'Ubah Data (Update)'],
            ['value' => 'deleted', 'label' => 'Hapus Data (Delete)'],
            ['value' => 'login', 'label' => 'Login Masuk'],
            ['value' => 'logout', 'label' => 'Logout Keluar'],
            ['value' => 'failed_login', 'label' => 'Gagal Login'],
        ];

        $availableSubjectTypes = [
            ['value' => 'all', 'label' => 'Semua Modul / Entitas'],
            ['value' => 'Booking', 'label' => 'Booking Rental'],
            ['value' => 'Rental', 'label' => 'Kontrak Serah Terima'],
            ['value' => 'Customer', 'label' => 'Pelanggan'],
            ['value' => 'Car', 'label' => 'Mobil Armada'],
            ['value' => 'CarType', 'label' => 'Tipe / Jenis Mobil'],
            ['value' => 'Driver', 'label' => 'Supir'],
            ['value' => 'Payment', 'label' => 'Pembayaran'],
            ['value' => 'Service', 'label' => 'Perawatan / Servis'],
            ['value' => 'Insurance', 'label' => 'Asuransi'],
            ['value' => 'VehicleTax', 'label' => 'Pajak & STNK'],
            ['value' => 'Blacklist', 'label' => 'Blacklist Konsumen'],
            ['value' => 'User', 'label' => 'User & Akun'],
            ['value' => 'Auth', 'label' => 'Keamanan / Otentikasi'],
        ];

        return Inertia::render('activity-logs/index', [
            'logs' => $logs,
            'filters' => $filters,
            'stats' => [
                'total_today' => $totalToday,
                'total_week' => $totalWeek,
                'total_month' => $totalMonth,
                'total_all' => $totalAll,
                'top_user' => $topUser,
            ],
            'users' => $users,
            'availableActions' => $availableActions,
            'availableSubjectTypes' => $availableSubjectTypes,
        ]);
    }

    /**
     * Delete activity logs based on period or custom date range.
     */
    public function destroy(Request $request)
    {
        $this->authorizeSuperAdmin();

        $validated = $request->validate([
            'period' => ['required', 'string', 'in:1_day,1_week,2_weeks,1_month,custom,all'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ]);

        $query = ActivityLog::query();
        $label = '';

        switch ($validated['period']) {
            case '1_day':
                $query->where('created_at', '>=', Carbon::now()->subDay());
                $label = '1 hari terakhir';
                break;
            case '1_week':
                $query->where('created_at', '>=', Carbon::now()->subDays(7));
                $label = '1 minggu terakhir';
                break;
            case '2_weeks':
                $query->where('created_at', '>=', Carbon::now()->subDays(14));
                $label = '2 minggu terakhir';
                break;
            case '1_month':
                $query->where('created_at', '>=', Carbon::now()->subDays(30));
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

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Berhasil menghapus {$count} entri log aktivitas ({$label}).",
        ]);

        return to_route('activity-logs.index');
    }
}
