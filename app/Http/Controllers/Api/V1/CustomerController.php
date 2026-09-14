<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CustomerController extends BaseApiController
{
    /**
     * Display a listing of customers.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $search = $request->query('search', '');

        $query = Customer::with('user')->orderBy('name');

        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhere('sim_number', 'like', "%{$search}%")
                    ->orWhere('emergency_contact', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = (int) $request->query('per_page', 10);
        $customers = $query->paginate($perPage);

        return $this->sendResponse(
            CustomerResource::collection($customers),
            'Daftar pelanggan berhasil diambil.',
            200,
            [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ]
        );
    }

    /**
     * Store a newly created customer.
     */
    public function store(Request $request): JsonResponse
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'nik' => ['nullable', 'string', 'max:20'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'sim_number' => ['nullable', 'string', 'max:50'],
            'sim_expiry' => ['nullable', 'date'],
            'emergency_contact' => ['nullable', 'string', 'max:50'],
            'ktp_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'sim_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'selfie_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];

        if ($request->user()->isAdmin()) {
            $rules['user_id'] = ['nullable', 'exists:users,id'];
        }

        $validated = $request->validate($rules, [
            'name.required' => 'Nama customer wajib diisi.',
        ]);

        $this->validateCustomerDuplicates($request);

        foreach (['ktp_photo', 'sim_photo', 'selfie_photo'] as $field) {
            if ($request->hasFile($field)) {
                $validated[$field] = $request->file($field)->store('customers', 'public');
            }
        }

        if (! $request->user()->isAdmin() || empty($validated['user_id'])) {
            $validated['user_id'] = $request->user()->id;
        }

        $customer = Customer::create($validated);

        return $this->sendResponse(new CustomerResource($customer->load('user')), 'Data pelanggan berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified customer.
     */
    public function show(Request $request, Customer $customer): JsonResponse
    {
        if (! $request->user()->isAdmin() && $customer->user_id !== $request->user()->id) {
            abort(403, 'Akses ditolak. Anda tidak memiliki akses ke data pelanggan ini.');
        }

        return $this->sendResponse(new CustomerResource($customer->load(['user', 'bookings'])), 'Detail pelanggan berhasil diambil.');
    }

    /**
     * Update the specified customer.
     */
    public function update(Request $request, Customer $customer): JsonResponse
    {
        if (! $request->user()->isAdmin() && $customer->user_id !== $request->user()->id) {
            abort(403, 'Akses ditolak. Anda tidak memiliki akses untuk mengubah data pelanggan ini.');
        }

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'nik' => ['nullable', 'string', 'max:20'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'sim_number' => ['nullable', 'string', 'max:50'],
            'sim_expiry' => ['nullable', 'date'],
            'emergency_contact' => ['nullable', 'string', 'max:50'],
            'ktp_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'sim_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'selfie_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];

        if ($request->user()->isAdmin()) {
            $rules['user_id'] = ['nullable', 'exists:users,id'];
        }

        $validated = $request->validate($rules, [
            'name.required' => 'Nama customer wajib diisi.',
        ]);

        $this->validateCustomerDuplicates($request, $customer->id);

        foreach (['ktp_photo', 'sim_photo', 'selfie_photo'] as $field) {
            if ($request->hasFile($field)) {
                $validated[$field] = $request->file($field)->store('customers', 'public');
            } else {
                unset($validated[$field]);
            }
        }

        if (! $request->user()->isAdmin()) {
            unset($validated['user_id']);
        }

        if (isset($validated['phone']) && str_contains($validated['phone'], '*')) {
            unset($validated['phone']);
        }

        $customer->update($validated);

        return $this->sendResponse(new CustomerResource($customer->fresh()->load('user')), 'Data pelanggan berhasil diperbarui.');
    }

    /**
     * Remove the specified customer.
     */
    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        if (! $request->user()->isAdmin() && $customer->user_id !== $request->user()->id) {
            abort(403, 'Akses ditolak. Anda tidak memiliki izin untuk menghapus pelanggan ini.');
        }

        $customer->delete();

        return $this->sendResponse(null, 'Data pelanggan berhasil dihapus.');
    }

    /**
     * Check customer duplicate fields and throw validation exception with marketing name.
     */
    private function validateCustomerDuplicates(Request $request, ?int $ignoreCustomerId = null): void
    {
        $errors = [];

        $fields = [
            'name' => 'Nama customer',
            'nik' => 'NIK',
            'phone' => 'Nomor HP',
            'email' => 'Email',
        ];

        foreach ($fields as $field => $label) {
            $value = $request->input($field);
            if (! empty($value)) {
                if ($field === 'phone' && str_contains($value, '*')) {
                    continue;
                }

                $query = Customer::with('user')->where($field, $value);
                if ($ignoreCustomerId) {
                    $query->where('id', '!=', $ignoreCustomerId);
                }
                $existing = $query->first();
                if ($existing) {
                    $marketingName = $existing->user?->name ?? 'Admin / System';
                    $errors[$field] = ["{$label} sudah terdaftar untuk customer lain dengan marketing {$marketingName}. Silakan hubungi admin atau marketing yang bersangkutan."];
                }
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }
}
