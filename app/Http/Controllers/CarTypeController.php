<?php

namespace App\Http\Controllers;

use App\Models\CarType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CarTypeController extends Controller
{
    /**
     * Display a listing of car types.
     */
    public function index(Request $request): Response
    {
        abort_if(! $request->user()?->isAdmin(), 403, 'Akses ditolak. Hanya Admin Unit dan Super Administrator yang dapat mengakses menu ini.');

        return Inertia::render('car-types/index', [
            'carTypes' => CarType::orderBy('name')->get(),
        ]);
    }

    /**
     * Store a newly created car type in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_if(! $request->user()?->isAdmin(), 403, 'Akses ditolak. Hanya Admin Unit dan Super Administrator yang dapat menambah tipe mobil.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        CarType::create($validated);

        return to_route('car-types.index');
    }

    /**
     * Update the specified car type in storage.
     */
    public function update(Request $request, CarType $carType): RedirectResponse
    {
        abort_if(! $request->user()?->isAdmin(), 403, 'Akses ditolak. Hanya Admin Unit dan Super Administrator yang dapat mengubah tipe mobil.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $carType->update($validated);

        return to_route('car-types.index');
    }

    /**
     * Remove the specified car type from storage.
     */
    public function destroy(Request $request, CarType $carType): RedirectResponse
    {
        abort_if(! $request->user()?->isAdmin(), 403, 'Akses ditolak. Hanya Admin Unit dan Super Administrator yang dapat menghapus tipe mobil.');

        $carType->delete();

        return to_route('car-types.index');
    }
}
