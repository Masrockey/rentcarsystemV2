<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends BaseApiController
{
    /**
     * Authenticate user and issue API bearer token.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'login' => ['nullable', 'string'],
            'email' => ['nullable', 'string'],
            'username' => ['nullable', 'string'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $loginIdentifier = $validated['login'] ?? $validated['email'] ?? $validated['username'] ?? null;

        if (empty($loginIdentifier)) {
            throw ValidationException::withMessages([
                'login' => ['Email atau username wajib diisi.'],
            ]);
        }

        $user = User::where('email', $loginIdentifier)
            ->orWhere('username', $loginIdentifier)
            ->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return $this->sendError('Kredensial yang diberikan tidak cocok dengan data kami.', [
                'login' => ['Kombinasi email/username dan kata sandi salah.'],
            ], 422);
        }

        $deviceName = $validated['device_name'] ?? 'api-client';
        $token = $user->createToken($deviceName)->plainTextToken;

        return $this->sendResponse([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ], 'Login berhasil.');
    }

    /**
     * Revoke current API token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->sendResponse(null, 'Logout berhasil.');
    }

    /**
     * Get authenticated user details.
     */
    public function me(Request $request): JsonResponse
    {
        return $this->sendResponse(new UserResource($request->user()), 'Data user berhasil diambil.');
    }
}

