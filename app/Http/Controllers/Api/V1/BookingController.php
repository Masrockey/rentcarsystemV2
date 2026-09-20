<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\BookingResource;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\Rental;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BookingController extends BaseApiController
{
    /**
     * Build bookings query with role scopes and optional filters.
     */
    private function buildBookingsQuery(Request $request)
    {
        $user = $request->user();

        $query = Booking::with(['customer', 'car', 'peluncur', 'petugasCuci', 'user', 'driver', 'rental'])->latest();

        if (! ($user->isAdmin() || $user->isPeluncur())) {
            $driverId = $user->driver?->id ?? Driver::where('user_id', $user->id)->value('id') ?? ($user->phone ? Driver::where('phone', $user->phone)->value('id') : null);
            $query->where(function ($q) use ($user, $driverId) {
                if ($user->isDriver() && $driverId) {
                    $q->where('driver_id', $driverId);
                } else {
                    $q->where('user_id', $user->id)
                        ->orWhere('peluncur_id', $user->id)
                        ->orWhere('petugas_cuci_id', $user->id);

                    if ($driverId) {
                        $q->orWhere('driver_id', $driverId);
                    }
                }
            });
        }

        // Apply Status Filter
        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        // Apply Marketing Filter
        if ($request->filled('marketing_id') && $request->query('marketing_id') !== 'all') {
            $query->where('user_id', $request->query('marketing_id'));
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

        return $query;
    }

    /**
     * Authorize access to a specific booking record.
     */
    private function authorizeBookingAccess(Request $request, Booking $booking): void
    {
        $user = $request->user();
        if ($user->isAdmin() || $user->isPeluncur()) {
            return;
        }

        if (
            $booking->user_id !== $user->id &&
            $booking->peluncur_id !== $user->id &&
            $booking->petugas_cuci_id !== $user->id
        ) {
            abort(403, 'Akses ditolak. Anda tidak memiliki hak akses ke data booking ini.');
        }
    }

    /**
     * Display a listing of bookings.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 10);
        $bookings = $this->buildBookingsQuery($request)->paginate($perPage);

        return $this->sendResponse(
            BookingResource::collection($bookings),
            'Daftar booking berhasil diambil.',
            200,
            [
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
                'per_page' => $bookings->perPage(),
                'total' => $bookings->total(),
            ]
        );
    }

    /**
     * Export bookings data as structured JSON.
     */
    public function export(Request $request): JsonResponse
    {
        $bookings = $this->buildBookingsQuery($request)->get();

        return $this->sendResponse(BookingResource::collection($bookings), 'Data ekspor booking berhasil diambil.');
    }

    /**
     * Store a newly created booking.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => [$request->user()->isAdmin() ? 'required' : 'nullable', 'exists:users,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'new_customer_name' => ['nullable', 'string', 'max:255'],
            'new_customer_nik' => ['nullable', 'string', 'max:50'],
            'new_customer_phone' => ['nullable', 'string', 'max:50'],
            'new_customer_email' => ['nullable', 'string', 'email', 'max:255'],
            'new_customer_emergency_contact' => ['nullable', 'string', 'max:50'],
            'new_customer_address' => ['nullable', 'string'],
            'new_customer_sim_number' => ['nullable', 'string', 'max:50'],
            'new_customer_sim_expiry' => ['nullable', 'date'],
            'new_customer_ktp_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'new_customer_sim_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'new_customer_selfie_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'car_type' => ['required', 'string', 'max:255'],
            'rental_type' => ['required', Rule::in(['Lepas Kunci', 'With Driver'])],
            'booking_date' => ['required', 'date'],
            'return_date' => ['required', 'date', 'after_or_equal:booking_date'],
            'pickup_time' => ['required', 'string', 'max:20'],
            'return_time' => ['required', 'string', 'max:20'],
            'pickup_location' => ['required', 'string', 'max:255'],
            'dropoff_location' => ['required', 'string', 'max:255'],
            'payment_method' => ['required', Rule::in(['Cash', 'Transfer', 'DP'])],
            'payment_status' => ['nullable', Rule::in(['Pending', 'Paid', 'Down Payment'])],
            'amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        if (empty($validated['customer_id']) && empty($validated['new_customer_name'])) {
            return $this->sendError('Validasi gagal', [
                'customer_id' => ['Pilih customer yang ada atau isi nama customer baru.'],
            ], 422);
        }

        if (! empty($validated['new_customer_name'])) {
            $this->validateNewCustomerDuplicates($request);
        }

        $userId = ($request->user()->isAdmin() && ! empty($validated['user_id']))
            ? $validated['user_id']
            : $request->user()->id;

        if (! empty($validated['new_customer_name'])) {
            $ktpPhotoPath = $request->hasFile('new_customer_ktp_photo')
                ? $request->file('new_customer_ktp_photo')->store('customers', 'public')
                : null;

            $simPhotoPath = $request->hasFile('new_customer_sim_photo')
                ? $request->file('new_customer_sim_photo')->store('customers', 'public')
                : null;

            $selfiePhotoPath = $request->hasFile('new_customer_selfie_photo')
                ? $request->file('new_customer_selfie_photo')->store('customers', 'public')
                : null;

            $customer = Customer::create([
                'user_id' => $userId,
                'name' => $validated['new_customer_name'],
                'nik' => $validated['new_customer_nik'] ?? null,
                'phone' => $validated['new_customer_phone'] ?? null,
                'email' => $validated['new_customer_email'] ?? null,
                'address' => $validated['new_customer_address'] ?? null,
                'emergency_contact' => $validated['new_customer_emergency_contact'] ?? null,
                'sim_number' => $validated['new_customer_sim_number'] ?? null,
                'sim_expiry' => $validated['new_customer_sim_expiry'] ?? null,
                'ktp_photo' => $ktpPhotoPath,
                'sim_photo' => $simPhotoPath,
                'selfie_photo' => $selfiePhotoPath,
            ]);
            $customerId = $customer->id;
        } else {
            $customerId = $validated['customer_id'];
        }

        $bookingNumber = 'BK-'.date('Ymd').'-'.strtoupper(Str::random(6));
        $booking = Booking::create([
            'user_id' => $userId,
            'customer_id' => $customerId,
            'car_type' => $validated['car_type'],
            'rental_type' => $validated['rental_type'] ?? 'Lepas Kunci',
            'booking_date' => $validated['booking_date'],
            'return_date' => $validated['return_date'] ?? null,
            'pickup_time' => $validated['pickup_time'] ?? null,
            'return_time' => $validated['return_time'] ?? null,
            'pickup_location' => $validated['pickup_location'] ?? null,
            'dropoff_location' => $validated['dropoff_location'] ?? null,
            'payment_method' => $validated['payment_method'],
            'payment_status' => $validated['payment_status'] ?? 'Pending',
            'amount' => $validated['amount'] ?? 0,
            'booking_number' => $bookingNumber,
            'status' => 'Pending',
        ]);

        NotificationService::sendToRoles(
            ['Admin', 'Super Admin'],
            'Booking Baru Dibuat',
            "Marketing ({$request->user()->name}) membuat booking baru: {$booking->booking_number} untuk customer {$customer->name}.",
            route('bookings.index', ['search' => $booking->booking_number]),
            'booking_created',
            'CalendarPlus',
            ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number],
            $request->user()->id
        );

        return $this->sendResponse(new BookingResource($booking->load(['customer', 'user'])), 'Booking berhasil dibuat.', 201);
    }

    /**
     * Display the specified booking.
     */
    public function show(Request $request, Booking $booking): JsonResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        $booking->load(['customer', 'car', 'peluncur', 'petugasCuci', 'user', 'driver', 'rental']);

        return $this->sendResponse(new BookingResource($booking), 'Detail booking berhasil diambil.');
    }

    /**
     * Update the specified booking.
     */
    public function update(Request $request, Booking $booking): JsonResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        $validated = $request->validate([
            'user_id' => ['nullable', 'exists:users,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'car_type' => ['nullable', 'string', 'max:255'],
            'rental_type' => ['nullable', Rule::in(['Lepas Kunci', 'With Driver'])],
            'booking_date' => ['nullable', 'date'],
            'return_date' => ['nullable', 'date', 'after_or_equal:booking_date'],
            'pickup_time' => ['nullable', 'string', 'max:20'],
            'return_time' => ['nullable', 'string', 'max:20'],
            'pickup_location' => ['nullable', 'string', 'max:255'],
            'dropoff_location' => ['nullable', 'string', 'max:255'],
            'payment_method' => ['nullable', Rule::in(['Cash', 'Transfer', 'DP'])],
            'car_id' => ['nullable', 'exists:cars,id'],
            'driver_id' => ['nullable', 'exists:drivers,id'],
            'peluncur_id' => ['nullable', 'exists:users,id'],
            'petugas_cuci_id' => ['nullable', 'exists:users,id'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'payment_status' => ['nullable', Rule::in(['Pending', 'Paid', 'Down Payment'])],
            'status' => ['nullable', Rule::in(['Pending', 'Confirmed', 'On Trip', 'Returned', 'Completed', 'Cancelled'])],
            'cancellation_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $updateData = array_filter($validated, fn ($val) => $val !== null);

        if (! $request->user()->isSuperAdmin()) {
            unset($updateData['status']);
        }

        if (isset($updateData['status']) && $updateData['status'] === 'Cancelled' && ! $booking->cancelled_at) {
            $updateData['cancelled_at'] = now();
        }

        $booking->update($updateData);

        // If car is assigned, auto-confirm booking if it was pending
        if ($booking->car_id && $booking->status === 'Pending') {
            $booking->update(['status' => 'Confirmed']);
        }

        return $this->sendResponse(
            new BookingResource($booking->fresh()->load(['customer', 'car', 'peluncur', 'petugasCuci', 'user', 'driver', 'rental'])),
            'Booking berhasil diperbarui.'
        );
    }

    /**
     * Cancel a booking.
     */
    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        if ($booking->status === 'Completed' || $booking->status === 'Returned') {
            return $this->sendError('Booking yang sudah selesai atau dikembalikan tidak dapat dibatalkan.', [], 422);
        }

        $validated = $request->validate([
            'cancellation_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $booking->update([
            'status' => 'Cancelled',
            'cancellation_reason' => $validated['cancellation_reason'] ?? null,
            'cancelled_at' => now(),
        ]);

        NotificationService::sendToRoles(
            ['Admin', 'Super Admin'],
            'Booking Dibatalkan',
            "Booking {$booking->booking_number} ({$booking->customer?->name}) telah dibatalkan.",
            route('bookings.index', ['search' => $booking->booking_number]),
            'booking_cancelled',
            'XCircle',
            ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number],
            $request->user()->id
        );

        if ($booking->peluncur_id && $booking->peluncur_id !== $request->user()->id) {
            NotificationService::sendToUser(
                $booking->peluncur_id,
                'Tugas Booking Dibatalkan',
                "Booking {$booking->booking_number} yang ditugaskan kepada Anda telah dibatalkan.",
                route('bookings.index', ['search' => $booking->booking_number]),
                'booking_cancelled',
                'XCircle',
                ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number]
            );
        }

        if ($booking->user_id && $booking->user_id !== $request->user()->id) {
            NotificationService::sendToUser(
                $booking->user_id,
                'Booking Anda Dibatalkan',
                "Booking {$booking->booking_number} Anda telah dibatalkan.",
                route('bookings.index', ['search' => $booking->booking_number]),
                'booking_cancelled',
                'XCircle',
                ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number]
            );
        }

        return $this->sendResponse(new BookingResource($booking->fresh()), 'Booking berhasil dibatalkan.');
    }

    /**
     * Get checklist status and data for a booking.
     */
    public function showChecklist(Request $request, Booking $booking): JsonResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        $booking->load(['customer', 'car', 'rental']);

        return $this->sendResponse([
            'booking' => new BookingResource($booking),
            'delivery_checklist' => $booking->delivery_checklist,
            'return_checklist' => $booking->return_checklist,
        ], 'Data checklist booking berhasil diambil.');
    }

    /**
     * Submit Delivery Checklist (Serah Terima Unit).
     */
    public function submitDelivery(Request $request, Booking $booking): JsonResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        if (! empty($booking->delivery_checklist)) {
            return $this->sendError('Checklist penyerahan sudah pernah diisi dan telah dikunci.', [], 422);
        }

        $validated = $request->validate([
            'checklist' => ['required', 'array'],
            'latitude' => ['nullable', 'string'],
            'longitude' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'km_out' => ['required', 'integer', 'min:0'],
            'fuel_out' => ['required', 'integer', 'min:0', 'max:100'],
            'fuel_range_km' => ['nullable', 'integer', 'min:0'],
            'handover_location' => ['nullable', 'string', 'max:255'],
            'checkout_date' => ['nullable', 'string'],
            'checkout_time' => ['nullable', 'string'],
            'checkout_datetime' => ['nullable', 'date'],
            'photos' => ['nullable', 'array'],
            'photos.*' => ['nullable'],
        ]);

        $checklistData = $validated['checklist'];

        $photoPaths = [];
        if ($request->has('photos') && is_array($request->input('photos'))) {
            foreach ($request->input('photos') as $p) {
                if (is_string($p) && ! empty($p)) {
                    $photoPaths[] = $p;
                }
            }
        }

        if (isset($checklistData['photos']) && is_array($checklistData['photos'])) {
            foreach ($checklistData['photos'] as $p) {
                if (is_string($p) && ! empty($p)) {
                    $photoPaths[] = $p;
                }
            }
        }

        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $file) {
                if ($file && $file->isValid()) {
                    $stored = $file->store('checklists', 'public');
                    $photoPaths[] = Storage::url($stored);
                }
            }
        }

        $checklistData['photos'] = array_values(array_unique($photoPaths));
        $checklistData['km_out'] = $validated['km_out'];
        $checklistData['fuel_out'] = $validated['fuel_out'];
        $checklistData['fuel_range_km'] = $validated['fuel_range_km'] ?? null;
        $checklistData['handover_location'] = $validated['handover_location'] ?? null;
        $checklistData['checkout_date'] = $validated['checkout_date'] ?? null;
        $checklistData['checkout_time'] = $validated['checkout_time'] ?? null;
        $checklistData['latitude'] = $validated['latitude'] ?? null;
        $checklistData['longitude'] = $validated['longitude'] ?? null;

        $booking->update([
            'delivery_checklist' => $checklistData,
            'delivery_latitude' => $validated['latitude'] ?? null,
            'delivery_longitude' => $validated['longitude'] ?? null,
            'delivery_notes' => $validated['notes'] ?? null,
            'fuel_range_km' => $validated['fuel_range_km'] ?? null,
            'status' => 'On Trip',
        ]);

        // Auto change car status to Not Ready
        if ($booking->car) {
            $booking->car->update([
                'status' => 'Not Ready',
                'last_km' => $validated['km_out'],
            ]);
        }

        // Auto create or update Rental contract
        if ($booking->car_id && $booking->customer_id) {
            $existingRental = Rental::where('booking_id', $booking->id)->first();
            Rental::updateOrCreate(
                ['booking_id' => $booking->id],
                [
                    'contract_number' => $existingRental?->contract_number ?? ('KTR-'.date('Ymd').'-'.strtoupper(Str::random(6))),
                    'car_id' => $booking->car_id,
                    'customer_id' => $booking->customer_id,
                    'officer_id' => $booking->peluncur_id ?? $request->user()->id,
                    'checkout_datetime' => $validated['checkout_datetime'] ?? now(),
                    'handover_location' => $validated['handover_location'] ?? null,
                    'km_out' => $validated['km_out'],
                    'fuel_out' => $validated['fuel_out'],
                    'fuel_range_km' => $validated['fuel_range_km'] ?? null,
                    'fine_amount' => $existingRental?->fine_amount ?? 0,
                    'total_payment' => $booking->amount ?? 0,
                    'status' => $existingRental?->status ?? 'Active',
                ]
            );
        }

        NotificationService::sendToRoles(
            ['Admin', 'Super Admin'],
            'Serah Terima Unit Berhasil (On Trip)',
            "Unit untuk booking {$booking->booking_number} ({$booking->customer?->name}) telah diserahterimakan oleh {$request->user()->name} dan berstatus On Trip.",
            route('bookings.index', ['search' => $booking->booking_number]),
            'delivery_completed',
            'KeyRound',
            ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number],
            $request->user()->id
        );

        return $this->sendResponse(
            new BookingResource($booking->fresh()->load(['car', 'customer', 'rental'])),
            'Proses serah terima & checklist berhasil disimpan. Unit dalam status On Trip.'
        );
    }

    /**
     * Submit Return Checklist (Pengembalian Unit).
     */
    public function submitReturn(Request $request, Booking $booking): JsonResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        if (! empty($booking->return_checklist)) {
            return $this->sendError('Checklist pengembalian sudah pernah diisi dan telah dikunci.', [], 422);
        }

        $validated = $request->validate([
            'checklist' => ['required', 'array'],
            'latitude' => ['nullable', 'string'],
            'longitude' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'km_out' => ['nullable', 'integer', 'min:0'],
            'fuel_out' => ['nullable', 'integer', 'min:0', 'max:100'],
            'fuel_range_km' => ['nullable', 'integer', 'min:0'],
            'handover_location' => ['nullable', 'string', 'max:255'],
            'checkout_date' => ['nullable', 'string'],
            'checkout_time' => ['nullable', 'string'],
            'photos' => ['nullable', 'array'],
            'photos.*' => ['nullable'],
        ]);

        $checklistData = $validated['checklist'];

        $photoPaths = [];
        if ($request->has('photos') && is_array($request->input('photos'))) {
            foreach ($request->input('photos') as $p) {
                if (is_string($p) && ! empty($p)) {
                    $photoPaths[] = $p;
                }
            }
        }

        if (isset($checklistData['photos']) && is_array($checklistData['photos'])) {
            foreach ($checklistData['photos'] as $p) {
                if (is_string($p) && ! empty($p)) {
                    $photoPaths[] = $p;
                }
            }
        }

        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $file) {
                if ($file && $file->isValid()) {
                    $stored = $file->store('checklists', 'public');
                    $photoPaths[] = Storage::url($stored);
                }
            }
        }

        $checklistData['photos'] = array_values(array_unique($photoPaths));
        $checklistData['km_out'] = $validated['km_out'] ?? null;
        $checklistData['fuel_out'] = $validated['fuel_out'] ?? null;
        $checklistData['fuel_range_km'] = $validated['fuel_range_km'] ?? null;
        $checklistData['handover_location'] = $validated['handover_location'] ?? null;
        $checklistData['checkout_date'] = $validated['checkout_date'] ?? null;
        $checklistData['checkout_time'] = $validated['checkout_time'] ?? null;
        $checklistData['latitude'] = $validated['latitude'] ?? null;
        $checklistData['longitude'] = $validated['longitude'] ?? null;

        $booking->update([
            'return_checklist' => $checklistData,
            'return_latitude' => $validated['latitude'] ?? null,
            'return_longitude' => $validated['longitude'] ?? null,
            'return_notes' => $validated['notes'] ?? null,
            'status' => 'Returned',
        ]);

        $kmIn = $validated['km_out'] ?? ($booking->car->last_km ?? 0);
        $fuelIn = $validated['fuel_out'] ?? 100;

        // Auto change car status to Ready
        if ($booking->car) {
            $booking->car->update([
                'status' => 'Ready',
                'last_km' => $kmIn,
            ]);
        }

        // Auto update rental contract
        Rental::where('booking_id', $booking->id)->update([
            'km_in' => $kmIn,
            'fuel_in' => $fuelIn,
            'checkin_datetime' => now(),
            'status' => 'Returned',
        ]);

        NotificationService::sendToRoles(
            ['Admin', 'Super Admin', 'Petugas Cuci'],
            'Checklist Pengembalian Selesai',
            "Checklist pengembalian untuk booking {$booking->booking_number} telah diselesaikan oleh {$request->user()->name}.",
            route('bookings.index', ['search' => $booking->booking_number]),
            'return_completed',
            'ClipboardCheck',
            ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number],
            $request->user()->id
        );

        return $this->sendResponse(
            new BookingResource($booking->fresh()->load(['car', 'customer', 'rental'])),
            'Checklist pengembalian mobil berhasil disimpan. Status unit kini Ready.'
        );
    }

    /**
     * Complete Washing Process.
     */
    public function completeWash(Request $request, Booking $booking): JsonResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        $booking->update([
            'status' => 'Completed',
        ]);

        if ($booking->car) {
            $booking->car->update(['status' => 'Ready']);
        }

        Rental::where('booking_id', $booking->id)->update(['status' => 'Completed']);

        NotificationService::sendToRoles(
            ['Admin', 'Super Admin'],
            'Pencucian Selesai / Booking Selesai',
            "Pencucian unit untuk booking {$booking->booking_number} telah diselesaikan. Booking kini berstatus Completed.",
            route('bookings.index', ['search' => $booking->booking_number]),
            'wash_completed',
            'CheckCircle2',
            ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number],
            $request->user()->id
        );

        if ($booking->user_id && $booking->user_id !== $request->user()->id) {
            NotificationService::sendToUser(
                $booking->user_id,
                'Booking Telah Selesai',
                "Booking {$booking->booking_number} ({$booking->customer?->name}) telah selesai secara menyeluruh.",
                route('bookings.index', ['search' => $booking->booking_number]),
                'booking_completed',
                'CheckCircle2',
                ['booking_id' => $booking->id, 'booking_number' => $booking->booking_number]
            );
        }

        return $this->sendResponse(
            new BookingResource($booking->fresh()->load(['car', 'customer', 'rental'])),
            'Pesanan booking berhasil diselesaikan. Status armada mobil kini Ready.'
        );
    }

    /**
     * Remove the specified booking.
     */
    public function destroy(Request $request, Booking $booking): JsonResponse
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403, 'Akses ditolak. Hanya Super Admin yang dapat menghapus data booking.');
        }

        $this->authorizeBookingAccess($request, $booking);

        $booking->delete();

        return $this->sendResponse(null, 'Booking berhasil dihapus.');
    }

    private function validateNewCustomerDuplicates(Request $request): void
    {
        $errors = [];

        $fields = [
            'new_customer_name' => ['field' => 'name', 'label' => 'Nama customer'],
            'new_customer_nik' => ['field' => 'nik', 'label' => 'NIK'],
            'new_customer_phone' => ['field' => 'phone', 'label' => 'Nomor HP'],
            'new_customer_email' => ['field' => 'email', 'label' => 'Email'],
        ];

        foreach ($fields as $inputKey => $config) {
            $value = $request->input($inputKey);
            if (! empty($value)) {
                $existing = Customer::with('user')->where($config['field'], $value)->first();
                if ($existing) {
                    $marketingName = $existing->user?->name ?? 'Admin / System';
                    $errors[$inputKey] = ["{$config['label']} sudah terdaftar untuk customer lain dengan marketing {$marketingName}. Silakan hubungi admin atau marketing yang bersangkutan."];
                }
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }
}
