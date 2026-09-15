<?php

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\User;

test('driver can be created with linked user account', function () {
    $admin = User::factory()->create([
        'roles' => ['Super Admin'],
    ]);

    $response = $this->actingAs($admin)->post(route('drivers.store'), [
        'name' => 'Budi Driver',
        'phone' => '081299887766',
        'sim' => 'SIM-12345678',
        'address' => 'Jl. Merdeka No. 1',
        'status' => 'Active',
        'daily_rate' => 150000,
        'username' => 'budidriver',
        'email' => 'budi.driver@example.com',
        'password' => 'secret123',
    ]);

    $response->assertRedirect(route('drivers.index'));

    $driver = Driver::where('sim', 'SIM-12345678')->first();
    expect($driver)->not->toBeNull();
    expect($driver->user_id)->not->toBeNull();

    $user = $driver->user;
    expect($user->username)->toBe('budidriver');
    expect($user->email)->toBe('budi.driver@example.com');
    expect($user->phone)->toBe('081299887766');
    expect($user->roles)->toContain('Driver');
});

test('driver can authenticate on web via username', function () {
    $user = User::factory()->create([
        'username' => 'driveranto',
        'email' => 'anto@example.com',
        'phone' => '081300000001',
        'password' => bcrypt('password123'),
        'roles' => ['Driver'],
    ]);

    Driver::create([
        'user_id' => $user->id,
        'name' => 'Anto Supir',
        'phone' => '081300000001',
        'sim' => 'SIM-111111',
        'status' => 'Active',
        'daily_rate' => 150000,
    ]);

    $response = $this->post(route('login.store'), [
        'email' => 'driveranto',
        'password' => 'password123',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('driver can authenticate on web via phone number', function () {
    $user = User::factory()->create([
        'username' => 'driverbambang',
        'email' => 'bambang@example.com',
        'phone' => '081300000002',
        'password' => bcrypt('password123'),
        'roles' => ['Driver'],
    ]);

    Driver::create([
        'user_id' => $user->id,
        'name' => 'Bambang Supir',
        'phone' => '081300000002',
        'sim' => 'SIM-222222',
        'status' => 'Active',
        'daily_rate' => 150000,
    ]);

    $response = $this->post(route('login.store'), [
        'email' => '081300000002',
        'password' => 'password123',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('driver can authenticate on api via username, email, and phone', function () {
    $user = User::factory()->create([
        'username' => 'drivercahyo',
        'email' => 'cahyo@example.com',
        'phone' => '081300000003',
        'password' => bcrypt('password123'),
        'roles' => ['Driver'],
    ]);

    Driver::create([
        'user_id' => $user->id,
        'name' => 'Cahyo Supir',
        'phone' => '081300000003',
        'sim' => 'SIM-333333',
        'status' => 'Active',
        'daily_rate' => 150000,
    ]);

    // 1. Via Email
    $respEmail = $this->postJson('/api/v1/auth/login', [
        'email' => 'cahyo@example.com',
        'password' => 'password123',
    ]);
    $respEmail->assertOk()->assertJsonPath('success', true);

    // 2. Via Username
    $respUsername = $this->postJson('/api/v1/auth/login', [
        'username' => 'drivercahyo',
        'password' => 'password123',
    ]);
    $respUsername->assertOk()->assertJsonPath('success', true);

    // 3. Via Phone
    $respPhone = $this->postJson('/api/v1/auth/login', [
        'phone' => '081300000003',
        'password' => 'password123',
    ]);
    $respPhone->assertOk()->assertJsonPath('success', true);
});

test('driver only sees their assigned bookings in web listing', function () {
    $driverUser = User::factory()->create([
        'username' => 'driverdudi',
        'email' => 'dudi@example.com',
        'roles' => ['Driver'],
    ]);

    $driver1 = Driver::create([
        'user_id' => $driverUser->id,
        'name' => 'Dudi Supir',
        'phone' => '081300000004',
        'sim' => 'SIM-444444',
        'status' => 'Active',
        'daily_rate' => 150000,
    ]);

    $driver2 = Driver::create([
        'name' => 'Other Supir',
        'phone' => '081300000005',
        'sim' => 'SIM-555555',
        'status' => 'Active',
        'daily_rate' => 150000,
    ]);

    $customer = Customer::create([
        'name' => 'John Customer',
        'phone' => '0812345678',
        'email' => 'john@client.com',
        'address' => 'Customer Address',
    ]);

    $myBooking = Booking::create([
        'customer_id' => $customer->id,
        'driver_id' => $driver1->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Dengan Driver',
        'booking_date' => '2026-07-12',
        'return_date' => '2026-07-15',
        'pickup_time' => '08:00',
        'return_time' => '08:00',
        'pickup_location' => 'Garasi',
        'dropoff_location' => 'Garasi',
        'payment_method' => 'DP',
        'payment_status' => 'Down Payment',
        'amount' => 1500000,
        'status' => 'Confirmed',
    ]);

    $otherBooking = Booking::create([
        'customer_id' => $customer->id,
        'driver_id' => $driver2->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Dengan Driver',
        'booking_date' => '2026-07-12',
        'return_date' => '2026-07-15',
        'pickup_time' => '08:00',
        'return_time' => '08:00',
        'pickup_location' => 'Garasi',
        'dropoff_location' => 'Garasi',
        'payment_method' => 'DP',
        'payment_status' => 'Down Payment',
        'amount' => 1500000,
        'status' => 'Confirmed',
    ]);

    $response = $this->actingAs($driverUser)->get(route('bookings.index'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('bookings/index')
        ->has('bookings.data', 1)
        ->where('bookings.data.0.id', $myBooking->id)
    );
});
