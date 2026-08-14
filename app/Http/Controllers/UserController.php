<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    private function authorizeSuperAdmin(): void
    {
        if (! auth()->user()?->isSuperAdmin()) {
            abort(403, 'Unauthorized. Only Super Admin can access User Management.');
        }
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $this->authorizeSuperAdmin();

        return Inertia::render('users/index', [
            'users' => User::orderBy('name')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorizeSuperAdmin();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:255', 'alpha_dash', 'unique:users'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['required', 'string', 'min:8'],
            'roles' => ['required', 'array'],
            'roles.*' => ['string', Rule::in(['Super Admin', 'Admin', 'Marketing', 'Peluncur', 'Petugas Cuci'])],
        ]);

        if (empty($validated['username'])) {
            $validated['username'] = Str::before($validated['email'], '@');
        }

        $validated['password'] = Hash::make($validated['password']);

        User::create($validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'User created successfully.',
        ]);

        return to_route('users.index');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $this->authorizeSuperAdmin();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:255', 'alpha_dash', Rule::unique('users')->ignore($user->id)],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'string', 'min:8'],
            'roles' => ['required', 'array'],
            'roles.*' => ['string', Rule::in(['Super Admin', 'Admin', 'Marketing', 'Peluncur', 'Petugas Cuci'])],
        ]);

        if (empty($validated['username'])) {
            $validated['username'] = Str::before($validated['email'], '@');
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'User updated successfully.',
        ]);

        return to_route('users.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user): RedirectResponse
    {
        $this->authorizeSuperAdmin();

        if (auth()->id() === $user->id) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'You cannot delete your own account.',
            ]);

            return to_route('users.index');
        }

        $user->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'User deleted successfully.',
        ]);

        return to_route('users.index');
    }
}
