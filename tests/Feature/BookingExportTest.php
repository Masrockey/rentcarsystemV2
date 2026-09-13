<?php

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\User;

test('authenticated admin can fetch booking export json data', function () {
    $admin = User::factory()->create([
        'roles' => ['Super Admin'],
    ]);

    $customer = Customer::create([
        'name' => 'Alice Wonder',
        'phone' => '08123334445',
        'email' => 'alice@test.com',
        'address' => 'Wonderland Street',
    ]);

    $car = Car::create([
        'name' => 'Honda HR-V',
        'plate_number' => 'D 9999 ZZ',
        'type' => 'SUV',
        'transmission' => 'Automatic',
        'fuel_type' => 'Bensin',
        'status' => 'Ready',
        'daily_price' => 500000,
        'year' => 2023,
    ]);

    Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'user_id' => $admin->id,
        'car_type' => 'HR-V',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-09-13',
        'return_date' => '2026-09-15',
        'payment_method' => 'Cash',
        'payment_status' => 'Paid',
        'amount' => 1000000,
        'status' => 'Confirmed',
    ]);

    $response = $this->actingAs($admin)->getJson(route('bookings.export'));

    $response->assertOk();
    $response->assertJsonStructure(['data']);
    $data = $response->json('data');
    expect($data)->not->toBeEmpty();
    expect($data[0]['customer']['name'])->toBe('Alice Wonder');
    expect($data[0]['car_type'])->toBe('HR-V');
});
