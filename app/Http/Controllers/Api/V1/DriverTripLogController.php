<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\DriverTripLogResource;
use App\Models\Booking;
use App\Models\Driver;
use App\Models\DriverTripLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverTripLogController extends Controller
{
    /**
     * Get all trip logs for a booking.
     */
    public function index(Booking $booking): JsonResponse
    {
        $logs = $booking->tripLogs()->with(['driver', 'user'])->orderBy('stop_order')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar log perjalanan berhasil diambil.',
            'data' => DriverTripLogResource::collection($logs),
        ]);
    }

    /**
     * Check-in at a stop location.
     */
    public function checkin(Request $request, Booking $booking): JsonResponse
    {
        $user = $request->user();
        $driverId = $user->driver?->id ?? Driver::where('user_id', $user->id)->value('id') ?? ($user->phone ? Driver::where('phone', $user->phone)->value('id') : null);

        if ($user->isDriver() && ! $user->isAdmin()) {
            if (! $driverId || $booking->driver_id !== $driverId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak ditugaskan untuk booking ini.',
                ], 403);
            }
        } else {
            $driverId = $booking->driver_id ?? $driverId;
            if (! $driverId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking belum memiliki penugasan supir.',
                ], 422);
            }
        }

        $activeLog = $booking->tripLogs()->where('status', 'Checked In')->latest('id')->first();
        if ($activeLog) {
            return response()->json([
                'success' => false,
                'message' => "Harap lakukan check-out dari {$activeLog->location_name} terlebih dahulu sebelum check-in di tempat baru.",
            ], 422);
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

        if ($booking->status === 'Confirmed') {
            $booking->updateQuietly(['status' => 'On Trip']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Check-in berhasil dicatat.',
            'data' => new DriverTripLogResource($tripLog->load(['driver', 'user'])),
        ], 201);
    }

    /**
     * Check-out from a stop location.
     */
    public function checkout(Request $request, Booking $booking, DriverTripLog $tripLog): JsonResponse
    {
        $user = $request->user();
        $driverId = $user->driver?->id ?? Driver::where('user_id', $user->id)->value('id') ?? ($user->phone ? Driver::where('phone', $user->phone)->value('id') : null);

        if ($user->isDriver() && ! $user->isAdmin()) {
            if (! $driverId || $booking->driver_id !== $driverId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki hak akses untuk checkout ini.',
                ], 403);
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

        return response()->json([
            'success' => true,
            'message' => 'Check-out berhasil dicatat.',
            'data' => new DriverTripLogResource($tripLog->load(['driver', 'user'])),
        ]);
    }
}
