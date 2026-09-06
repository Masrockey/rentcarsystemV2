<?php

use App\Models\Car;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('admin can view cars page with search and status filters', function () {
    $admin = User::factory()->create([
        'roles' => ['Super Admin'],
    ]);

    $car1 = Car::create([
        'name' => 'Avanza Veloz',
        'plate_number' => 'B 1234 ABC',
        'brand' => 'Toyota',
        'model' => 'Veloz',
        'type' => 'MPV',
        'year' => 2022,
        'color' => 'Putih',
        'transmission' => 'Manual',
        'fuel_type' => 'Bensin',
        'passenger_capacity' => 7,
        'daily_price' => 350000,
        'weekly_price' => 2100000,
        'monthly_price' => 7000000,
        'status' => 'Ready',
    ]);

    $car2 = Car::create([
        'name' => 'Civic Turbo',
        'plate_number' => 'B 5678 DEF',
        'brand' => 'Honda',
        'model' => 'Civic',
        'type' => 'Sedan',
        'year' => 2023,
        'color' => 'Hitam',
        'transmission' => 'Automatic',
        'fuel_type' => 'Bensin',
        'passenger_capacity' => 5,
        'daily_price' => 600000,
        'weekly_price' => 3600000,
        'monthly_price' => 12000000,
        'status' => 'Not Ready',
    ]);

    // Test default list
    $this->actingAs($admin)
        ->get(route('cars.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('cars/index')
            ->has('cars.data', 2)
            ->where('statusCounts.all', 2)
        );

    // Test search filter by plate number
    $this->actingAs($admin)
        ->get(route('cars.index', ['search' => '1234']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('cars/index')
            ->has('cars.data', 1)
            ->where('cars.data.0.id', $car1->id)
            ->where('search', '1234')
        );

    // Test search filter by name
    $this->actingAs($admin)
        ->get(route('cars.index', ['search' => 'Civic']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('cars/index')
            ->has('cars.data', 1)
            ->where('cars.data.0.id', $car2->id)
        );

    // Test status filter
    $this->actingAs($admin)
        ->get(route('cars.index', ['status' => 'Ready']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('cars/index')
            ->has('cars.data', 1)
            ->where('cars.data.0.id', $car1->id)
        );
});
