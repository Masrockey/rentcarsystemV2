<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Driver;
use App\Models\DriverTripLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DriverTripLogController extends Controller
{
    /**
     * Display all driver trip logs for admin overview.
     */
    public function overview(Request $request): Response
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Akses ditolak. Menu ini hanya dapat diakses oleh Admin dan Super Admin.');
        }

        $search = $request->query('search', '');
        $driverId = $request->query('driver_id', '');
        $status = $request->query('status', 'all');
        $startDate = $request->query('start_date', '');
        $endDate = $request->query('end_date', '');

        $query = DriverTripLog::with([
            'booking.customer:id,name,phone',
            'booking.car:id,name,plate_number,brand,model',
            'driver:id,name,phone,sim',
            'user:id,name',
        ])->latest('id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('location_name', 'like', "%{$search}%")
                    ->orWhere('checkin_notes', 'like', "%{$search}%")
                    ->orWhere('checkout_notes', 'like', "%{$search}%")
                    ->orWhereHas('driver', function ($dq) use ($search) {
                        $dq->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    })
                    ->orWhereHas('booking.customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    })
                    ->orWhereHas('booking.car', function ($carQ) use ($search) {
                        $carQ->where('name', 'like', "%{$search}%")
                            ->orWhere('plate_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($driverId && $driverId !== 'all') {
            $query->where('driver_id', $driverId);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($startDate) {
            $query->whereDate('checkin_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('checkin_at', '<=', $endDate);
        }

        $logs = $query->paginate(15)->withQueryString()->through(function ($log) {
            return [
                'id' => $log->id,
                'booking_id' => $log->booking_id,
                'booking' => $log->booking ? [
                    'id' => $log->booking->id,
                    'customer_name' => $log->booking->customer?->name,
                    'customer_phone' => $log->booking->customer?->phone,
                    'car_name' => $log->booking->car ? "{$log->booking->car->name} ({$log->booking->car->plate_number})" : $log->booking->car_type,
                    'booking_date' => $log->booking->booking_date?->format('d/m/Y'),
                    'return_date' => $log->booking->return_date?->format('d/m/Y'),
                    'status' => $log->booking->status,
                ] : null,
                'driver_id' => $log->driver_id,
                'driver_name' => $log->driver?->name,
                'driver_phone' => $log->driver?->phone,
                'driver_photo_url' => null,
                'location_name' => $log->location_name,
                'stop_order' => $log->stop_order,
                'status' => $log->status,
                'checkin_at' => $log->checkin_at?->format('d/m/Y H:i'),
                'checkin_at_raw' => $log->checkin_at?->toIso8601String(),
                'checkin_latitude' => $log->checkin_latitude,
                'checkin_longitude' => $log->checkin_longitude,
                'checkin_notes' => $log->checkin_notes,
                'checkin_photo_url' => $log->checkin_photo ? Storage::url($log->checkin_photo) : null,
                'checkin_map_url' => ($log->checkin_latitude && $log->checkin_longitude)
                    ? "https://www.openstreetmap.org/?mlat={$log->checkin_latitude}&mlon={$log->checkin_longitude}#map=16/{$log->checkin_latitude}/{$log->checkin_longitude}"
                    : null,
                'checkout_at' => $log->checkout_at?->format('d/m/Y H:i'),
                'checkout_at_raw' => $log->checkout_at?->toIso8601String(),
                'checkout_latitude' => $log->checkout_latitude,
                'checkout_longitude' => $log->checkout_longitude,
                'checkout_notes' => $log->checkout_notes,
                'checkout_photo_url' => $log->checkout_photo ? Storage::url($log->checkout_photo) : null,
                'checkout_map_url' => ($log->checkout_latitude && $log->checkout_longitude)
                    ? "https://www.openstreetmap.org/?mlat={$log->checkout_latitude}&mlon={$log->checkout_longitude}#map=16/{$log->checkout_latitude}/{$log->checkout_longitude}"
                    : null,
                'created_at' => $log->created_at?->format('d/m/Y H:i'),
            ];
        });

        $stats = [
            'total_logs' => DriverTripLog::count(),
            'active_checked_in' => DriverTripLog::where('status', 'Checked In')->count(),
            'completed_checked_out' => DriverTripLog::where('status', 'Checked Out')->count(),
            'today_logs' => DriverTripLog::whereDate('checkin_at', today())->count(),
        ];

        $drivers = Driver::orderBy('name')->get(['id', 'name', 'phone']);

        return Inertia::render('driver-trip-logs/index', [
            'logs' => $logs,
            'filters' => [
                'search' => $search,
                'driver_id' => $driverId,
                'status' => $status,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'stats' => $stats,
            'drivers' => $drivers,
        ]);
    }

    /**
     * Get trip logs for a booking (JSON).
     */
    public function index(Booking $booking): JsonResponse
    {
        $logs = $booking->tripLogs()
            ->with(['driver:id,name', 'user:id,name'])
            ->orderBy('stop_order')
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'booking_id' => $log->booking_id,
                    'driver_id' => $log->driver_id,
                    'driver_name' => $log->driver?->name,
                    'location_name' => $log->location_name,
                    'stop_order' => $log->stop_order,
                    'status' => $log->status,
                    'checkin_at' => $log->checkin_at?->format('d/m/Y H:i'),
                    'checkin_at_raw' => $log->checkin_at?->toIso8601String(),
                    'checkin_latitude' => $log->checkin_latitude,
                    'checkin_longitude' => $log->checkin_longitude,
                    'checkin_notes' => $log->checkin_notes,
                    'checkin_photo_url' => $log->checkin_photo ? Storage::url($log->checkin_photo) : null,
                    'checkin_map_url' => ($log->checkin_latitude && $log->checkin_longitude)
                        ? "https://www.openstreetmap.org/?mlat={$log->checkin_latitude}&mlon={$log->checkin_longitude}#map=16/{$log->checkin_latitude}/{$log->checkin_longitude}"
                        : null,
                    'checkout_at' => $log->checkout_at?->format('d/m/Y H:i'),
                    'checkout_at_raw' => $log->checkout_at?->toIso8601String(),
                    'checkout_latitude' => $log->checkout_latitude,
                    'checkout_longitude' => $log->checkout_longitude,
                    'checkout_notes' => $log->checkout_notes,
                    'checkout_photo_url' => $log->checkout_photo ? Storage::url($log->checkout_photo) : null,
                    'checkout_map_url' => ($log->checkout_latitude && $log->checkout_longitude)
                        ? "https://www.openstreetmap.org/?mlat={$log->checkout_latitude}&mlon={$log->checkout_longitude}#map=16/{$log->checkout_latitude}/{$log->checkout_longitude}"
                        : null,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * Driver check-in at a new stop location.
     */
    public function checkin(Request $request, Booking $booking): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        $driverId = $user->driver?->id ?? Driver::where('user_id', $user->id)->value('id') ?? ($user->phone ? Driver::where('phone', $user->phone)->value('id') : null);

        // If logged in as driver, verify authorization
        if ($user->isDriver() && ! $user->isAdmin()) {
            if (! $driverId || $booking->driver_id !== $driverId) {
                abort(403, 'Anda tidak ditugaskan untuk booking ini.');
            }
        } else {
            $driverId = $booking->driver_id ?? $driverId;
            if (! $driverId) {
                abort(422, 'Booking belum memiliki penugasan supir.');
            }
        }

        $activeLog = $booking->tripLogs()->where('status', 'Checked In')->latest('id')->first();
        if ($activeLog) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => "Harap lakukan check-out dari {$activeLog->location_name} terlebih dahulu sebelum check-in di tempat baru.",
                ], 422);
            }

            return back()->withErrors(['location_name' => "Harap lakukan check-out dari {$activeLog->location_name} terlebih dahulu sebelum check-in di tempat baru."]);
        }

        $validated = $request->validate([
            'location_name' => ['required', 'string', 'max:255'],
            'checkin_notes' => ['nullable', 'string', 'max:1000'],
            'checkin_latitude' => ['nullable', 'numeric'],
            'checkin_longitude' => ['nullable', 'numeric'],
            'checkin_photo' => ['nullable', 'image', 'max:10240'],
        ]);

        $photoPath = null;
        if ($request->hasFile('checkin_photo')) {
            $photoPath = $request->file('checkin_photo')->store('driver_logs', 'public');
        }

        $nextOrder = ($booking->tripLogs()->max('stop_order') ?? 0) + 1;

        $tripLog = $booking->tripLogs()->create([
            'driver_id' => $driverId,
            'user_id' => $user->id,
            'location_name' => $validated['location_name'],
            'stop_order' => $nextOrder,
            'checkin_at' => now(),
            'checkin_latitude' => $validated['checkin_latitude'] ?? null,
            'checkin_longitude' => $validated['checkin_longitude'] ?? null,
            'checkin_notes' => $validated['checkin_notes'] ?? null,
            'checkin_photo' => $photoPath,
            'status' => 'Checked In',
        ]);

        // Automatically change booking status to On Trip if currently Confirmed
        if ($booking->status === 'Confirmed') {
            $booking->updateQuietly(['status' => 'On Trip']);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Check-in berhasil dicatat.',
                'data' => $tripLog,
            ]);
        }

        return back()->with('success', "Check-in di {$tripLog->location_name} berhasil dicatat.");
    }

    /**
     * Driver check-out from a stop location.
     */
    public function checkout(Request $request, Booking $booking, DriverTripLog $tripLog): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        $driverId = $user->driver?->id ?? Driver::where('user_id', $user->id)->value('id') ?? ($user->phone ? Driver::where('phone', $user->phone)->value('id') : null);

        if ($user->isDriver() && ! $user->isAdmin()) {
            if (! $driverId || $booking->driver_id !== $driverId) {
                abort(403, 'Anda tidak memiliki hak akses untuk checkout ini.');
            }
        }

        $validated = $request->validate([
            'checkout_notes' => ['nullable', 'string', 'max:1000'],
            'checkout_latitude' => ['nullable', 'numeric'],
            'checkout_longitude' => ['nullable', 'numeric'],
            'checkout_photo' => ['nullable', 'image', 'max:10240'],
        ]);

        $photoPath = $tripLog->checkout_photo;
        if ($request->hasFile('checkout_photo')) {
            $photoPath = $request->file('checkout_photo')->store('driver_logs', 'public');
        }

        $tripLog->update([
            'checkout_at' => now(),
            'checkout_latitude' => $validated['checkout_latitude'] ?? null,
            'checkout_longitude' => $validated['checkout_longitude'] ?? null,
            'checkout_notes' => $validated['checkout_notes'] ?? null,
            'checkout_photo' => $photoPath,
            'status' => 'Checked Out',
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Check-out berhasil dicatat.',
                'data' => $tripLog,
            ]);
        }

        return back()->with('success', "Check-out dari {$tripLog->location_name} berhasil dicatat.");
    }
}
