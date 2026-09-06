<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DriverController extends Controller
{
    /**
     * Display a listing of drivers.
     */
    public function index(): Response
    {
        return Inertia::render('drivers/index', [
            'drivers' => Driver::orderBy('name')->paginate(10)->withQueryString(),
        ]);
    }

    /**
     * Store a newly created driver.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'sim' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'status' => ['required', 'string', Rule::in(['Active', 'Inactive'])],
            'daily_rate' => ['required', 'numeric', 'min:0'],
        ]);

        Driver::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Driver added successfully.']);

        return to_route('drivers.index');
    }

    /**
     * Update the specified driver.
     */
    public function update(Request $request, Driver $driver): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'sim' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'status' => ['required', 'string', Rule::in(['Active', 'Inactive'])],
            'daily_rate' => ['required', 'numeric', 'min:0'],
        ]);

        $driver->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Driver updated successfully.']);

        return to_route('drivers.index');
    }

    /**
     * Remove the specified driver.
     */
    public function destroy(Driver $driver): RedirectResponse
    {
        $driver->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Driver deleted successfully.']);

        return to_route('drivers.index');
    }
}
