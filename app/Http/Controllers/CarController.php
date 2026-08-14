<?php

namespace App\Http\Controllers;

use App\Models\Car;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CarController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $allCars = Car::orderBy('brand')->orderBy('name')->get();

        $selectedStatus = $request->query('status', 'all');

        $filteredCars = $allCars;
        if ($selectedStatus && $selectedStatus !== 'all') {
            $filteredCars = $allCars->where('status', $selectedStatus)->values();
        }

        $statusCounts = [
            'all' => $allCars->count(),
            'ready' => $allCars->where('status', 'Ready')->count(),
            'not_ready' => $allCars->where('status', 'Not Ready')->count(),
            'belum_dicuci' => $allCars->where('status', 'Belum Dicuci')->count(),
            'service' => $allCars->where('status', 'Service')->count(),
        ];

        return Inertia::render('cars/index', [
            'cars' => $filteredCars,
            'allCars' => $allCars,
            'selectedStatus' => $selectedStatus,
            'statusCounts' => $statusCounts,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', 'string', 'max:100'],
            'year' => ['required', 'integer', 'min:1900', 'max:'.(date('Y') + 1)],
            'plate_number' => ['required', 'string', 'max:50', 'unique:cars'],
            'color' => ['nullable', 'string', 'max:50'],
            'transmission' => ['nullable', 'string', Rule::in(['Manual', 'Automatic'])],
            'fuel_type' => ['nullable', 'string', Rule::in(['Bensin', 'Diesel', 'Hybrid', 'Listrik'])],
            'passenger_capacity' => ['nullable', 'integer', 'min:1', 'max:50'],
            'chassis_number' => ['nullable', 'string', 'max:100'],
            'engine_number' => ['nullable', 'string', 'max:100'],
            'last_km' => ['nullable', 'integer', 'min:0'],
            'daily_price' => ['nullable', 'numeric', 'min:0'],
            'weekly_price' => ['nullable', 'numeric', 'min:0'],
            'monthly_price' => ['nullable', 'numeric', 'min:0'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'owner_partner' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'string', Rule::in(['Ready', 'Not Ready', 'Belum Dicuci', 'Service'])],
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('cars', 'public');
        }

        Car::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Car added successfully.']);

        return to_route('cars.index');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Car $car): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', 'string', 'max:100'],
            'year' => ['required', 'integer', 'min:1900', 'max:'.(date('Y') + 1)],
            'plate_number' => ['required', 'string', 'max:50', Rule::unique('cars')->ignore($car->id)],
            'color' => ['nullable', 'string', 'max:50'],
            'transmission' => ['nullable', 'string', Rule::in(['Manual', 'Automatic'])],
            'fuel_type' => ['nullable', 'string', Rule::in(['Bensin', 'Diesel', 'Hybrid', 'Listrik'])],
            'passenger_capacity' => ['nullable', 'integer', 'min:1', 'max:50'],
            'chassis_number' => ['nullable', 'string', 'max:100'],
            'engine_number' => ['nullable', 'string', 'max:100'],
            'last_km' => ['nullable', 'integer', 'min:0'],
            'daily_price' => ['nullable', 'numeric', 'min:0'],
            'weekly_price' => ['nullable', 'numeric', 'min:0'],
            'monthly_price' => ['nullable', 'numeric', 'min:0'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'owner_partner' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'string', Rule::in(['Ready', 'Not Ready', 'Belum Dicuci', 'Service'])],
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('cars', 'public');
        } else {
            unset($validated['photo']);
        }

        $car->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Car updated successfully.']);

        return to_route('cars.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Car $car): RedirectResponse
    {
        $car->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Car deleted successfully.']);

        return to_route('cars.index');
    }
}
