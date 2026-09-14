<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\CarTypeResource;
use App\Models\CarType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CarTypeController extends BaseApiController
{
    private function checkAdmin(Request $request): void
    {
        abort_if(! $request->user()?->isAdmin(), 403, 'Akses ditolak. Hanya Admin Unit dan Super Administrator yang dapat mengakses menu ini.');
    }

    /**
     * Display a listing of car types.
     */
    public function index(Request $request): JsonResponse
    {
        $this->checkAdmin($request);

        $perPage = (int) $request->query('per_page', 10);
        $carTypes = CarType::orderBy('name')->paginate($perPage);

        return $this->sendResponse(
            CarTypeResource::collection($carTypes),
            'Daftar tipe mobil berhasil diambil.',
            200,
            [
                'current_page' => $carTypes->currentPage(),
                'last_page' => $carTypes->lastPage(),
                'per_page' => $carTypes->perPage(),
                'total' => $carTypes->total(),
            ]
        );
    }

    /**
     * Store a newly created car type.
     */
    public function store(Request $request): JsonResponse
    {
        $this->checkAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $carType = CarType::create($validated);

        return $this->sendResponse(new CarTypeResource($carType), 'Tipe mobil berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified car type.
     */
    public function show(Request $request, CarType $carType): JsonResponse
    {
        $this->checkAdmin($request);

        return $this->sendResponse(new CarTypeResource($carType), 'Detail tipe mobil berhasil diambil.');
    }

    /**
     * Update the specified car type.
     */
    public function update(Request $request, CarType $carType): JsonResponse
    {
        $this->checkAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $carType->update($validated);

        return $this->sendResponse(new CarTypeResource($carType->fresh()), 'Tipe mobil berhasil diperbarui.');
    }

    /**
     * Remove the specified car type.
     */
    public function destroy(Request $request, CarType $carType): JsonResponse
    {
        $this->checkAdmin($request);

        $carType->delete();

        return $this->sendResponse(null, 'Tipe mobil berhasil dihapus.');
    }
}
