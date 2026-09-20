<?php

namespace App\Http\Controllers;

use App\Models\Blacklist;
use App\Models\Booking;
use App\Models\Car;
use App\Models\Driver;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AllocationController extends Controller
{
    /**
     * Export car & staff allocations to Excel/CSV or JSON.
     */
    public function export(Request $request): StreamedResponse|JsonResponse
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

        // Apply Status Filter
        if ($request->filled('status')) {
            $status = $request->query('status');
            if ($status === 'unallocated') {
                $query->whereNull('car_id');
            } elseif ($status === 'allocated') {
                $query->whereNotNull('car_id');
            }
        }

        // Apply Date Filters
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

        // Apply Search Filter
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
                    })
                    ->orWhereHas('driver', function ($d) use ($search) {
                        $d->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('peluncur', function ($p) use ($search) {
                        $p->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('petugasCuci', function ($pc) use ($search) {
                        $pc->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('marketing_id') && $request->query('marketing_id') !== 'all') {
            $query->where('user_id', $request->query('marketing_id'));
        }

        $bookings = $query->get();

        if ($request->wantsJson() || $request->query('format') === 'json') {
            return response()->json([
                'data' => $bookings,
            ]);
        }

        $filename = 'alokasi-armada-'.now()->format('Y-m-d-His').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->streamDownload(function () use ($bookings) {
            $handle = fopen('php://output', 'w');

            // Add UTF-8 BOM for Microsoft Excel compatibility
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // CSV Header Row
            fputcsv($handle, [
                'No',
                'No. Booking',
                'Nama Pelanggan',
                'No. HP Pelanggan',
                'NIK Pelanggan',
                'Tipe Mobil Dipesan',
                'Tipe Sewa',
                'Status Alokasi',
                'Armada Mobil Alokasi',
                'No. Polisi',
                'Tanggal Sewa (Mulai)',
                'Jam Jemput',
                'Lokasi Jemput',
                'Tanggal Sewa (Selesai)',
                'Jam Selesai',
                'Lokasi Antar',
                'Marketing / Dibuat Oleh',
                'Supir / Driver',
                'Petugas Peluncur',
                'Petugas Cuci',
                'Harga Sewa (Rp)',
                'Status Pembayaran',
                'Metode Pembayaran',
                'Status Booking',
            ]);

            $index = 1;
            foreach ($bookings as $b) {
                fputcsv($handle, [
                    $index++,
                    $b->booking_number ?? '-',
                    $b->customer?->name ?? '-',
                    $b->customer?->phone ?? '-',
                    $b->customer?->nik ?? '-',
                    $b->car_type ?? '-',
                    $b->rental_type ?? 'Lepas Kunci',
                    $b->car_id ? 'Sudah Dialokasi' : 'Belum Dialokasi',
                    $b->car?->name ?? 'Belum Dialokasi',
                    $b->car?->plate_number ?? '-',
                    $b->booking_date ?? '-',
                    $b->pickup_time ? substr($b->pickup_time, 0, 5) : '-',
                    $b->pickup_location ?? '-',
                    $b->return_date ?? '-',
                    $b->return_time ? substr($b->return_time, 0, 5) : '-',
                    $b->dropoff_location ?? '-',
                    $b->user?->name ?? 'Admin / System',
                    $b->driver?->name ?? ($b->rental_type === 'With Driver' ? 'Belum Dialokasi' : '-'),
                    $b->peluncur?->name ?? 'Belum ada',
                    $b->petugasCuci?->name ?? 'Belum ada',
                    $b->amount ? (float) $b->amount : 0,
                    $b->payment_status ?? 'Pending',
                    $b->payment_method ?? 'Cash',
                    $b->status ?? 'Pending',
                ]);
            }

            fclose($handle);
        }, $filename, $headers);
    }

    /**
     * Display a listing of car & staff allocations.
     */
    public function index(Request $request): Response
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

        $unallocatedCount = (clone $query)->whereNull('car_id')->count();
        $allocatedCount = (clone $query)->whereNotNull('car_id')->count();
        $bookings = $query->paginate(10)->withQueryString();

        return Inertia::render('allocations/index', [
            'bookings' => $bookings,
            'readyCars' => Car::where('status', 'Ready')->orderBy('name')->get(),
            'readyDrivers' => Driver::where('status', 'Active')->orderBy('name')->get(),
            'peluncurOfficers' => User::whereJsonContains('roles', 'Peluncur')->orderBy('name')->get(),
            'washOfficers' => User::whereJsonContains('roles', 'Petugas Cuci')->orderBy('name')->get(),
            'unallocatedCount' => $unallocatedCount,
            'allocatedCount' => $allocatedCount,
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

        $booking->loadMissing(['customer', 'car', 'driver']);

        // Notify Peluncur
        if ($booking->peluncur_id) {
            NotificationService::sendToUser(
                $booking->peluncur_id,
                'Tugas Serah Terima Booking',
                "Anda ditugaskan sebagai peluncur untuk booking {$booking->booking_number} (Customer: ".($booking->customer?->name ?? '-').'). Mohon lakukan serah terima kendaraan.',
                route('bookings.index', ['search' => $booking->booking_number]),
                'booking_allocated',
                'Car',
                ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number]
            );
        }

        // Notify Driver if linked to a user account
        if ($booking->driver?->user_id) {
            NotificationService::sendToUser(
                $booking->driver->user_id,
                'Penugasan Driver Booking',
                "Anda ditugaskan sebagai driver untuk booking {$booking->booking_number} (Customer: ".($booking->customer?->name ?? '-').').',
                route('bookings.index', ['search' => $booking->booking_number]),
                'booking_allocated',
                'Car',
                ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number]
            );
        }

        // Notify Marketing user who created the booking
        if ($booking->user_id && $booking->user_id !== $request->user()->id) {
            $carName = $booking->car ? "{$booking->car->name} ({$booking->car->plate_number})" : 'Armada Mobil';
            NotificationService::sendToUser(
                $booking->user_id,
                'Booking Telah Dialokasikan',
                "Booking {$booking->booking_number} Anda telah dialokasikan armada {$carName}.",
                route('bookings.index', ['search' => $booking->booking_number]),
                'booking_allocated',
                'CheckCircle',
                ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number]
            );
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $oldCarId && $oldCarId != $newCarId ? 'Unit armada berhasil ditukar.' : 'Alokasi armada mobil dan staf berhasil disimpan.',
        ]);

        return back();
    }

    /**
     * Remove the allocation / booking record (Super Admin only).
     */
    public function destroy(Request $request, Booking $booking): RedirectResponse
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403, 'Hanya Super Admin yang diizinkan menghapus data alokasi.');
        }

        $booking->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Data alokasi / booking berhasil dihapus.',
        ]);

        return back();
    }
}
