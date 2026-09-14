<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\BookingResource;
use App\Http\Resources\Api\V1\RentalResource;
use App\Models\Booking;
use App\Models\Rental;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReturnController extends BaseApiController
{
    /**
     * Display a listing of units currently out on trip awaiting return.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Rental::with(['booking.customer', 'car', 'customer', 'officer'])
            ->where(function ($q) {
                $q->where('status', 'Active')
                    ->orWhereHas('booking', function ($bq) {
                        $bq->where('status', 'On Trip');
                    });
            })
            ->latest();

        $totalOut = (clone $query)->count();
        $pendingChecklist = (clone $query)->whereDoesntHave('booking', function ($bq) {
            $bq->whereNotNull('return_checklist');
        })->count();
        $completedChecklist = $totalOut - $pendingChecklist;

        $perPage = (int) $request->query('per_page', 10);
        $rentals = $query->paginate($perPage);

        $onTripBookings = Booking::with(['customer', 'car', 'rental', 'peluncur'])
            ->where('status', 'On Trip')
            ->latest()
            ->get();

        return $this->sendResponse(
            RentalResource::collection($rentals),
            'Daftar pengembalian unit berhasil diambil.',
            200,
            [
                'current_page' => $rentals->currentPage(),
                'last_page' => $rentals->lastPage(),
                'per_page' => $rentals->perPage(),
                'total' => $rentals->total(),
                'total_out' => $totalOut,
                'pending_checklist' => $pendingChecklist,
                'completed_checklist' => $completedChecklist,
                'on_trip_bookings' => BookingResource::collection($onTripBookings),
            ]
        );
    }

    /**
     * Finalize unit return processing.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rental_id' => ['nullable', 'exists:rentals,id'],
            'booking_id' => ['required', 'exists:bookings,id'],
            'checkin_datetime' => ['required', 'date'],
            'km_in' => ['required', 'integer', 'min:0'],
            'fuel_in' => ['required', 'integer', 'min:0', 'max:100'],
            'fine_amount' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $booking = Booking::findOrFail($validated['booking_id']);
        $rental = isset($validated['rental_id']) ? Rental::find($validated['rental_id']) : $booking->rental;

        if ($rental) {
            $rental->update([
                'checkin_datetime' => $validated['checkin_datetime'],
                'km_in' => $validated['km_in'],
                'fuel_in' => $validated['fuel_in'],
                'fine_amount' => $validated['fine_amount'],
                'status' => 'Returned',
            ]);
        } else {
            $rental = Rental::create([
                'booking_id' => $booking->id,
                'car_id' => $booking->car_id,
                'customer_id' => $booking->customer_id,
                'officer_id' => $request->user()->id,
                'contract_number' => 'KTR-'.date('Ymd').'-'.strtoupper(str()->random(6)),
                'checkout_datetime' => $booking->delivery_checklist['checkout_date'] ?? $booking->booking_date ?? now(),
                'checkin_datetime' => $validated['checkin_datetime'],
                'km_out' => $booking->delivery_checklist['km_out'] ?? $booking->car?->last_km ?? 0,
                'fuel_out' => $booking->delivery_checklist['fuel_out'] ?? 100,
                'km_in' => $validated['km_in'],
                'fuel_in' => $validated['fuel_in'],
                'fine_amount' => $validated['fine_amount'],
                'total_payment' => $booking->amount ?? 0,
                'status' => 'Returned',
            ]);
        }

        $booking->update([
            'status' => 'Returned',
        ]);

        if ($booking->car) {
            $booking->car->update([
                'status' => 'Ready',
                'last_km' => max($validated['km_in'], $booking->car->last_km ?? 0),
            ]);
        }

        return $this->sendResponse(
            new RentalResource($rental->fresh()->load(['car', 'customer', 'officer', 'booking'])),
            'Pengembalian unit berhasil diproses. Status armada diubah menjadi Ready.'
        );
    }
}

