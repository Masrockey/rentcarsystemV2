<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\DriverResource;
use App\Models\Driver;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DriverController extends BaseApiController
{
    /**
     * Display a listing of drivers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Driver::with('user')->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('sim', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('username', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
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
            'username' => ['nullable', 'string', 'max:255', 'unique:users,username'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        $username = $validated['username'] ?? null;
        if (empty($username)) {
            $baseUsername = Str::slug($validated['name'], '_');
            if (empty($baseUsername)) {
                $baseUsername = 'driver_'.time();
            }
            $username = $baseUsername;
            $counter = 1;
            while (User::where('username', $username)->exists()) {
                $username = $baseUsername.'_'.$counter;
                $counter++;
            }
        }

        $email = $validated['email'] ?? null;
        if (empty($email)) {
            $baseEmail = $username.'@driver.rentcars.com';
            $email = $baseEmail;
            $counter = 1;
            while (User::where('email', $email)->exists()) {
                $email = $username.'_'.$counter.'@driver.rentcars.com';
                $counter++;
            }
        }

        $password = ! empty($validated['password']) ? $validated['password'] : 'password';

        $user = User::create([
            'name' => $validated['name'],
            'username' => $username,
            'email' => $email,
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($password),
            'roles' => ['Driver'],
        ]);

        $driver = Driver::create([
            'user_id' => $user->id,
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'sim' => $validated['sim'] ?? null,
            'address' => $validated['address'] ?? null,
            'status' => $validated['status'],
            'daily_rate' => $validated['daily_rate'],
        ]);

        return $this->sendResponse(new DriverResource($driver->load('user')), 'Data supir berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified driver.
     */
    public function show(Driver $driver): JsonResponse
    {
        return $this->sendResponse(new DriverResource($driver->load('user')), 'Detail supir berhasil diambil.');
    }

    /**
     * Update the specified driver.
     */
    public function update(Request $request, Driver $driver): JsonResponse
    {
        $userId = $driver->user_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'sim' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'status' => ['required', 'string', Rule::in(['Active', 'Inactive'])],
            'daily_rate' => ['required', 'numeric', 'min:0'],
            'username' => ['nullable', 'string', 'max:255', Rule::unique('users', 'username')->ignore($userId)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        if ($driver->user) {
            $userUpdates = [
                'name' => $validated['name'],
                'phone' => $validated['phone'] ?? null,
            ];
            if (! empty($validated['username'])) {
                $userUpdates['username'] = $validated['username'];
            }
            if (! empty($validated['email'])) {
                $userUpdates['email'] = $validated['email'];
            }
            if (! empty($validated['password'])) {
                $userUpdates['password'] = Hash::make($validated['password']);
            }
            $driver->user->update($userUpdates);
        } elseif (! empty($validated['username']) || ! empty($validated['email']) || ! empty($validated['password'])) {
            $username = $validated['username'] ?? Str::slug($validated['name'], '_');
            $email = $validated['email'] ?? $username.'@driver.rentcars.com';
            $password = ! empty($validated['password']) ? $validated['password'] : 'password';

            $user = User::create([
                'name' => $validated['name'],
                'username' => $username,
                'email' => $email,
                'phone' => $validated['phone'] ?? null,
                'password' => Hash::make($password),
                'roles' => ['Driver'],
            ]);
            $driver->user_id = $user->id;
        }

        $driver->update([
            'user_id' => $driver->user_id,
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'sim' => $validated['sim'] ?? null,
            'address' => $validated['address'] ?? null,
            'status' => $validated['status'],
            'daily_rate' => $validated['daily_rate'],
        ]);

        return $this->sendResponse(new DriverResource($driver->fresh(['user'])), 'Data supir berhasil diperbarui.');
    }

    /**
     * Remove the specified driver.
     */
    public function destroy(Driver $driver): JsonResponse
    {
        $user = $driver->user;
        $driver->delete();

        if ($user) {
            $user->delete();
        }

        return $this->sendResponse(null, 'Data supir berhasil dihapus.');
    }
}
