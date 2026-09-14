<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\Service;
use App\Models\VehicleTax;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends BaseApiController
{
    /**
     * Get dashboard summary and metrics tailored to the authenticated user's role.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $roles = $user->roles ?? [];
        $stats = [];

        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();

        // Date Filter handling
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $preset = $request->query('preset', ($startDate || $endDate) ? 'custom' : 'all');

        if ($preset === 'today') {
            $startDate = $today->format('Y-m-d');
            $endDate = $today->format('Y-m-d');
        } elseif ($preset === 'tomorrow') {
            $startDate = Carbon::tomorrow()->format('Y-m-d');
            $endDate = Carbon::tomorrow()->format('Y-m-d');
        } elseif ($preset === 'this_week') {
            $startDate = Carbon::now()->startOfWeek()->format('Y-m-d');
            $endDate = Carbon::now()->endOfWeek()->format('Y-m-d');
        } elseif ($preset === 'this_month') {
            $startDate = Carbon::now()->startOfMonth()->format('Y-m-d');
            $endDate = Carbon::now()->endOfMonth()->format('Y-m-d');
        }

        $isFiltered = ! empty($startDate) || ! empty($endDate) || $preset !== 'all';

        // Base query for filtered period
        $periodBookingQuery = Booking::query();
        if ($startDate) {
            $periodBookingQuery->whereDate('booking_date', '>=', $startDate);
        }
        if ($endDate) {
            $periodBookingQuery->whereDate('booking_date', '<=', $endDate);
        }

        // Shared fleet summary
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
            'period_bookings' => (clone $periodBookingQuery)->count(),
            'period_revenue' => (float) (clone $periodBookingQuery)->sum('amount'),
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

        $carsWithBookingStatus = Car::whereHas('bookings', function ($q) use ($startDate, $endDate, $isFiltered) {
            if ($isFiltered) {
                if ($startDate) {
                    $q->whereDate('booking_date', '>=', $startDate);
                }
                if ($endDate) {
                    $q->whereDate('booking_date', '<=', $endDate);
                }
            } else {
                $q->whereIn('status', ['Pending', 'Confirmed', 'On Trip']);
            }
        })->with(['bookings' => function ($q) use ($startDate, $endDate, $isFiltered) {
            if ($isFiltered) {
                if ($startDate) {
                    $q->whereDate('booking_date', '>=', $startDate);
                }
                if ($endDate) {
                    $q->whereDate('booking_date', '<=', $endDate);
                }
            } else {
                $q->whereIn('status', ['Pending', 'Confirmed', 'On Trip']);
            }
            $q->orderBy('booking_date', 'asc');
        }, 'bookings.customer'])->get()->map(function ($car) use ($today) {
            $activeBooking = $car->bookings->first(function ($b) use ($today) {
                return $b->status === 'On Trip' || ($b->status === 'Confirmed' && $b->return_date >= $today->format('Y-m-d'));
            }) ?? $car->bookings->first();

            return [
                'id' => $car->id,
                'name' => $car->name,
                'brand' => $car->brand,
                'model' => $car->model,
                'type' => $car->type,
                'plate_number' => $car->plate_number,
                'color' => $car->color,
                'status' => $car->status,
                'daily_price' => (float) $car->daily_price,
                'active_booking' => $activeBooking ? [
                    'id' => $activeBooking->id,
                    'booking_number' => $activeBooking->booking_number,
                    'customer_name' => $activeBooking->customer?->name,
                    'booking_date' => $activeBooking->booking_date instanceof CarbonInterface ? $activeBooking->booking_date->format('Y-m-d') : ($activeBooking->booking_date ? substr((string) $activeBooking->booking_date, 0, 10) : null),
                    'return_date' => $activeBooking->return_date instanceof CarbonInterface ? $activeBooking->return_date->format('Y-m-d') : ($activeBooking->return_date ? substr((string) $activeBooking->return_date, 0, 10) : null),
                    'pickup_time' => $activeBooking->pickup_time ? substr((string) $activeBooking->pickup_time, 0, 5) : null,
                    'return_time' => $activeBooking->return_time ? substr((string) $activeBooking->return_time, 0, 5) : null,
                    'status' => $activeBooking->status,
                ] : null,
            ];
        })->filter(fn ($car) => ! is_null($car['active_booking']))->values();

        if ($user->isAdmin()) {
            $adminRecentQuery = (clone $periodBookingQuery)->with(['customer', 'car', 'peluncur'])->latest();

            $stats['admin'] = [
                ...$fleetSummary,
                'total_bookings' => Booking::count(),
                'total_customers' => Customer::count(),
                'total_revenue' => (float) Booking::sum('amount'),
                'recent_bookings' => $adminRecentQuery->take(10)->get(),
                'cars_status' => $carsWithBookingStatus,
            ];
        }

        if ($user->isMarketing()) {
            $marketingQuery = (clone $periodBookingQuery);

            if (! $user->isAdmin()) {
                $marketingQuery->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                        ->orWhere('peluncur_id', $user->id)
                        ->orWhere('petugas_cuci_id', $user->id);
                });
            }

            $stats['marketing'] = [
                ...$fleetSummary,
                'total_bookings' => (clone $marketingQuery)->count(),
                'total_customers' => $user->isAdmin()
                    ? Customer::count()
                    : Customer::where('user_id', $user->id)->count(),
                'bookings_today' => (clone $marketingQuery)->whereDate('booking_date', $today)->count(),
                'revenue_today' => (float) (clone $marketingQuery)->whereDate('booking_date', $today)->sum('amount'),
                'revenue_month' => (float) (clone $marketingQuery)->where('booking_date', '>=', $startOfMonth)->sum('amount'),
                'period_bookings' => (clone $marketingQuery)->count(),
                'period_revenue' => (float) (clone $marketingQuery)->sum('amount'),
                'recent_bookings' => (clone $marketingQuery)->with(['customer', 'car'])->latest()->take(10)->get(),
                'cars_status' => $carsWithBookingStatus,
            ];
        }

        if ($user->isPeluncur()) {
            $peluncurDeliveryQuery = Booking::with(['customer', 'car'])
                ->where('status', 'Confirmed');

            $peluncurReturnQuery = Booking::with(['customer', 'car'])
                ->where('status', 'On Trip');

            if ($startDate) {
                $peluncurDeliveryQuery->whereDate('booking_date', '>=', $startDate);
                $peluncurReturnQuery->whereDate('return_date', '>=', $startDate);
            }
            if ($endDate) {
                $peluncurDeliveryQuery->whereDate('booking_date', '<=', $endDate);
                $peluncurReturnQuery->whereDate('return_date', '<=', $endDate);
            }

            $stats['peluncur'] = [
                'assigned_deliveries' => $peluncurDeliveryQuery->get(),
                'assigned_returns' => $peluncurReturnQuery->get(),
            ];
        }

        if ($user->isPetugasCuci()) {
            $washQuery = Booking::with(['customer', 'car'])
                ->where('petugas_cuci_id', $user->id)
                ->where('status', 'Returned');

            if ($startDate) {
                $washQuery->whereDate('return_date', '>=', $startDate);
            }
            if ($endDate) {
                $washQuery->whereDate('return_date', '<=', $endDate);
            }

            $stats['petugas_cuci'] = [
                'assigned_wash' => $washQuery->get(),
            ];
        }

        return $this->sendResponse([
            'stats' => $stats,
            'roles' => $roles,
            'filters' => [
                'start_date' => $startDate ?? '',
                'end_date' => $endDate ?? '',
                'preset' => $preset,
                'is_filtered' => $isFiltered,
            ],
        ], 'Data dashboard berhasil diambil.');
    }

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
