<?php

use App\Models\Car;
use App\Models\CarType;
use App\Models\Driver;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('marketing role is forbidden from viewing car fleet list', function () {
    $marketing = User::factory()->create(['roles' => ['Marketing']]);

    Sanctum::actingAs($marketing);

    $response = $this->getJson('/api/v1/cars');

    $response->assertForbidden();
});

test('admin can view and filter cars by status via API', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);

    Car::create([
        'name' => 'Avanza Silver',
        'brand' => 'Toyota',
        'year' => 2023,
        'plate_number' => 'B 1234 ABC',
        'status' => 'Ready',
    ]);

    Car::create([
        'name' => 'Innova Reborn',
        'brand' => 'Toyota',
        'year' => 2022,
        'plate_number' => 'B 5678 XYZ',
        'status' => 'Not Ready',
    ]);

    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/cars?status=ready');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.plate_number', 'B 1234 ABC');
});

test('admin can create car via API', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);

    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/v1/cars', [
        'name' => 'Fortuner GR',
        'brand' => 'Toyota',
        'year' => 2024,
        'plate_number' => 'B 9999 VIP',
        'status' => 'Ready',
        'daily_price' => 1200000,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.plate_number', 'B 9999 VIP');

    $this->assertDatabaseHas('cars', [
        'plate_number' => 'B 9999 VIP',
    ]);
});

test('car types CRUD works via API for admin', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    Sanctum::actingAs($admin);

    $createRes = $this->postJson('/api/v1/car-types', [
        'name' => 'SUV Premium',
        'type' => 'SUV',
        'category' => 'Premium',
    ]);

    $createRes->assertStatus(201)
        ->assertJsonPath('data.name', 'SUV Premium');

    $id = $createRes->json('data.id');

    $updateRes = $this->putJson("/api/v1/car-types/{$id}", [
        'name' => 'SUV Premium Updated',
    ]);

    $updateRes->assertOk()
        ->assertJsonPath('data.name', 'SUV Premium Updated');

    $deleteRes = $this->deleteJson("/api/v1/car-types/{$id}");
    $deleteRes->assertOk();

    expect(CarType::find($id))->toBeNull();
});

test('drivers CRUD works via API', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    Sanctum::actingAs($admin);

    $res = $this->postJson('/api/v1/drivers', [
        'name' => 'Pak Budi',
        'phone' => '081344445555',
        'status' => 'Active',
        'daily_rate' => 200000,
    ]);

    $res->assertStatus(201)
        ->assertJsonPath('data.name', 'Pak Budi');

    $id = $res->json('data.id');

    $listRes = $this->getJson('/api/v1/drivers');
    $listRes->assertOk()
        ->assertJsonCount(1, 'data');

    $delRes = $this->deleteJson("/api/v1/drivers/{$id}");
    $delRes->assertOk();

    expect(Driver::find($id))->toBeNull();
});
