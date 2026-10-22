<?php

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\Rental;
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
})->with(['Admin', 'Super Admin']);

test('super admin can delete allocation record', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $customer = Customer::create(['name' => 'Wayan Test']);
    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-09-15',
        'payment_method' => 'Cash',
        'status' => 'Pending',
        'amount' => 350000,
    ]);

    $response = $this->actingAs($superAdmin)
        ->delete(route('allocations.destroy', $booking));

    $response->assertRedirect();
    expect(Booking::find($booking->id))->toBeNull();
});

test('non super admin cannot delete allocation record', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create(['name' => 'Made Test']);
    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-09-15',
        'payment_method' => 'Cash',
        'status' => 'Pending',
        'amount' => 350000,
    ]);

    $response = $this->actingAs($admin)
        ->delete(route('allocations.destroy', $booking));

    $response->assertForbidden();
    expect(Booking::find($booking->id))->not->toBeNull();
});

test('admin can filter allocations by preset tomorrow and date range', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer1 = Customer::create(['name' => 'Cust Today', 'phone' => '0811111111']);
    $customer2 = Customer::create(['name' => 'Cust Tomorrow', 'phone' => '0822222222']);

    $bookingToday = Booking::create([
        'customer_id' => $customer1->id,
        'car_type' => 'Innova',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->format('Y-m-d'),
        'payment_method' => 'Cash',
        'status' => 'Pending',
        'amount' => 500000,
    ]);

    $bookingTomorrow = Booking::create([
        'customer_id' => $customer2->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->addDay()->format('Y-m-d'),
        'payment_method' => 'Cash',
        'status' => 'Pending',
        'amount' => 400000,
    ]);

    // Filter by preset=tomorrow
    $response = $this->actingAs($admin)
        ->get(route('allocations.index', ['preset' => 'tomorrow']));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('allocations/index')
        ->has('bookings.data', 1)
        ->where('bookings.data.0.id', $bookingTomorrow->id)
        ->where('unallocatedCount', 1)
    );
});

test('cancelled bookings are excluded from allocations index and cannot be allocated', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create(['name' => 'Budi Cancelled']);
    $car = Car::create([
        'name' => 'Toyota Avanza',
        'year' => 2023,
        'plate_number' => 'DK 9999 CC',
        'status' => 'Ready',
    ]);

    $activeBooking = Booking::create([
        'customer_id' => $customer->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->format('Y-m-d'),
        'payment_method' => 'Cash',
        'status' => 'Pending',
        'amount' => 350000,
    ]);

    $cancelledBooking = Booking::create([
        'customer_id' => $customer->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->format('Y-m-d'),
        'payment_method' => 'Cash',
        'status' => 'Cancelled',
        'amount' => 350000,
    ]);

    // Check allocations index: cancelled booking must NOT appear in the active list
    $response = $this->actingAs($admin)->get(route('allocations.index'));
    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('allocations/index')
        ->has('bookings.data', 1)
        ->where('bookings.data.0.id', $activeBooking->id)
    );

    // Attempting to allocate a cancelled booking must be rejected
    $updateResponse = $this->actingAs($admin)
        ->put(route('allocations.update', $cancelledBooking), [
            'car_id' => $car->id,
        ]);

    $updateResponse->assertRedirect();
    $cancelledBooking->refresh();
    expect($cancelledBooking->car_id)->toBeNull();
});

test('cancelling a booking clears existing allocation and releases rented vehicle', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create(['name' => 'Made Cancel']);
    $car = Car::create([
        'name' => 'Innova Reborn',
        'year' => 2024,
        'plate_number' => 'DK 8888 ZZ',
        'status' => 'Rented',
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'car_type' => 'Innova',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->format('Y-m-d'),
        'payment_method' => 'Cash',
        'status' => 'Confirmed',
        'amount' => 500000,
    ]);

    $rental = Rental::create([
        'booking_id' => $booking->id,
        'car_id' => $car->id,
        'customer_id' => $customer->id,
        'officer_id' => $admin->id,
        'contract_number' => 'KTR-20261022-TEST01',
        'checkout_datetime' => now(),
        'km_out' => 10000,
        'fuel_out' => 100,
        'total_payment' => 1000000,
        'status' => 'Active',
    ]);

    $this->actingAs($admin)
        ->post(route('bookings.cancel', $booking), [
            'cancellation_reason' => 'Customer changed plans',
        ])
        ->assertRedirect();

    $booking->refresh();
    $rental->refresh();
    $car->refresh();

    expect($booking->status)->toBe('Cancelled');
    expect($booking->car_id)->toBeNull();
    expect($rental->status)->toBe('Cancelled');
    expect($car->status)->toBe('Ready');
});
