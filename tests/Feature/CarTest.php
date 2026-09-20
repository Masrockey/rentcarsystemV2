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

test('super admin can change car status', function () {
    $superAdmin = User::factory()->create([
        'roles' => ['Super Admin'],
    ]);

    $car = Car::create([
        'name' => 'Avanza Test',
        'plate_number' => 'B 1111 SA',
        'year' => 2022,
        'status' => 'Ready',
    ]);

    $this->actingAs($superAdmin)
        ->put(route('cars.update', $car), [
            'name' => 'Avanza Test Updated',
            'plate_number' => 'B 1111 SA',
            'year' => 2022,
            'status' => 'Service',
        ])
        ->assertRedirect(route('cars.index'));

    $car->refresh();
    expect($car->status)->toBe('Service');
    expect($car->name)->toBe('Avanza Test Updated');
});

test('regular admin cannot change car status on edit', function () {
    $admin = User::factory()->create([
        'roles' => ['Admin'],
    ]);

    $car = Car::create([
        'name' => 'Innova Test',
        'plate_number' => 'B 2222 AD',
        'year' => 2023,
        'status' => 'Ready',
    ]);

    $this->actingAs($admin)
        ->put(route('cars.update', $car), [
            'name' => 'Innova Test Updated',
            'plate_number' => 'B 2222 AD',
            'year' => 2023,
            'status' => 'Service',
        ])
        ->assertRedirect(route('cars.index'));

    $car->refresh();
    expect($car->status)->toBe('Ready'); // Status remains unchanged
    expect($car->name)->toBe('Innova Test Updated'); // Other details updated
});

test('driver role cannot access cars page', function () {
    $driverUser = User::factory()->create([
        'roles' => ['Driver'],
    ]);

    $this->actingAs($driverUser)
        ->get(route('cars.index'))
        ->assertForbidden();
});

test('cannot add car with duplicate plate number', function () {
    $admin = User::factory()->create([
        'roles' => ['Admin'],
    ]);

    Car::create([
        'name' => 'Avanza Lama',
        'plate_number' => 'B 1234 ABC',
        'year' => 2022,
        'status' => 'Ready',
    ]);

    // Exact duplicate
    $this->actingAs($admin)
        ->post(route('cars.store'), [
            'name' => 'Avanza Baru',
            'plate_number' => 'B 1234 ABC',
            'year' => 2023,
            'status' => 'Ready',
        ])
        ->assertSessionHasErrors(['plate_number']);

    // Case-insensitive / whitespace duplicate
    $this->actingAs($admin)
        ->post(route('cars.store'), [
            'name' => 'Avanza Baru 2',
            'plate_number' => '  b 1234 abc  ',
            'year' => 2023,
            'status' => 'Ready',
        ])
        ->assertSessionHasErrors(['plate_number']);

    expect(Car::where('name', 'Avanza Baru')->count())->toBe(0);
});

test('cannot update car with duplicate plate number of another car', function () {
    $admin = User::factory()->create([
        'roles' => ['Admin'],
    ]);

    $car1 = Car::create([
        'name' => 'Car 1',
        'plate_number' => 'B 1111 AAA',
        'year' => 2022,
        'status' => 'Ready',
    ]);

    $car2 = Car::create([
        'name' => 'Car 2',
        'plate_number' => 'B 2222 BBB',
        'year' => 2022,
        'status' => 'Ready',
    ]);

    // Updating car2 with car1's plate number should fail
    $this->actingAs($admin)
        ->put(route('cars.update', $car2), [
            'name' => 'Car 2 Updated',
            'plate_number' => 'b 1111 aaa',
            'year' => 2022,
        ])
        ->assertSessionHasErrors(['plate_number']);

    // Updating car2 keeping its own plate number should succeed
    $this->actingAs($admin)
        ->put(route('cars.update', $car2), [
            'name' => 'Car 2 Updated Name',
            'plate_number' => 'B 2222 BBB',
            'year' => 2022,
        ])
        ->assertSessionHasNoErrors();

    $car2->refresh();
    expect($car2->name)->toBe('Car 2 Updated Name');
});
