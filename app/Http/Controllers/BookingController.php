<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Car;
use App\Models\CarType;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\Rental;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    /**
     * Build bookings query with role scopes and optional filters.
     */
    private function buildBookingsQuery(Request $request)
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
     * Export bookings data for Excel generation.
     */
    public function export(Request $request)
    {
        $bookings = $this->buildBookingsQuery($request)->get();

        return response()->json([
            'data' => $bookings,
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $query = $this->buildBookingsQuery($request);

        $customerQuery = Customer::orderBy('name');
        if (! ($user->isAdmin() || $user->isPeluncur())) {
            $customerQuery->where('user_id', $user->id);
        }

        return Inertia::render('bookings/index', [
            'bookings' => $query->paginate(10)->withQueryString(),
            'customers' => $customerQuery->get(),
            'cars' => Car::orderBy('name')->get(),
            'readyCars' => Car::where('status', 'Ready')->orderBy('name')->get(),
            'readyDrivers' => Driver::where('status', 'Active')->orderBy('name')->get(),
            'carTypes' => CarType::orderBy('name')->get(),
            'peluncurOfficers' => User::whereJsonContains('roles', 'Peluncur')->orderBy('name')->get(),
            'washOfficers' => User::whereJsonContains('roles', 'Petugas Cuci')->orderBy('name')->get(),
            'marketingUsers' => User::where(function ($q) {
                $q->whereJsonContains('roles', 'Marketing')
                    ->orWhereJsonContains('roles', 'Admin')
                    ->orWhereJsonContains('roles', 'Super Admin');
            })->orderBy('name')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
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
        ], [
            'user_id.required' => 'Nama Marketing wajib dipilih.',
            'user_id.exists' => 'Marketing yang dipilih tidak valid.',
            'car_type.required' => 'Tipe mobil yang dipesan wajib diisi.',
            'rental_type.required' => 'Type sewa wajib dipilih.',
            'booking_date.required' => 'Tanggal sewa wajib diisi.',
            'return_date.required' => 'Tanggal balik wajib diisi.',
            'return_date.after_or_equal' => 'Tanggal balik harus sama atau setelah tanggal sewa.',
            'pickup_time.required' => 'Jam pengambilan wajib diisi.',
            'return_time.required' => 'Jam pengembalian wajib diisi.',
            'pickup_location.required' => 'Tempat pengambilan wajib diisi.',
            'dropoff_location.required' => 'Tempat pengantaran / pengembalian wajib diisi.',
            'payment_method.required' => 'Metode pembayaran wajib dipilih.',
        ]);

        if (empty($validated['customer_id']) && empty($validated['new_customer_name'])) {
            return back()->withErrors(['customer_id' => 'Pilih customer yang ada atau isi nama customer baru.']);
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
        Booking::create([
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

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Booking created successfully.',
        ]);

        return to_route('bookings.index');
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
     * Update the specified resource in storage. (Allocation / Assignment)
     */
    public function update(Request $request, Booking $booking): RedirectResponse
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

        // Only Super Admin can manually override booking status from edit booking form
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

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Booking updated successfully.',
        ]);

        return to_route('bookings.index');
    }

    /**
     * Cancel a booking.
     */
    public function cancel(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        if ($booking->status === 'Completed' || $booking->status === 'Returned') {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Booking yang sudah selesai atau dikembalikan tidak dapat dibatalkan.',
            ]);

            return back();
        }

        $validated = $request->validate([
            'cancellation_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $booking->update([
            'status' => 'Cancelled',
            'cancellation_reason' => $validated['cancellation_reason'] ?? null,
            'cancelled_at' => now(),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Booking berhasil dibatalkan.',
        ]);

        return back();
    }

    /**
     * Show checklist page for a specific booking.
     */
    public function showChecklist(Request $request, Booking $booking): Response
    {
        $this->authorizeBookingAccess($request, $booking);

        $booking->load(['customer', 'car', 'rental']);

        return Inertia::render('bookings/checklist', [
            'booking' => $booking,
        ]);
    }

    /**
     * Submit Delivery Checklist (Checklist Pengeluaran & Serah Terima).
     */
    public function submitDelivery(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        if (! empty($booking->delivery_checklist)) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Checklist penyerahan sudah pernah diisi dan telah dikunci.',
            ]);

            return back();
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

        // Handle uploaded photos
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

        // Automatically change car status to 'Not Ready' and update last_km
        if ($booking->car) {
            $booking->car->update([
                'status' => 'Not Ready',
                'last_km' => $validated['km_out'],
            ]);
        }

        // Automatically create or update Rental contract record
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

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Proses serah terima & checklist berhasil disimpan. Unit dalam status On Trip.',
        ]);

        return to_route('rentals.index');
    }

    /**
     * Submit Return Checklist (Checklist Pengembalian).
     */
    public function submitReturn(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        if (! empty($booking->return_checklist)) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Checklist pengembalian sudah pernah diisi dan telah dikunci.',
            ]);

            return back();
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

        // Handle uploaded photos
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

        // Automatically change car status to 'Ready' and update last_km
        if ($booking->car) {
            $booking->car->update([
                'status' => 'Ready',
                'last_km' => $kmIn,
            ]);
        }

        // Automatically update rental contract record
        Rental::where('booking_id', $booking->id)->update([
            'km_in' => $kmIn,
            'fuel_in' => $fuelIn,
            'checkin_datetime' => now(),
            'status' => 'Returned',
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Checklist pengembalian mobil berhasil disimpan. Status unit kini Ready.',
        ]);

        return to_route('rentals.index');
    }

    /**
     * Complete Washing Process.
     */
    public function completeWash(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorizeBookingAccess($request, $booking);

        $booking->update([
            'status' => 'Completed',
        ]);

        // Automatically change car status to 'Ready'
        if ($booking->car) {
            $booking->car->update(['status' => 'Ready']);
        }

        // Automatically update rental contract status to 'Completed'
        Rental::where('booking_id', $booking->id)->update(['status' => 'Completed']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pencucian mobil selesai. Mobil kini status Ready.',
        ]);

        return back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Booking $booking): RedirectResponse
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403, 'Akses ditolak. Hanya Super Admin yang dapat menghapus data booking.');
        }

        $this->authorizeBookingAccess($request, $booking);

        $booking->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Booking deleted successfully.',
        ]);

        return to_route('bookings.index');
    }

    /**
     * Check duplicate fields for inline new customer creation and throw validation exception with marketing name.
     */
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
                    $errors[$inputKey] = "{$config['label']} sudah terdaftar untuk customer lain dengan marketing {$marketingName}. Silakan hubungi admin atau marketing yang bersangkutan.";
                }
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }
}
