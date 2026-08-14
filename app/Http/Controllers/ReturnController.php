<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Car;
use App\Models\Rental;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReturnController extends Controller
{
    /**
     * Display a listing of units currently out on trip awaiting return & checklist pengembalian.
     */
    public function index(Request $request): Response
    {
        // Get active rentals (units handed over / on trip)
        $rentals = Rental::with(['booking.customer', 'car', 'customer', 'officer'])
            ->where(function ($query) {
                $query->where('status', 'Active')
                    ->orWhereHas('booking', function ($q) {
                        $q->where('status', 'On Trip');
                    });
            })
            ->latest()
            ->get();

        // Also get any bookings with 'On Trip' status that might not have a rental record yet or have pending return
        $onTripBookings = Booking::with(['customer', 'car', 'rental', 'peluncur'])
            ->where('status', 'On Trip')
            ->latest()
            ->get();

        return Inertia::render('returns/index', [
            'rentals' => $rentals,
            'onTripBookings' => $onTripBookings,
            'officers' => User::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Finalize unit return processing (Pengembalian Unit).
     */
    public function store(Request $request): RedirectResponse
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

        // Update booking status
        $booking->update([
            'status' => 'Returned',
        ]);

        // Automatically update car status to 'Belum Dicuci' and update last_km
        if ($booking->car) {
            $booking->car->update([
                'status' => 'Belum Dicuci',
                'last_km' => max($validated['km_in'], $booking->car->last_km ?? 0),
            ]);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pengembalian unit berhasil diproses. Status armada diubah menjadi Belum Dicuci.',
        ]);

        return to_route('returns.index');
    }
}
