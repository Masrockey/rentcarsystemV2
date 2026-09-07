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
