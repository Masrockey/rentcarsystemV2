<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\VehicleTaxResource;
use App\Models\VehicleTax;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleTaxController extends BaseApiController
{
    /**
     * Display a listing of vehicle tax records.
     */
    public function index(Request $request): JsonResponse
    {
        $today = now()->toDateString();
        $thirtyDaysFromNow = now()->addDays(30)->toDateString();
        $expiringSoonCount = VehicleTax::whereBetween('valid_until', [$today, $thirtyDaysFromNow])->count();

        $query = VehicleTax::with('car')->orderBy('valid_until');

        if ($request->filled('car_id')) {
            $query->where('car_id', $request->query('car_id'));
        }

        $perPage = (int) $request->query('per_page', 10);
        $taxes = $query->paginate($perPage);

        return $this->sendResponse(
            VehicleTaxResource::collection($taxes),
            'Daftar pajak STNK berhasil diambil.',
            200,
            [
                'current_page' => $taxes->currentPage(),
                'last_page' => $taxes->lastPage(),
                'per_page' => $taxes->perPage(),
                'total' => $taxes->total(),
                'expiring_soon_count' => $expiringSoonCount,
            ]
        );
    }

    /**
     * Store a newly created vehicle tax record.
     */
    public function store(Request $request): JsonResponse
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

        $tax = VehicleTax::create($validated);

        return $this->sendResponse(new VehicleTaxResource($tax->load('car')), 'Data pajak STNK berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified vehicle tax record.
     */
    public function show(VehicleTax $vehicleTax): JsonResponse
    {
        return $this->sendResponse(new VehicleTaxResource($vehicleTax->load('car')), 'Detail pajak STNK berhasil diambil.');
    }

    /**
     * Update the specified vehicle tax record.
     */
    public function update(Request $request, VehicleTax $vehicleTax): JsonResponse
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

        return $this->sendResponse(new VehicleTaxResource($vehicleTax->fresh()->load('car')), 'Data pajak STNK berhasil diperbarui.');
    }

    /**
     * Remove the specified vehicle tax record.
     */
    public function destroy(VehicleTax $vehicleTax): JsonResponse
    {
        $vehicleTax->delete();

        return $this->sendResponse(null, 'Data pajak STNK berhasil dihapus.');
    }
}
