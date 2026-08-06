<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('customers/index', [
            'customers' => Customer::orderBy('name')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
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
        ]);

        foreach (['ktp_photo', 'sim_photo', 'selfie_photo'] as $field) {
            if ($request->hasFile($field)) {
                $validated[$field] = $request->file($field)->store('customers', 'public');
            }
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
        $validated = $request->validate([
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
        ]);

        foreach (['ktp_photo', 'sim_photo', 'selfie_photo'] as $field) {
            if ($request->hasFile($field)) {
                $validated[$field] = $request->file($field)->store('customers', 'public');
            } else {
                unset($validated[$field]);
            }
        }

        $customer->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer updated successfully.']);

        return to_route('customers.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Customer $customer): RedirectResponse
    {
        $customer->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer deleted successfully.']);

        return to_route('customers.index');
    }
}
