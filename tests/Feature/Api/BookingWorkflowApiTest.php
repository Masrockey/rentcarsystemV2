<?php

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\Rental;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('marketing user can create booking with inline new customer via API', function () {
    $marketing = User::factory()->create(['roles' => ['Marketing']]);
    Sanctum::actingAs($marketing);

    $response = $this->postJson('/api/v1/bookings', [
        'new_customer_name' => 'Budi Santoso',
        'new_customer_phone' => '081234567890',
        'new_customer_nik' => '3171010101900001',
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->toDateString(),
        'return_date' => now()->addDays(3)->toDateString(),
        'pickup_time' => '09:00',
        'return_time' => '09:00',
        'pickup_location' => 'Bandara Soekarno Hatta',
        'dropoff_location' => 'Hotel Indonesia',
        'payment_method' => 'Transfer',
        'amount' => 1500000,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.customer.name', 'Budi Santoso')
        ->assertJsonPath('data.status', 'Pending');

    $this->assertDatabaseHas('customers', [
        'name' => 'Budi Santoso',
        'user_id' => $marketing->id,
    ]);

    $this->assertDatabaseHas('bookings', [
        'car_type' => 'Avanza',
        'user_id' => $marketing->id,
        'status' => 'Pending',
    ]);
});

test('allocating car updates booking status to Confirmed via API', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $marketing = User::factory()->create(['roles' => ['Marketing']]);
    $customer = Customer::create([
        'user_id' => $marketing->id,
        'name' => 'Customer A',
        'phone' => '0812345678',
    ]);
    $car = Car::create([
        'name' => 'Avanza G',
        'year' => 2022,
        'plate_number' => 'B 1111 AAA',
        'status' => 'Ready',
    ]);
    $booking = Booking::create([
        'user_id' => $marketing->id,
        'customer_id' => $customer->id,
        'booking_number' => 'BK-1001',
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->toDateString(),
        'payment_method' => 'Transfer',
        'status' => 'Pending',
    ]);

    Sanctum::actingAs($admin);

    $response = $this->putJson("/api/v1/allocations/{$booking->id}", [
        'car_id' => $car->id,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'Confirmed')
        ->assertJsonPath('data.car_id', $car->id);

    expect($booking->fresh()->status)->toBe('Confirmed');
});

test('submitting delivery checklist sets Booking to On Trip and Car to Not Ready', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create([
        'name' => 'Test Tenant',
        'phone' => '0812345678',
    ]);
    $car = Car::create([
        'name' => 'Xpander',
        'year' => 2023,
        'plate_number' => 'B 2222 BBB',
        'status' => 'Ready',
        'last_km' => 10000,
    ]);
    $booking = Booking::create([
        'user_id' => $admin->id,
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'booking_number' => 'BK-1002',
        'car_type' => 'Xpander',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->toDateString(),
        'payment_method' => 'Cash',
        'status' => 'Confirmed',
    ]);

    Sanctum::actingAs($admin);

    $response = $this->postJson("/api/v1/bookings/{$booking->id}/delivery", [
        'checklist' => ['body' => 'clean', 'interior' => 'clean'],
        'km_out' => 10050,
        'fuel_out' => 100,
        'notes' => 'Unit diserahkan dalam kondisi baik',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'On Trip');

    expect($booking->fresh()->status)->toBe('On Trip');
    expect($car->fresh()->status)->toBe('Not Ready');
    expect($car->fresh()->last_km)->toBe(10050);

    // Rental contract should be created automatically
    $rental = Rental::where('booking_id', $booking->id)->first();
    expect($rental)->not->toBeNull();
    expect($rental->km_out)->toBe(10050);
});

test('submitting return checklist sets Booking to Returned and Car to Ready', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create([
        'name' => 'Test Tenant',
        'phone' => '0812345678',
    ]);
    $car = Car::create([
        'name' => 'Xpander',
        'year' => 2023,
        'plate_number' => 'B 3333 CCC',
        'status' => 'Not Ready',
        'last_km' => 10050,
    ]);
    $booking = Booking::create([
        'user_id' => $admin->id,
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'booking_number' => 'BK-1003',
        'car_type' => 'Xpander',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->toDateString(),
        'payment_method' => 'Cash',
        'status' => 'On Trip',
    ]);
    $rental = Rental::create([
        'booking_id' => $booking->id,
        'car_id' => $car->id,
        'customer_id' => $customer->id,
        'officer_id' => $admin->id,
        'contract_number' => 'KTR-1003',
        'checkout_datetime' => now()->subDays(2),
        'km_out' => 10050,
        'fuel_out' => 100,
        'fine_amount' => 0,
        'total_payment' => 500000,
        'status' => 'Active',
    ]);

    Sanctum::actingAs($admin);

    $response = $this->postJson("/api/v1/bookings/{$booking->id}/return", [
        'checklist' => ['return_body' => 'good'],
        'km_out' => 10200, // km in
        'fuel_out' => 90, // fuel in
    ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'Returned');

    expect($booking->fresh()->status)->toBe('Returned');
    expect($car->fresh()->status)->toBe('Ready');
    expect($car->fresh()->last_km)->toBe(10200);
});

test('completing wash updates Booking to Completed and Car to Ready', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create(['name' => 'Customer C', 'phone' => '081234']);
    $car = Car::create(['name' => 'Yaris', 'year' => 2022, 'plate_number' => 'B 4444 DDD', 'status' => 'Belum Dicuci']);
    $booking = Booking::create([
        'user_id' => $admin->id,
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'booking_number' => 'BK-1004',
        'car_type' => 'Yaris',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->toDateString(),
        'payment_method' => 'Cash',
        'status' => 'Returned',
    ]);

    Sanctum::actingAs($admin);

    $response = $this->postJson("/api/v1/bookings/{$booking->id}/wash");

    $response->assertOk()
        ->assertJsonPath('data.status', 'Completed');

    expect($booking->fresh()->status)->toBe('Completed');
    expect($car->fresh()->status)->toBe('Ready');
});

