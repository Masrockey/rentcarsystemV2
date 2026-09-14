<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\RentalResource;
use App\Models\Car;
use App\Models\Rental;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RentalController extends BaseApiController
{
    /**
     * Display a listing of rental contracts.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 10);
        $rentals = Rental::with(['booking.peluncur', 'car', 'customer', 'officer'])
            ->latest()
            ->paginate($perPage);

        return $this->sendResponse(
            RentalResource::collection($rentals),
            'Daftar kontrak sewa berhasil diambil.',
            200,
            [
                'current_page' => $rentals->currentPage(),
                'last_page' => $rentals->lastPage(),
                'per_page' => $rentals->perPage(),
                'total' => $rentals->total(),
            ]
        );
    }

    /**
     * Store a newly created rental record.
     */
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403, 'Akses ditolak. Hanya Super Admin yang diizinkan membuat kontrak serah terima manual.');
        }

        $validated = $request->validate([
            'booking_id' => ['required', 'exists:bookings,id'],
            'car_id' => ['required', 'exists:cars,id'],
            'customer_id' => ['required', 'exists:customers,id'],
            'officer_id' => ['required', 'exists:users,id'],
            'checkout_datetime' => ['required', 'date'],
            'checkin_datetime' => ['nullable', 'date', 'after:checkout_datetime'],
            'handover_location' => ['nullable', 'string', 'max:255'],
            'km_out' => ['required', 'integer', 'min:0'],
            'fuel_out' => ['required', 'integer', 'min:0', 'max:100'],
            'km_in' => ['nullable', 'integer', 'min:0'],
            'fuel_in' => ['nullable', 'integer', 'min:0', 'max:100'],
            'fine_amount' => ['required', 'numeric', 'min:0'],
            'total_payment' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'string', Rule::in(['Active', 'Returned', 'Cancelled'])],
            'tenant_signature' => ['nullable', 'string'],
            'officer_signature' => ['nullable', 'string'],
        ]);

        $rental = Rental::create([
            ...$validated,
            'contract_number' => 'KTR-'.date('Ymd').'-'.strtoupper(Str::random(6)),
        ]);

        $rental->car->update(['status' => 'Not Ready']);
        $rental->booking->update(['status' => 'On Trip']);

        return $this->sendResponse(new RentalResource($rental->load(['car', 'customer', 'officer', 'booking'])), 'Kontrak sewa berhasil dibuat.', 201);
    }

    /**
     * Display the specified rental record.
     */
    public function show(Rental $rental): JsonResponse
    {
        $rental->load(['booking.peluncur', 'car', 'customer', 'officer']);

        return $this->sendResponse(new RentalResource($rental), 'Detail kontrak sewa berhasil diambil.');
    }

    /**
     * Update the specified rental record.
     */
    public function update(Request $request, Rental $rental): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => ['required', 'exists:bookings,id'],
            'car_id' => ['required', 'exists:cars,id'],
            'customer_id' => ['required', 'exists:customers,id'],
            'officer_id' => ['required', 'exists:users,id'],
            'checkout_datetime' => ['required', 'date'],
            'checkin_datetime' => ['nullable', 'date'],
            'handover_location' => ['nullable', 'string', 'max:255'],
            'km_out' => ['required', 'integer', 'min:0'],
            'fuel_out' => ['required', 'integer', 'min:0', 'max:100'],
            'km_in' => ['nullable', 'integer', 'min:0'],
            'fuel_in' => ['nullable', 'integer', 'min:0', 'max:100'],
            'fine_amount' => ['required', 'numeric', 'min:0'],
            'total_payment' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'string', Rule::in(['Active', 'Returned', 'Cancelled'])],
            'tenant_signature' => ['nullable', 'string'],
            'officer_signature' => ['nullable', 'string'],
        ]);

        $oldCarId = $rental->car_id;
        $rental->update($validated);

        if ($oldCarId != $rental->car_id) {
            Car::find($oldCarId)?->update(['status' => 'Ready']);
        }

        if ($rental->status === 'Returned') {
            $rental->car->update(['status' => 'Ready']);
            $rental->booking->update(['status' => 'Returned']);
        } elseif ($rental->status === 'Cancelled') {
            $rental->car->update(['status' => 'Ready']);
            $rental->booking->update(['status' => 'Confirmed']);
        } else {
            $rental->car->update(['status' => 'Not Ready']);
            $rental->booking->update(['status' => 'On Trip']);
        }

        return $this->sendResponse(new RentalResource($rental->fresh()->load(['car', 'customer', 'officer', 'booking'])), 'Kontrak sewa berhasil diperbarui.');
    }

    /**
     * Remove the specified rental record.
     */
    public function destroy(Rental $rental): JsonResponse
    {
        $rental->delete();

        return $this->sendResponse(null, 'Kontrak sewa berhasil dihapus.');
    }
}
