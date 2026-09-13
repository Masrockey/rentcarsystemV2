<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
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

        $marketingUsers = $user->isAdmin() ? User::where(function ($q) {
            $q->whereJsonContains('roles', 'Marketing')
                ->orWhereJsonContains('roles', 'Admin')
                ->orWhereJsonContains('roles', 'Super Admin');
        })->orderBy('name')->get(['id', 'name']) : [];

        return Inertia::render('customers/index', [
            'customers' => $query->paginate(10)->withQueryString(),
            'marketingUsers' => $marketingUsers,
            'search' => $search,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
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

        Customer::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer created successfully.']);

        return to_route('customers.index');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Customer $customer): RedirectResponse
    {
        if (! $request->user()->isAdmin() && $customer->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized action.');
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

        // Non-admin cannot change user_id
        if (! $request->user()->isAdmin()) {
            unset($validated['user_id']);
        }

        // If phone is masked (contains *), do not overwrite original phone
        if (isset($validated['phone']) && str_contains($validated['phone'], '*')) {
            unset($validated['phone']);
        }

        $customer->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer updated successfully.']);

        return to_route('customers.index');
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
                // Ignore masked phone containing *
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
                    $errors[$field] = "{$label} sudah terdaftar untuk customer lain dengan marketing {$marketingName}. Silakan hubungi admin atau marketing yang bersangkutan.";
                }
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Customer $customer): RedirectResponse
    {
        if (! $request->user()->isAdmin() && $customer->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized action.');
        }

        $customer->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer deleted successfully.']);

        return to_route('customers.index');
    }
}
