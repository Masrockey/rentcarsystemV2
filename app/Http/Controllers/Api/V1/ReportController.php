<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReportController extends BaseApiController
{
    /**
     * Get monthly bookings and earnings aggregation report.
     */
    public function index(): JsonResponse
    {
        $driver = DB::connection()->getDriverName();
        $monthSql = $driver === 'sqlite'
            ? "strftime('%Y-%m', booking_date)"
            : "DATE_FORMAT(booking_date, '%Y-%m')";

        $monthlyReport = Booking::select(
            DB::raw("{$monthSql} as month"),
            DB::raw('COUNT(*) as total_bookings'),
            DB::raw('SUM(amount) as total_earnings')
        )
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->get();

        return $this->sendResponse($monthlyReport, 'Laporan bulanan berhasil diambil.');
    }
}

