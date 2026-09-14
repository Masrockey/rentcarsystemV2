<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends BaseApiController
{
    private function authorizeSuperAdmin(): void
    {
        if (! auth()->user()?->isSuperAdmin()) {
            abort(403, 'Akses ditolak. Hanya Super Admin yang dapat mengelola data pengguna.');
        }
    }

    /**
     * Display a listing of users.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin();

        $search = $request->query('search');
        $query = User::orderBy('name');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 10);
        $users = $query->paginate($perPage);

        return $this->sendResponse(
            UserResource::collection($users),
            'Daftar pengguna berhasil diambil.',
            200,
            [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ]
        );
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request): JsonResponse
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

        $user = User::create($validated);

        return $this->sendResponse(new UserResource($user), 'Pengguna berhasil dibuat.', 201);
    }

    /**
     * Display the specified user.
     */
    public function show(User $user): JsonResponse
    {
        $this->authorizeSuperAdmin();

        return $this->sendResponse(new UserResource($user), 'Detail pengguna berhasil diambil.');
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizeSuperAdmin();

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:255', 'alpha_dash', Rule::unique('users')->ignore($user->id)],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'string', 'min:8'],
            'roles' => ['sometimes', 'required', 'array'],
            'roles.*' => ['string', Rule::in(['Super Admin', 'Admin', 'Marketing', 'Peluncur', 'Petugas Cuci'])],
        ]);

        if (isset($validated['email']) && empty($validated['username'])) {
            $validated['username'] = Str::before($validated['email'], '@');
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return $this->sendResponse(new UserResource($user->fresh()), 'Pengguna berhasil diperbarui.');
    }

    /**
     * Remove the specified user.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizeSuperAdmin();

        if ($request->user()->id === $user->id) {
            return $this->sendError('Anda tidak dapat menghapus akun Anda sendiri.', [], 422);
        }

        $user->delete();

        return $this->sendResponse(null, 'Pengguna berhasil dihapus.');
    }
}
