<?php

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard can be filtered by preset and custom date range', function () {
    $user = User::factory()->create(['roles' => ['Super Admin']]);
    $this->actingAs($user);

    // Filter by preset
    $response = $this->get(route('dashboard', ['preset' => 'today']));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('filters')
        ->where('filters.preset', 'today')
        ->where('filters.is_filtered', true)
    );

    // Filter by custom date
    $response = $this->get(route('dashboard', [
        'start_date' => '2026-09-01',
        'end_date' => '2026-09-10',
    ]));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('filters')
        ->where('filters.start_date', '2026-09-01')
        ->where('filters.end_date', '2026-09-10')
        ->where('filters.is_filtered', true)
    );
});

test('marketing dashboard displays cars with cleanly formatted booking date and time', function () {
    $marketing = User::factory()->create(['roles' => ['Marketing']]);
    $this->actingAs($marketing);

    $customer = Customer::create([
        'name' => 'Jane Smith',
        'phone' => '081234567890',
        'email' => 'jane@example.com',
        'address' => 'Jakarta',
    ]);

    $car = Car::create([
        'name' => 'Toyota Avanza',
        'brand' => 'Toyota',
        'model' => 'Avanza',
        'type' => 'MPV',
        'year' => 2024,
        'plate_number' => 'B 1234 ABC',
        'color' => 'Hitam',
        'daily_price' => 350000,
        'status' => 'Not Ready',
    ]);

    Booking::create([
        'booking_number' => 'BK-TEST-001',
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'car_type' => 'Toyota Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-09-05',
        'return_date' => '2026-09-06',
        'pickup_time' => '16:00:00',
        'return_time' => '16:00:00',
        'payment_method' => 'Lunas',
        'payment_status' => 'Paid',
        'amount' => 350000,
        'status' => 'On Trip',
    ]);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('stats.marketing.cars_status', 1)
        ->where('stats.marketing.cars_status.0.active_booking.booking_date', '2026-09-05')
        ->where('stats.marketing.cars_status.0.active_booking.return_date', '2026-09-06')
        ->where('stats.marketing.cars_status.0.active_booking.pickup_time', '16:00')
    );
});
