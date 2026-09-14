<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\InsuranceResource;
use App\Models\Insurance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InsuranceController extends BaseApiController
{
    /**
     * Display a listing of insurance records.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Insurance::with('car')->orderBy('end_date');

        if ($request->filled('car_id')) {
            $query->where('car_id', $request->query('car_id'));
        }

        $perPage = (int) $request->query('per_page', 10);
        $insurances = $query->paginate($perPage);

        return $this->sendResponse(
            InsuranceResource::collection($insurances),
            'Daftar asuransi mobil berhasil diambil.',
            200,
            [
                'current_page' => $insurances->currentPage(),
                'last_page' => $insurances->lastPage(),
                'per_page' => $insurances->perPage(),
                'total' => $insurances->total(),
            ]
        );
    }

    /**
     * Store a newly created insurance record.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'car_id' => ['required', 'exists:cars,id'],
            'insurance_name' => ['required', 'string', 'max:255'],
            'policy_number' => ['required', 'string', 'max:100', 'unique:insurances'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'premium' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $insurance = Insurance::create($validated);

        return $this->sendResponse(new InsuranceResource($insurance->load('car')), 'Data asuransi berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified insurance record.
     */
    public function show(Insurance $insurance): JsonResponse
    {
        return $this->sendResponse(new InsuranceResource($insurance->load('car')), 'Detail asuransi berhasil diambil.');
    }

    /**
     * Update the specified insurance record.
     */
    public function update(Request $request, Insurance $insurance): JsonResponse
    {
        $validated = $request->validate([
            'car_id' => ['required', 'exists:cars,id'],
            'insurance_name' => ['required', 'string', 'max:255'],
            'policy_number' => ['required', 'string', 'max:100', Rule::unique('insurances')->ignore($insurance->id)],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'premium' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $insurance->update($validated);

        return $this->sendResponse(new InsuranceResource($insurance->fresh()->load('car')), 'Data asuransi berhasil diperbarui.');
    }

    /**
     * Remove the specified insurance record.
     */
    public function destroy(Insurance $insurance): JsonResponse
    {
        $insurance->delete();

        return $this->sendResponse(null, 'Data asuransi berhasil dihapus.');
    }
}
