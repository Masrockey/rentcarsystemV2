<?php

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\User;

test('authenticated admin can export allocations to csv', function () {
    $admin = User::factory()->create([
        'roles' => ['Super Admin'],
    ]);

    $customer = Customer::create([
        'name' => 'John Doe',
        'phone' => '08123456789',
        'email' => 'john@test.com',
        'address' => 'Test Address',
    ]);

    $car = Car::create([
        'name' => 'Toyota Avanza',
        'plate_number' => 'B 1234 CD',
        'type' => 'MPV',
        'transmission' => 'Manual',
        'fuel_type' => 'Bensin',
        'status' => 'Ready',
        'daily_price' => 350000,
        'year' => 2022,
    ]);

    Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'user_id' => $admin->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-09-08',
        'return_date' => '2026-09-10',
        'payment_method' => 'Cash',
        'payment_status' => 'Paid',
        'amount' => 700000,
        'status' => 'Confirmed',
    ]);

    $response = $this->actingAs($admin)->get(route('allocations.export'));

    $response->assertOk();
    $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
    expect($response->streamedContent())->toContain('John Doe');
    expect($response->streamedContent())->toContain('Toyota Avanza');
    expect($response->streamedContent())->toContain('Marketing / Dibuat Oleh');
});

test('authenticated admin can fetch allocations export json data', function () {
    $admin = User::factory()->create([
        'roles' => ['Super Admin'],
    ]);

    $customer = Customer::create([
        'name' => 'Jane Smith',
        'phone' => '08987654321',
        'email' => 'jane@test.com',
        'address' => 'Test Address 2',
    ]);

    $car = Car::create([
        'name' => 'Toyota Innova',
        'plate_number' => 'B 5678 EF',
        'type' => 'MPV',
        'transmission' => 'Automatic',
        'fuel_type' => 'Diesel',
        'status' => 'Ready',
        'daily_price' => 550000,
        'year' => 2023,
    ]);

    Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'user_id' => $admin->id,
        'car_type' => 'Innova',
        'rental_type' => 'With Driver',
        'booking_date' => '2026-09-12',
        'return_date' => '2026-09-14',
        'payment_method' => 'Transfer',
        'payment_status' => 'Paid',
        'amount' => 1100000,
        'status' => 'Confirmed',
    ]);

    $response = $this->actingAs($admin)->getJson(route('allocations.export', ['format' => 'json']));

    $response->assertOk();
    $response->assertJsonStructure(['data']);
    $data = $response->json('data');
    expect($data)->not->toBeEmpty();
    expect($data[0]['customer']['name'])->toBe('Jane Smith');
});
