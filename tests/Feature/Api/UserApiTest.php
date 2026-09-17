<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('non super admin cannot access user management API', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/users');

    $response->assertForbidden();
});

test('super admin can view, create, update, and delete users via API', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    Sanctum::actingAs($superAdmin);

    // List users
    $listRes = $this->getJson('/api/v1/users');
    $listRes->assertOk()
        ->assertJsonPath('success', true);

    // Create user
    $createRes = $this->postJson('/api/v1/users', [
        'name' => 'New Staff',
        'username' => 'newstaff',
        'email' => 'newstaff@example.com',
        'phone' => '0811223344',
        'password' => 'password123',
        'roles' => ['Peluncur'],
    ]);

    $createRes->assertStatus(201)
        ->assertJsonPath('data.username', 'newstaff')
        ->assertJsonPath('data.roles.0', 'Peluncur');

    $userId = $createRes->json('data.id');

    // Update user
    $updateRes = $this->putJson("/api/v1/users/{$userId}", [
        'name' => 'New Staff Updated',
        'roles' => ['Peluncur', 'Petugas Cuci'],
    ]);

    $updateRes->assertOk()
        ->assertJsonPath('data.name', 'New Staff Updated')
        ->assertJsonCount(2, 'data.roles');

    // Super admin cannot delete own account
    $selfDelRes = $this->deleteJson("/api/v1/users/{$superAdmin->id}");
    $selfDelRes->assertStatus(422);

    // Delete user
    $delRes = $this->deleteJson("/api/v1/users/{$userId}");
    $delRes->assertOk();

    expect(User::find($userId))->toBeNull();
});

test('super admin can assign Driver role to a user via API', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    Sanctum::actingAs($superAdmin);

    $createRes = $this->postJson('/api/v1/users', [
        'name' => 'Fajar Supir',
        'username' => 'fajar_driver',
        'email' => 'fajar@driver.rentcars.com',
        'phone' => '081949275321',
        'password' => 'password123',
        'roles' => ['Driver'],
    ]);

    $createRes->assertStatus(201)
        ->assertJsonPath('data.roles.0', 'Driver');

    $user = User::where('username', 'fajar_driver')->first();
    expect($user)->not->toBeNull();
    expect($user->isDriver())->toBeTrue();
});
