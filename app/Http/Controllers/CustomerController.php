<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        $query = Customer::with('user')->orderBy('name');

        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $marketingUsers = $user->isAdmin() ? User::where(function ($q) {
            $q->whereJsonContains('roles', 'Marketing')
                ->orWhereJsonContains('roles', 'Admin')
                ->orWhereJsonContains('roles', 'Super Admin');
        })->orderBy('name')->get(['id', 'name']) : [];

        return Inertia::render('customers/index', [
            'customers' => $query->get(),
            'marketingUsers' => $marketingUsers,
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
            'ktp_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'sim_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'selfie_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
        ];

        if ($request->user()->isAdmin()) {
            $rules['user_id'] = ['nullable', 'exists:users,id'];
        }

        $validated = $request->validate($rules);

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
            'ktp_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'sim_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'selfie_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
        ];

        if ($request->user()->isAdmin()) {
            $rules['user_id'] = ['nullable', 'exists:users,id'];
        }

        $validated = $request->validate($rules);

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

        $customer->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer updated successfully.']);

        return to_route('customers.index');
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
