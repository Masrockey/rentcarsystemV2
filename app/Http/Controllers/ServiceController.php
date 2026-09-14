<?php

namespace App\Http\Controllers;

use App\Models\Car;
use App\Models\Service;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    /**
     * Display a listing of service records.
     */
    public function index(): Response
    {
        return Inertia::render('services/index', [
            'services' => Service::with('car')
                ->orderBy('service_date', 'desc')
                ->paginate(10)
                ->withQueryString(),
            'cars' => Car::where('status', 'Service')->orderBy('name')->get(['id', 'name', 'plate_number', 'status', 'initial_km', 'last_km']),
            'allCars' => Car::orderBy('name')->get(['id', 'name', 'plate_number', 'status', 'initial_km', 'last_km']),
        ]);
    }

    /**
     * Store a newly created service record.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'car_id' => ['required', 'exists:cars,id'],
            'service_date' => ['required', 'date'],
            'workshop' => ['nullable', 'string', 'max:255'],
            'service_type' => ['required', 'string', 'max:255'],
            'km' => ['required', 'integer', 'min:0'],
            'cost' => ['required', 'numeric', 'min:0'],
            'next_service_date' => ['nullable', 'date', 'after:service_date'],
            'notes' => ['nullable', 'string'],
        ]);

        Service::create($validated);

        // Update car's initial_km to service km, last_km, and reset status to Ready
        $car = Car::findOrFail($validated['car_id']);
        $newKm = max($car->last_km ?? 0, $validated['km']);
        $car->update([
            'initial_km' => $validated['km'],
            'last_km' => $newKm,
            'status' => 'Ready',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Record service berhasil ditambahkan dan status mobil kembali Ready.']);

        return to_route('services.index');
    }

    /**
     * Update the specified service record.
     */
    public function update(Request $request, Service $service): RedirectResponse
    {
        $validated = $request->validate([
            'car_id' => ['required', 'exists:cars,id'],
            'service_date' => ['required', 'date'],
            'workshop' => ['nullable', 'string', 'max:255'],
            'service_type' => ['required', 'string', 'max:255'],
            'km' => ['required', 'integer', 'min:0'],
            'cost' => ['required', 'numeric', 'min:0'],
            'next_service_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $service->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Service record updated successfully.']);

        return to_route('services.index');
    }

    /**
     * Remove the specified service record.
     */
    public function destroy(Service $service): RedirectResponse
    {
        $service->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Service record deleted successfully.']);

        return to_route('services.index');
    }
}
