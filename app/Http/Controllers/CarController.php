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
        if (($request->user()->hasRole('Marketing') || $request->user()->hasRole('Driver')) && ! $request->user()->isAdmin()) {
            abort(403, 'Akses ditolak. Role tidak memiliki akses ke Data Armada.');
        }

        $selectedStatus = $request->query('status', 'all');
        $search = $request->query('search', '');

        $query = Car::orderBy('brand')->orderBy('name');
        if ($selectedStatus && $selectedStatus !== 'all') {
            $query->where('status', $selectedStatus);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('plate_number', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhere('model', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%")
                    ->orWhere('color', 'like', "%{$search}%")
                    ->orWhere('owner_partner', 'like', "%{$search}%");
            });
        }

        $statusCounts = [
            'all' => Car::count(),
            'ready' => Car::where('status', 'Ready')->count(),
            'not_ready' => Car::where('status', 'Not Ready')->count(),
            'belum_dicuci' => Car::where('status', 'Belum Dicuci')->count(),
            'service' => Car::where('status', 'Service')->count(),
        ];

        return Inertia::render('cars/index', [
            'cars' => $query->paginate(10)->withQueryString(),
            'selectedStatus' => $selectedStatus,
            'statusCounts' => $statusCounts,
            'search' => $search,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        if ($request->has('plate_number')) {
            $request->merge([
                'plate_number' => strtoupper(trim(preg_replace('/\s+/', ' ', (string) $request->plate_number))),
            ]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', 'string', 'max:100'],
            'year' => ['required', 'integer', 'min:1900', 'max:'.(date('Y') + 1)],
            'plate_number' => ['required', 'string', 'max:50', 'unique:cars,plate_number'],
            'color' => ['nullable', 'string', 'max:50'],
            'transmission' => ['nullable', 'string', Rule::in(['Manual', 'Automatic'])],
            'fuel_type' => ['nullable', 'string', Rule::in(['Bensin', 'Diesel', 'Hybrid', 'Listrik'])],
            'passenger_capacity' => ['nullable', 'integer', 'min:1', 'max:50'],
            'chassis_number' => ['nullable', 'string', 'max:100'],
            'engine_number' => ['nullable', 'string', 'max:100'],
            'initial_km' => ['nullable', 'integer', 'min:0'],
            'last_km' => ['nullable', 'integer', 'min:0'],
            'daily_price' => ['nullable', 'numeric', 'min:0'],
            'weekly_price' => ['nullable', 'numeric', 'min:0'],
            'monthly_price' => ['nullable', 'numeric', 'min:0'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'owner_partner' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'string', Rule::in(['Ready', 'Not Ready', 'Belum Dicuci', 'Service'])],
        ], [
            'plate_number.unique' => 'Nomor plat kendaraan sudah terdaftar.',
            'plate_number.required' => 'Nomor plat kendaraan wajib diisi.',
        ]);

        if (isset($validated['initial_km']) && ! isset($validated['last_km'])) {
            $validated['last_km'] = $validated['initial_km'];
        } elseif (isset($validated['last_km']) && ! isset($validated['initial_km'])) {
            $validated['initial_km'] = $validated['last_km'];
        }

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
        if ($request->has('plate_number')) {
            $request->merge([
                'plate_number' => strtoupper(trim(preg_replace('/\s+/', ' ', (string) $request->plate_number))),
            ]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', 'string', 'max:100'],
            'year' => ['required', 'integer', 'min:1900', 'max:'.(date('Y') + 1)],
            'plate_number' => ['required', 'string', 'max:50', Rule::unique('cars', 'plate_number')->ignore($car->id)],
            'color' => ['nullable', 'string', 'max:50'],
            'transmission' => ['nullable', 'string', Rule::in(['Manual', 'Automatic'])],
            'fuel_type' => ['nullable', 'string', Rule::in(['Bensin', 'Diesel', 'Hybrid', 'Listrik'])],
            'passenger_capacity' => ['nullable', 'integer', 'min:1', 'max:50'],
            'chassis_number' => ['nullable', 'string', 'max:100'],
            'engine_number' => ['nullable', 'string', 'max:100'],
            'initial_km' => ['nullable', 'integer', 'min:0'],
            'last_km' => ['nullable', 'integer', 'min:0'],
            'daily_price' => ['nullable', 'numeric', 'min:0'],
            'weekly_price' => ['nullable', 'numeric', 'min:0'],
            'monthly_price' => ['nullable', 'numeric', 'min:0'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'owner_partner' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', Rule::in(['Ready', 'Not Ready', 'Belum Dicuci', 'Service'])],
        ], [
            'plate_number.unique' => 'Nomor plat kendaraan sudah terdaftar.',
            'plate_number.required' => 'Nomor plat kendaraan wajib diisi.',
        ]);

        if (! $request->user()->isSuperAdmin()) {
            unset($validated['status']);
        }

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
