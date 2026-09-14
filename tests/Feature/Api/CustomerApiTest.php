<?php

use App\Models\Customer;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('admin can view all customers via API', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $marketing1 = User::factory()->create(['roles' => ['Marketing']]);
    $marketing2 = User::factory()->create(['roles' => ['Marketing']]);

    Customer::create([
        'user_id' => $marketing1->id,
        'name' => 'Customer A',
        'phone' => '0811111111',
    ]);
    Customer::create([
        'user_id' => $marketing2->id,
        'name' => 'Customer B',
        'phone' => '0822222222',
    ]);

    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/customers');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(2, 'data');
});

test('marketing user only sees their own customers via API', function () {
    $marketing1 = User::factory()->create(['roles' => ['Marketing']]);
    $marketing2 = User::factory()->create(['roles' => ['Marketing']]);

    Customer::create([
        'user_id' => $marketing1->id,
        'name' => 'Customer A',
        'phone' => '0811111111',
    ]);
    Customer::create([
        'user_id' => $marketing2->id,
        'name' => 'Customer B',
        'phone' => '0822222222',
    ]);

    Sanctum::actingAs($marketing1);

    $response = $this->getJson('/api/v1/customers');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Customer A');
});

test('marketing user can create customer via API', function () {
    $marketing = User::factory()->create(['roles' => ['Marketing']]);

    Sanctum::actingAs($marketing);

    $response = $this->postJson('/api/v1/customers', [
        'name' => 'New Client',
        'nik' => '3201123456780001',
        'phone' => '081299998888',
        'email' => 'client@example.com',
        'address' => 'Jakarta Selatan',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'New Client')
        ->assertJsonPath('data.user_id', $marketing->id);

    $this->assertDatabaseHas('customers', [
        'name' => 'New Client',
        'user_id' => $marketing->id,
    ]);
});

test('duplicate customer check triggers validation error via API', function () {
    $marketing1 = User::factory()->create(['name' => 'Marketing Satu', 'roles' => ['Marketing']]);
    $marketing2 = User::factory()->create(['name' => 'Marketing Dua', 'roles' => ['Marketing']]);

    Customer::create([
        'user_id' => $marketing1->id,
        'name' => 'Existing Person',
        'phone' => '08123456789',
        'nik' => '3201999999990001',
    ]);

    Sanctum::actingAs($marketing2);

    $response = $this->postJson('/api/v1/customers', [
        'name' => 'Another Person',
        'phone' => '08123456789', // duplicate phone
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['phone']);
});
