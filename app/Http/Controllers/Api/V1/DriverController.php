<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\DriverResource;
use App\Models\Driver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DriverController extends BaseApiController
{
    /**
     * Display a listing of drivers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Driver::orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('sim', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 10);
        $drivers = $query->paginate($perPage);

        return $this->sendResponse(
            DriverResource::collection($drivers),
            'Daftar supir berhasil diambil.',
            200,
            [
                'current_page' => $drivers->currentPage(),
                'last_page' => $drivers->lastPage(),
                'per_page' => $drivers->perPage(),
                'total' => $drivers->total(),
            ]
        );
    }

    /**
     * Store a newly created driver.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'sim' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'status' => ['required', 'string', Rule::in(['Active', 'Inactive'])],
            'daily_rate' => ['required', 'numeric', 'min:0'],
        ]);

        $driver = Driver::create($validated);

        return $this->sendResponse(new DriverResource($driver), 'Data supir berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified driver.
     */
    public function show(Driver $driver): JsonResponse
    {
        return $this->sendResponse(new DriverResource($driver), 'Detail supir berhasil diambil.');
    }

    /**
     * Update the specified driver.
     */
    public function update(Request $request, Driver $driver): JsonResponse
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

        return $this->sendResponse(new DriverResource($driver->fresh()), 'Data supir berhasil diperbarui.');
    }

    /**
     * Remove the specified driver.
     */
    public function destroy(Driver $driver): JsonResponse
    {
        $driver->delete();

        return $this->sendResponse(null, 'Data supir berhasil dihapus.');
    }
}

