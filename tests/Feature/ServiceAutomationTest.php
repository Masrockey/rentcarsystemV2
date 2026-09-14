<?php

use App\Models\Car;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('car status automatically changes to Service when last_km reaches initial_km + 10000', function () {
    $car = Car::factory()->create([
        'initial_km' => 10000,
        'last_km' => 10000,
        'status' => 'Ready',
    ]);

    expect($car->status)->toBe('Ready');
    expect($car->isServiceDue())->toBeFalse();

    // Update last_km below service limit (e.g., +9999 km)
    $car->update(['last_km' => 19999]);
    $car->refresh();
    expect($car->status)->toBe('Ready');
    expect($car->isServiceDue())->toBeFalse();

    // Update last_km to reach service threshold (+10000 km)
    $car->update(['last_km' => 20000]);
    $car->refresh();
    expect($car->status)->toBe('Service');
    expect($car->isServiceDue())->toBeTrue();
    expect($car->next_service_km)->toBe(20000);
});

test('service index page passes only cars with status Service in cars prop', function () {
    $admin = User::factory()->create(['roles' => ['Super Admin']]);

    $readyCar = Car::factory()->create(['status' => 'Ready', 'initial_km' => 5000, 'last_km' => 5000]);
    $serviceCar = Car::factory()->create(['status' => 'Service', 'initial_km' => 5000, 'last_km' => 15000]);

    $response = $this->actingAs($admin)->get(route('services.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('services/index')
        ->has('cars', 1)
        ->where('cars.0.id', $serviceCar->id)
    );
});

test('storing a service record resets initial_km to service km and changes status back to Ready', function () {
    $admin = User::factory()->create(['roles' => ['Super Admin']]);

    $car = Car::factory()->create([
        'initial_km' => 5000,
        'last_km' => 15500,
        'status' => 'Service',
    ]);

    $response = $this->actingAs($admin)->post(route('services.store'), [
        'car_id' => $car->id,
        'service_date' => now()->toDateString(),
        'workshop' => 'Bengkel Resmi Auto2000',
        'service_type' => 'Servis Berkala 20.000 KM + Ganti Oli',
        'km' => 15500,
        'cost' => 1250000,
        'next_service_date' => now()->addMonths(6)->toDateString(),
        'notes' => 'Ganti oli mesin, filter oli, dan tune up.',
    ]);

    $response->assertRedirect(route('services.index'));

    $this->assertDatabaseHas('services', [
        'car_id' => $car->id,
        'km' => 15500,
        'service_type' => 'Servis Berkala 20.000 KM + Ganti Oli',
    ]);

    $car->refresh();
    expect($car->status)->toBe('Ready');
    expect($car->initial_km)->toBe(15500);
    expect($car->last_km)->toBe(15500);
    expect($car->isServiceDue())->toBeFalse();
    expect($car->next_service_km)->toBe(25500);
});

test('api service store endpoint updates initial_km and sets car status to Ready', function () {
    $user = User::factory()->create();
    $car = Car::factory()->create([
        'initial_km' => 0,
        'last_km' => 10500,
        'status' => 'Service',
    ]);

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/services', [
            'car_id' => $car->id,
            'service_date' => now()->toDateString(),
            'service_type' => 'Ganti Oli',
            'km' => 10500,
            'cost' => 500000,
        ]);

    $response->assertStatus(201);

    $car->refresh();
    expect($car->status)->toBe('Ready');
    expect($car->initial_km)->toBe(10500);
});
