<?php

use App\Models\User;

test('non super admin cannot access user management web page', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $this->actingAs($admin);

    $response = $this->get(route('users.index'));
    $response->assertForbidden();
});

test('super admin can access user management web page', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $this->actingAs($superAdmin);

    $response = $this->get(route('users.index'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('users/index')
        ->has('users')
    );
});

test('super admin can create a user with the Driver role via web', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $this->actingAs($superAdmin);

    $response = $this->post(route('users.store'), [
        'name' => 'Fajar Driver',
        'username' => 'fajar_driver_web',
        'email' => 'fajar_web@driver.rentcars.com',
        'phone' => '081949275321',
        'password' => 'password123',
        'roles' => ['Driver'],
    ]);

    $response->assertRedirect(route('users.index'));

    $user = User::where('email', 'fajar_web@driver.rentcars.com')->first();
    expect($user)->not->toBeNull();
    expect($user->roles)->toContain('Driver');
    expect($user->isDriver())->toBeTrue();
});

test('super admin can update a user and assign Driver role via web', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $this->actingAs($superAdmin);

    $targetUser = User::factory()->create([
        'name' => 'Staff Biasa',
        'email' => 'staff@example.com',
        'roles' => ['Peluncur'],
    ]);

    $response = $this->put(route('users.update', $targetUser), [
        'name' => 'Staff Biasa',
        'email' => 'staff@example.com',
        'phone' => '08123456789',
        'roles' => ['Peluncur', 'Driver'],
    ]);

    $response->assertRedirect(route('users.index'));

    $targetUser->refresh();
    expect($targetUser->roles)->toContain('Driver');
    expect($targetUser->roles)->toContain('Peluncur');
    expect($targetUser->isDriver())->toBeTrue();
});
