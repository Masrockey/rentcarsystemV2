<?php

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\User;

test('admin can access dedicated allocations page and allocate vehicle', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create(['name' => 'Kadek Test']);
    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_type' => 'Innova',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-08-15',
        'payment_method' => 'Cash',
        'status' => 'Pending',
        'amount' => 500000,
    ]);

    $car = Car::create([
        'name' => 'Toyota Innova',
        'year' => 2023,
        'plate_number' => 'DK 1234 AB',
        'status' => 'Ready',
    ]);

    $peluncur = User::factory()->create(['roles' => ['Peluncur']]);

    // Access allocations index page
    $this->actingAs($admin)
        ->get(route('allocations.index'))
        ->assertStatus(200);

    // Perform allocation via dedicated allocation update route
    $this->actingAs($admin)
        ->put(route('allocations.update', $booking), [
            'car_id' => $car->id,
            'peluncur_id' => $peluncur->id,
            'amount' => 550000,
        ])
        ->assertRedirect();

    $booking->refresh();
    expect($booking->car_id)->toBe($car->id);
    expect($booking->peluncur_id)->toBe($peluncur->id);
    expect((float) $booking->amount)->toBe(550000.0);
    expect($booking->status)->toBe('Confirmed');
});

test('all user roles can access car status page', function (string $role) {
    $user = User::factory()->create(['roles' => [$role]]);

    $this->actingAs($user)
        ->get(route('cars.index'))
        ->assertStatus(200);

    $this->actingAs($user)
        ->get(route('cars.index', ['status' => 'Ready']))
        ->assertStatus(200);
})->with(['Admin', 'Super Admin', 'Marketing', 'Peluncur', 'Petugas Cuci']);
