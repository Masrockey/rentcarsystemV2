<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\Service;
use App\Models\VehicleTax;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $roles = $user->roles ?? [];
        $stats = [];

        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();

        // Shared fleet summary for Admin, Marketing
        $fleetSummary = [
            'total_cars' => Car::count(),
            'cars_ready' => Car::where('status', 'Ready')->count(),
            'cars_not_ready' => Car::where('status', 'Not Ready')->count(),
            'cars_rented' => Car::where('status', 'Not Ready')->count(),
            'cars_service' => Car::where('status', 'Service')->count(),
            'cars_belum_dicuci' => Car::where('status', 'Belum Dicuci')->count(),
            'bookings_today' => Booking::whereDate('booking_date', $today)->count(),
            'revenue_today' => (float) Booking::whereDate('booking_date', $today)->sum('amount'),
            'revenue_month' => (float) Booking::where('booking_date', '>=', $startOfMonth)->sum('amount'),
            'utilization_rate' => $this->calculateUtilizationRate(),
            'overdue_returns' => Booking::where('status', 'On Trip')
                ->whereDate('return_date', '<', $today)
                ->count(),
            'tax_expiring_soon' => VehicleTax::where('valid_until', '<=', Carbon::now()->addDays(30))
                ->where('valid_until', '>=', $today)
                ->count(),
            'service_due' => Service::where('next_service_date', '<=', Carbon::now()->addDays(14))
                ->where('next_service_date', '>=', $today)
                ->count(),
        ];

        if ($user->isAdmin()) {
            $stats['admin'] = [
                ...$fleetSummary,
                'total_bookings' => Booking::count(),
                'total_customers' => Customer::count(),
                'total_revenue' => (float) Booking::sum('amount'),
                'recent_bookings' => Booking::with(['customer', 'car', 'peluncur'])->latest()->take(5)->get(),
            ];
        }

        if ($user->isMarketing()) {
            $marketingQuery = Booking::query();

            if (! $user->isAdmin()) {
                $marketingQuery->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                        ->orWhere('peluncur_id', $user->id)
                        ->orWhere('petugas_cuci_id', $user->id);
                });
            }

            $stats['marketing'] = [
                'total_bookings' => (clone $marketingQuery)->count(),
                'total_customers' => $user->isAdmin()
                    ? Customer::count()
                    : Customer::whereHas('bookings', function ($q) use ($user) {
                        $q->where('user_id', $user->id)
                            ->orWhere('peluncur_id', $user->id)
                            ->orWhere('petugas_cuci_id', $user->id);
                    })->count(),
                'bookings_today' => (clone $marketingQuery)->whereDate('booking_date', $today)->count(),
                'revenue_today' => (float) (clone $marketingQuery)->whereDate('booking_date', $today)->sum('amount'),
                'revenue_month' => (float) (clone $marketingQuery)->where('booking_date', '>=', $startOfMonth)->sum('amount'),
                'recent_bookings' => (clone $marketingQuery)->with(['customer', 'car'])->latest()->take(5)->get(),
            ];
        }

        if ($user->isPeluncur()) {
            $stats['peluncur'] = [
                'assigned_deliveries' => Booking::with(['customer', 'car'])
                    ->where('peluncur_id', $user->id)
                    ->where('status', 'Confirmed')
                    ->get(),
                'assigned_returns' => Booking::with(['customer', 'car'])
                    ->where('peluncur_id', $user->id)
                    ->where('status', 'On Trip')
                    ->get(),
            ];
        }

        if ($user->isPetugasCuci()) {
            $stats['petugas_cuci'] = [
                'assigned_wash' => Booking::with(['customer', 'car'])
                    ->where('petugas_cuci_id', $user->id)
                    ->where('status', 'Returned')
                    ->get(),
            ];
        }

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'roles' => $roles,
        ]);
    }

    /**
     * Calculate the fleet utilization rate as a percentage.
     */
    private function calculateUtilizationRate(): float
    {
        $totalCars = Car::count();
        if ($totalCars === 0) {
            return 0.0;
        }
        $rentedCars = Car::where('status', 'Not Ready')->count();

        return round(($rentedCars / $totalCars) * 100, 1);
    }
}
