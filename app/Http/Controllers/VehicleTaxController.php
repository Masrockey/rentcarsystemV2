<?php

namespace App\Http\Controllers;

use App\Models\Car;
use App\Models\VehicleTax;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VehicleTaxController extends Controller
{
    /**
     * Display a listing of vehicle tax records.
     */
    public function index(): Response
    {
        return Inertia::render('vehicle-taxes/index', [
            'vehicleTaxes' => VehicleTax::with('car')
                ->orderBy('valid_until')
                ->get(),
            'cars' => Car::orderBy('name')->get(['id', 'name', 'plate_number']),
        ]);
    }

    /**
     * Store a newly created vehicle tax record.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'car_id' => ['required', 'exists:cars,id'],
            'stnk_number' => ['nullable', 'string', 'max:100'],
            'valid_until' => ['required', 'date'],
            'annual_tax' => ['required', 'numeric', 'min:0'],
            'five_year_tax' => ['required', 'numeric', 'min:0'],
            'reminder_date' => ['nullable', 'date', 'before:valid_until'],
            'notes' => ['nullable', 'string'],
        ]);

        VehicleTax::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vehicle tax record added successfully.']);

        return to_route('vehicle-taxes.index');
    }

    /**
     * Update the specified vehicle tax record.
     */
    public function update(Request $request, VehicleTax $vehicleTax): RedirectResponse
    {
        $validated = $request->validate([
            'car_id' => ['required', 'exists:cars,id'],
            'stnk_number' => ['nullable', 'string', 'max:100'],
            'valid_until' => ['required', 'date'],
            'annual_tax' => ['required', 'numeric', 'min:0'],
            'five_year_tax' => ['required', 'numeric', 'min:0'],
            'reminder_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $vehicleTax->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vehicle tax record updated successfully.']);

        return to_route('vehicle-taxes.index');
    }

    /**
     * Remove the specified vehicle tax record.
     */
    public function destroy(VehicleTax $vehicleTax): RedirectResponse
    {
        $vehicleTax->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vehicle tax record deleted successfully.']);

        return to_route('vehicle-taxes.index');
    }
}
