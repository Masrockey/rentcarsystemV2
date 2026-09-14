<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

test('user can login via API with email and receive bearer token', function () {
    $user = User::factory()->create([
        'email' => 'user@example.com',
        'password' => Hash::make('password123'),
        'roles' => ['Marketing'],
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'login' => 'user@example.com',
        'password' => 'password123',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'token',
                'token_type',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'roles',
                ],
            ],
        ]);
});

test('user can login via API with username', function () {
    $user = User::factory()->create([
        'username' => 'marketing01',
        'email' => 'marketing01@example.com',
        'password' => Hash::make('secret123'),
        'roles' => ['Marketing'],
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'username' => 'marketing01',
        'password' => 'secret123',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.user.username', 'marketing01');
});

test('login fails with invalid credentials', function () {
    $user = User::factory()->create([
        'email' => 'valid@example.com',
        'password' => Hash::make('correct_password'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'valid@example.com',
        'password' => 'wrong_password',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

test('unauthenticated request to protected API returns 401', function () {
    $response = $this->getJson('/api/v1/user');

    $response->assertUnauthorized();
});

test('authenticated user can fetch profile details', function () {
    $user = User::factory()->create([
        'name' => 'John Marketing',
        'roles' => ['Marketing'],
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/user');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'John Marketing');
});

test('authenticated user can update profile via API', function () {
    $user = User::factory()->create([
        'name' => 'Old Name',
        'email' => 'old@example.com',
    ]);

    Sanctum::actingAs($user);

    $response = $this->putJson('/api/v1/user/profile', [
        'name' => 'New Name',
        'email' => 'new@example.com',
        'phone' => '081234567890',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'New Name')
        ->assertJsonPath('data.email', 'new@example.com');

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'New Name',
        'email' => 'new@example.com',
    ]);
});

test('user can logout and revoke token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/v1/auth/logout');

    $response->assertOk()
        ->assertJsonPath('success', true);

    expect($user->tokens()->count())->toBe(0);
});
