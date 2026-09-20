<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\CarResource;
use App\Models\Car;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CarController extends BaseApiController
{
    private function checkAccess(Request $request): void
    {
        if (($request->user()->hasRole('Marketing') || $request->user()->hasRole('Driver')) && ! $request->user()->isAdmin()) {
            abort(403, 'Akses ditolak. Role tidak memiliki akses ke Data Armada.');
        }
    }

    /**
     * Display a listing of cars.
     */
    public function index(Request $request): JsonResponse
    {
        $this->checkAccess($request);

        $selectedStatus = $request->query('status', 'all');
        $search = $request->query('search', '');

        $query = Car::orderBy('brand')->orderBy('name');
        if ($selectedStatus && strtolower($selectedStatus) !== 'all') {
            $formattedStatus = match (strtolower(str_replace('_', ' ', $selectedStatus))) {
                'ready' => 'Ready',
                'not ready' => 'Not Ready',
                'belum dicuci' => 'Belum Dicuci',
                'service' => 'Service',
                default => $selectedStatus,
            };
            $query->where('status', $formattedStatus);
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

        $perPage = (int) $request->query('per_page', 10);
        $cars = $query->paginate($perPage);

        return $this->sendResponse(
            CarResource::collection($cars),
            'Daftar armada mobil berhasil diambil.',
            200,
            [
                'current_page' => $cars->currentPage(),
                'last_page' => $cars->lastPage(),
                'per_page' => $cars->perPage(),
                'total' => $cars->total(),
                'selected_status' => $selectedStatus,
                'status_counts' => $statusCounts,
            ]
        );
    }

    /**
     * Store a newly created car.
     */
    public function store(Request $request): JsonResponse
    {
        $this->checkAccess($request);

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

        $car = Car::create($validated);

        return $this->sendResponse(new CarResource($car), 'Data armada mobil berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified car.
     */
    public function show(Request $request, Car $car): JsonResponse
    {
        $this->checkAccess($request);

        return $this->sendResponse(new CarResource($car->load(['services', 'insurances', 'vehicleTaxes'])), 'Detail mobil berhasil diambil.');
    }

    /**
     * Update the specified car.
     */
    public function update(Request $request, Car $car): JsonResponse
    {
        $this->checkAccess($request);

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

        return $this->sendResponse(new CarResource($car->fresh()), 'Data armada mobil berhasil diperbarui.');
    }

    /**
     * Remove the specified car.
     */
    public function destroy(Request $request, Car $car): JsonResponse
    {
        $this->checkAccess($request);

        $car->delete();

        return $this->sendResponse(null, 'Data armada mobil berhasil dihapus.');
    }
}
