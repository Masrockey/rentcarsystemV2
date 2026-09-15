<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DriverController extends Controller
{
    /**
     * Display a listing of drivers.
     */
    public function index(): Response
    {
        return Inertia::render('drivers/index', [
            'drivers' => Driver::with('user:id,name,username,email,phone')->orderBy('name')->paginate(10)->withQueryString(),
        ]);
    }

    /**
     * Store a newly created driver.
     */
    public function store(Request $request): RedirectResponse
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

        // Generate username if not provided
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

        // Generate email if not provided
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

        // Create user login account for driver
        $user = User::create([
            'name' => $validated['name'],
            'username' => $username,
            'email' => $email,
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($password),
            'roles' => ['Driver'],
        ]);

        $driverData = [
            'user_id' => $user->id,
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'sim' => $validated['sim'] ?? null,
            'address' => $validated['address'] ?? null,
            'status' => $validated['status'],
            'daily_rate' => $validated['daily_rate'],
        ];

        Driver::create($driverData);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Driver & akun login berhasil ditambahkan.']);

        return to_route('drivers.index');
    }

    /**
     * Update the specified driver.
     */
    public function update(Request $request, Driver $driver): RedirectResponse
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

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Data driver berhasil diperbarui.']);

        return to_route('drivers.index');
    }

    /**
     * Remove the specified driver.
     */
    public function destroy(Driver $driver): RedirectResponse
    {
        $user = $driver->user;
        $driver->delete();

        if ($user) {
            $user->delete();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Data driver & akun login berhasil dihapus.']);

        return to_route('drivers.index');
    }
}
