<?php

namespace App\Http\Controllers;

use App\Models\Blacklist;
use App\Models\Booking;
use App\Models\Car;
use App\Models\Driver;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AllocationController extends Controller
{
    /**
     * Display a listing of car & staff allocations.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Booking::with(['customer', 'car', 'peluncur', 'petugasCuci', 'user', 'driver'])->latest();

        if (! $user->isAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhere('peluncur_id', $user->id)
                    ->orWhere('petugas_cuci_id', $user->id);
            });
        }

        $allBookings = $query->get();

        return Inertia::render('allocations/index', [
            'bookings' => $allBookings,
            'readyCars' => Car::where('status', 'Ready')->orderBy('name')->get(),
            'readyDrivers' => Driver::where('status', 'Active')->orderBy('name')->get(),
            'peluncurOfficers' => User::whereJsonContains('roles', 'Peluncur')->orderBy('name')->get(),
            'washOfficers' => User::whereJsonContains('roles', 'Petugas Cuci')->orderBy('name')->get(),
            'unallocatedCount' => $allBookings->whereNull('car_id')->count(),
            'allocatedCount' => $allBookings->whereNotNull('car_id')->count(),
            'blacklists' => Blacklist::all(),
        ]);
    }

    /**
     * Update the allocation for a specific booking.
     */
    public function update(Request $request, Booking $booking): RedirectResponse
    {
        $validated = $request->validate([
            'car_id' => ['nullable', 'exists:cars,id'],
            'driver_id' => ['nullable', 'exists:drivers,id'],
            'peluncur_id' => ['nullable', 'exists:users,id'],
            'petugas_cuci_id' => ['nullable', 'exists:users,id'],
            'amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $booking->update([
            'car_id' => $validated['car_id'] ?? $booking->car_id,
            'driver_id' => $validated['driver_id'] ?? $booking->driver_id,
            'peluncur_id' => $validated['peluncur_id'] ?? $booking->peluncur_id,
            'petugas_cuci_id' => $validated['petugas_cuci_id'] ?? $booking->petugas_cuci_id,
            'amount' => isset($validated['amount']) ? $validated['amount'] : $booking->amount,
        ]);

        if ($booking->car_id && $booking->peluncur_id && $booking->status === 'Pending') {
            $booking->update(['status' => 'Confirmed']);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Alokasi mobil dan staf berhasil disimpan.',
        ]);

        return back();
    }
}
