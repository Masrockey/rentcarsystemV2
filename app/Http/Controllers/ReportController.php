<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(): Response
    {
        // Fetch bookings count and total amount grouped by month
        $monthlyReport = Booking::select(
            DB::raw("DATE_FORMAT(booking_date, '%Y-%m') as month"),
            DB::raw('COUNT(*) as total_bookings'),
            DB::raw('SUM(amount) as total_earnings')
        )
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->get();

        return Inertia::render('reports/index', [
            'monthlyReport' => $monthlyReport,
        ]);
    }
}
