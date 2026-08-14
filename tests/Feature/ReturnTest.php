<?php

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\Rental;
use App\Models\User;

test('admin can access unit kembali page and view active on trip units', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create(['name' => 'John Return Test']);
    $car = Car::create([
        'name' => 'Toyota Alphard Test',
        'year' => 2024,
        'plate_number' => 'DK 8888 XX',
        'status' => 'Not Ready',
        'last_km' => 15000,
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'car_type' => 'Alphard',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-08-14',
        'payment_method' => 'Cash',
        'status' => 'On Trip',
        'amount' => 900000,
        'delivery_checklist' => ['km_out' => 15000, 'fuel_out' => 100],
    ]);

    $rental = Rental::create([
        'booking_id' => $booking->id,
        'car_id' => $car->id,
        'customer_id' => $customer->id,
        'officer_id' => $admin->id,
        'contract_number' => 'KTR-20260814-TEST01',
        'checkout_datetime' => now(),
        'km_out' => 15000,
        'fuel_out' => 100,
        'fine_amount' => 0,
        'total_payment' => 900000,
        'status' => 'Active',
    ]);

    $this->actingAs($admin)
        ->get(route('returns.index'))
        ->assertStatus(200);
});

test('submitting return checklist updates booking and car status to Belum Dicuci', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create(['name' => 'Jane Return Test']);
    $car = Car::create([
        'name' => 'Daihatsu Xenia Test',
        'year' => 2022,
        'plate_number' => 'DK 7777 YY',
        'status' => 'Not Ready',
        'last_km' => 60000,
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'car_type' => 'Xenia',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-08-14',
        'payment_method' => 'Cash',
        'status' => 'On Trip',
        'amount' => 500000,
        'delivery_checklist' => ['km_out' => 60000, 'fuel_out' => 100],
    ]);

    $rental = Rental::create([
        'booking_id' => $booking->id,
        'car_id' => $car->id,
        'customer_id' => $customer->id,
        'officer_id' => $admin->id,
        'contract_number' => 'KTR-20260814-TEST02',
        'checkout_datetime' => now(),
        'km_out' => 60000,
        'fuel_out' => 100,
        'fine_amount' => 0,
        'total_payment' => 500000,
        'status' => 'Active',
    ]);

    $this->actingAs($admin)
        ->post(route('bookings.return', $booking), [
            'checklist' => [
                'kunci_kontak' => 'OK',
                'copy_stnk' => 'OK',
            ],
            'km_out' => 63000,
            'fuel_out' => 70,
            'notes' => 'Unit kembali bensin 70%',
        ])
        ->assertRedirect(route('rentals.index'));

    $rental->refresh();
    $booking->refresh();
    $car->refresh();

    expect($rental->status)->toBe('Returned');
    expect($rental->km_in)->toBe(63000);
    expect($rental->fuel_in)->toBe(70);

    expect($booking->status)->toBe('Returned');
    expect($car->status)->toBe('Belum Dicuci');
    expect($car->last_km)->toBe(63000);
});
