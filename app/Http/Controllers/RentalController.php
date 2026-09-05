<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\Rental;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RentalController extends Controller
{
    /**
     * Display a listing of rental/serah terima records.
     */
    public function index(): Response
    {
        return Inertia::render('rentals/index', [
            'rentals' => Rental::with(['booking.peluncur', 'car', 'customer', 'officer'])
                ->latest()
                ->get(),
            'confirmedBookings' => Booking::with(['customer', 'car', 'peluncur'])
                ->where('status', 'Confirmed')
                ->latest()
                ->get(),
            'bookings' => Booking::with('customer')
                ->whereIn('status', ['Pending', 'Confirmed', 'On Trip', 'Returned'])
                ->get(['id', 'booking_number', 'customer_id', 'car_id', 'car_type', 'booking_date', 'return_date']),
            'cars' => Car::orderBy('name')->get(['id', 'name', 'plate_number']),
            'customers' => Customer::orderBy('name')->get(['id', 'name']),
            'officers' => User::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created rental record.
     */
    public function store(Request $request): RedirectResponse
    {
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

        // Automatically update car status to 'Not Ready'
        $rental->car->update(['status' => 'Not Ready']);

        // Automatically update booking status to 'On Trip'
        $rental->booking->update(['status' => 'On Trip']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Rental contract created successfully.']);

        return to_route('rentals.index');
    }

    /**
     * Update the specified rental record.
     */
    public function update(Request $request, Rental $rental): RedirectResponse
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

        // If car changed, reset the old car's status to Ready
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

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Rental contract updated successfully.']);

        return to_route('rentals.index');
    }

    /**
     * Remove the specified rental record.
     */
    public function destroy(Rental $rental): RedirectResponse
    {
        $rental->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Rental contract deleted successfully.']);

        return to_route('rentals.index');
    }
}
