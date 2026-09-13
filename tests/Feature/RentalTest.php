<?php

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\Rental;
use App\Models\User;

test('super admin can create manual rental contract', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $customer = Customer::create([
        'name' => 'John Rental',
        'phone' => '0812345678',
        'email' => 'john@rental.com',
        'address' => 'Rental Address',
    ]);
    $car = Car::create([
        'name' => 'Toyota Avanza',
        'plate_number' => 'B 1111 AAA',
        'year' => 2022,
        'status' => 'Ready',
    ]);
    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'user_id' => $superAdmin->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-09-14',
        'return_date' => '2026-09-16',
        'payment_method' => 'Cash',
        'payment_status' => 'Paid',
        'amount' => 700000,
        'status' => 'Confirmed',
    ]);

    $rentalData = [
        'booking_id' => $booking->id,
        'car_id' => $car->id,
        'customer_id' => $customer->id,
        'officer_id' => $superAdmin->id,
        'checkout_datetime' => '2026-09-14 09:00',
        'checkin_datetime' => '2026-09-16 09:00',
        'handover_location' => 'Garasi',
        'km_out' => 50000,
        'fuel_out' => 100,
        'fine_amount' => 0,
        'total_payment' => 700000,
        'status' => 'Active',
    ];

    $response = $this->actingAs($superAdmin)->post(route('rentals.store'), $rentalData);
    $response->assertRedirect(route('rentals.index'));

    expect(Rental::where('booking_id', $booking->id)->exists())->toBeTrue();
});

test('non super admin cannot create manual rental contract', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create([
        'name' => 'John Rental 2',
        'phone' => '0812345679',
        'email' => 'john2@rental.com',
        'address' => 'Rental Address 2',
    ]);
    $car = Car::create([
        'name' => 'Toyota Avanza',
        'plate_number' => 'B 2222 AAA',
        'year' => 2022,
        'status' => 'Ready',
    ]);
    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'user_id' => $admin->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-09-14',
        'return_date' => '2026-09-16',
        'payment_method' => 'Cash',
        'payment_status' => 'Paid',
        'amount' => 700000,
        'status' => 'Confirmed',
    ]);

    $rentalData = [
        'booking_id' => $booking->id,
        'car_id' => $car->id,
        'customer_id' => $customer->id,
        'officer_id' => $admin->id,
        'checkout_datetime' => '2026-09-14 09:00',
        'checkin_datetime' => '2026-09-16 09:00',
        'handover_location' => 'Garasi',
        'km_out' => 50000,
        'fuel_out' => 100,
        'fine_amount' => 0,
        'total_payment' => 700000,
        'status' => 'Active',
    ];

    $response = $this->actingAs($admin)->post(route('rentals.store'), $rentalData);
    $response->assertForbidden();
});
