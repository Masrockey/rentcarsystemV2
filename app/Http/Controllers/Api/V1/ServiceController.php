<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\ServiceResource;
use App\Models\Car;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends BaseApiController
{
    /**
     * Display a listing of service records.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Service::with('car')->orderBy('service_date', 'desc');

        if ($request->filled('car_id')) {
            $query->where('car_id', $request->query('car_id'));
        }

        $perPage = (int) $request->query('per_page', 10);
        $services = $query->paginate($perPage);

        return $this->sendResponse(
            ServiceResource::collection($services),
            'Daftar servis mobil berhasil diambil.',
            200,
            [
                'current_page' => $services->currentPage(),
                'last_page' => $services->lastPage(),
                'per_page' => $services->perPage(),
                'total' => $services->total(),
            ]
        );
    }

    /**
     * Store a newly created service record.
     */
    public function store(Request $request): JsonResponse
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

        $service = Service::create($validated);

        $car = Car::findOrFail($validated['car_id']);
        if ($validated['km'] > $car->last_km) {
            $car->update(['last_km' => $validated['km']]);
        }

        return $this->sendResponse(new ServiceResource($service->load('car')), 'Data servis berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified service record.
     */
    public function show(Service $service): JsonResponse
    {
        return $this->sendResponse(new ServiceResource($service->load('car')), 'Detail servis berhasil diambil.');
    }

    /**
     * Update the specified service record.
     */
    public function update(Request $request, Service $service): JsonResponse
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

        return $this->sendResponse(new ServiceResource($service->fresh()->load('car')), 'Data servis berhasil diperbarui.');
    }

    /**
     * Remove the specified service record.
     */
    public function destroy(Service $service): JsonResponse
    {
        $service->delete();

        return $this->sendResponse(null, 'Data servis berhasil dihapus.');
    }
}
