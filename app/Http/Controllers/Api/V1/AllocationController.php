<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\BookingResource;
use App\Models\Booking;
use App\Models\Car;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AllocationController extends BaseApiController
{
    private function buildAllocationsQuery(Request $request)
    {
        $user = $request->user();

        $query = Booking::with(['customer', 'car', 'peluncur', 'petugasCuci', 'user', 'driver'])->latest();

        if (! ($user->isAdmin() || $user->isPeluncur())) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhere('peluncur_id', $user->id)
                    ->orWhere('petugas_cuci_id', $user->id);
            });
        }

        if ($request->filled('status')) {
            $status = $request->query('status');
            if ($status === 'unallocated') {
                $query->whereNull('car_id');
            } elseif ($status === 'allocated') {
                $query->whereNotNull('car_id');
            }
        }

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $dateField = $request->query('date_field', 'booking_date');

        if ($startDate || $endDate) {
            if ($dateField === 'booking_date') {
                if ($startDate) {
                    $query->whereDate('booking_date', '>=', $startDate);
                }
                if ($endDate) {
                    $query->whereDate('booking_date', '<=', $endDate);
                }
            } elseif ($dateField === 'return_date') {
                if ($startDate) {
                    $query->whereDate('return_date', '>=', $startDate);
                }
                if ($endDate) {
                    $query->whereDate('return_date', '<=', $endDate);
                }
            } elseif ($dateField === 'active_period') {
                $rangeStart = $startDate ?: $endDate;
                $rangeEnd = $endDate ?: $startDate;
                $query->where(function ($q) use ($rangeStart, $rangeEnd) {
                    $q->whereDate('booking_date', '<=', $rangeEnd)
                        ->where(function ($sub) use ($rangeStart) {
                            $sub->whereDate('return_date', '>=', $rangeStart)
                                ->orWhereNull('return_date');
                        });
                });
            }
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                    ->orWhere('car_type', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($c) use ($search) {
                        $c->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('nik', 'like', "%{$search}%");
                    })
                    ->orWhereHas('car', function ($c) use ($search) {
                        $c->where('name', 'like', "%{$search}%")
                            ->orWhere('plate_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('user', function ($u) use ($search) {
                        $u->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('marketing_id') && $request->query('marketing_id') !== 'all') {
            $query->where('user_id', $request->query('marketing_id'));
        }

        return $query;
    }

    /**
     * Display a listing of car & staff allocations.
     */
    public function index(Request $request): JsonResponse
    {
        $query = $this->buildAllocationsQuery($request);

        $unallocatedCount = (clone $query)->whereNull('car_id')->count();
        $allocatedCount = (clone $query)->whereNotNull('car_id')->count();

        $perPage = (int) $request->query('per_page', 10);
        $bookings = $query->paginate($perPage);

        return $this->sendResponse(
            BookingResource::collection($bookings),
            'Daftar alokasi armada berhasil diambil.',
            200,
            [
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
                'per_page' => $bookings->perPage(),
                'total' => $bookings->total(),
                'unallocated_count' => $unallocatedCount,
                'allocated_count' => $allocatedCount,
            ]
        );
    }

    /**
     * Export allocations data.
     */
    public function export(Request $request): JsonResponse
    {
        $bookings = $this->buildAllocationsQuery($request)->get();

        return $this->sendResponse(BookingResource::collection($bookings), 'Data ekspor alokasi berhasil diambil.');
    }

    /**
     * Update the allocation for a specific booking.
     */
    public function update(Request $request, Booking $booking): JsonResponse
    {
        $validated = $request->validate([
            'car_id' => ['nullable', 'exists:cars,id'],
            'driver_id' => ['nullable', 'exists:drivers,id'],
            'peluncur_id' => ['nullable', 'exists:users,id'],
            'petugas_cuci_id' => ['nullable', 'exists:users,id'],
            'amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $oldCarId = $booking->car_id;
        $newCarId = $validated['car_id'] ?? $booking->car_id;

        $booking->update([
            'car_id' => $newCarId,
            'driver_id' => $validated['driver_id'] ?? $booking->driver_id,
            'peluncur_id' => $validated['peluncur_id'] ?? $booking->peluncur_id,
            'petugas_cuci_id' => $validated['petugas_cuci_id'] ?? $booking->petugas_cuci_id,
            'amount' => isset($validated['amount']) ? $validated['amount'] : $booking->amount,
        ]);

        if ($booking->car_id && $booking->status === 'Pending') {
            $booking->update(['status' => 'Confirmed']);
        }

        if ($oldCarId && $newCarId && $oldCarId != $newCarId) {
            $booking->rentals()->where('status', 'Active')->update(['car_id' => $newCarId]);
        }

        return $this->sendResponse(
            new BookingResource($booking->fresh()->load(['customer', 'car', 'peluncur', 'petugasCuci', 'user', 'driver'])),
            $oldCarId && $oldCarId != $newCarId ? 'Unit armada berhasil ditukar.' : 'Alokasi armada mobil dan staf berhasil disimpan.'
        );
    }

    /**
     * Remove the allocation / booking record (Super Admin only).
     */
    public function destroy(Request $request, Booking $booking): JsonResponse
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403, 'Akses ditolak. Hanya Super Admin yang diizinkan menghapus data alokasi.');
        }

        $booking->delete();

        return $this->sendResponse(null, 'Data alokasi / booking berhasil dihapus.');
    }
}

