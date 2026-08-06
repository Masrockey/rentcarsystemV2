<?php

namespace App\Http\Controllers;

use App\Models\Car;
use App\Models\Insurance;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InsuranceController extends Controller
{
    /**
     * Display a listing of insurance records.
     */
    public function index(): Response
    {
        return Inertia::render('insurances/index', [
            'insurances' => Insurance::with('car')
                ->orderBy('end_date')
                ->get(),
            'cars' => Car::orderBy('name')->get(['id', 'name', 'plate_number']),
        ]);
    }

    /**
     * Store a newly created insurance record.
     */
    public function store(Request $request): RedirectResponse
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

        Insurance::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Insurance record added successfully.']);

        return to_route('insurances.index');
    }

    /**
     * Update the specified insurance record.
     */
    public function update(Request $request, Insurance $insurance): RedirectResponse
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

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Insurance record updated successfully.']);

        return to_route('insurances.index');
    }

    /**
     * Remove the specified insurance record.
     */
    public function destroy(Insurance $insurance): RedirectResponse
    {
        $insurance->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Insurance record deleted successfully.']);

        return to_route('insurances.index');
    }
}
