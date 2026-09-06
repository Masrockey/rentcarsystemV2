<?php

use App\Models\Customer;
use App\Models\User;

test('marketing users can only see their own created customers', function () {
    $marketing1 = User::factory()->create(['roles' => ['Marketing']]);
    $marketing2 = User::factory()->create(['roles' => ['Marketing']]);

    $customer1 = Customer::create([
        'user_id' => $marketing1->id,
        'name' => 'Customer of Marketing 1',
        'phone' => '0811111111',
    ]);

    $customer2 = Customer::create([
        'user_id' => $marketing2->id,
        'name' => 'Customer of Marketing 2',
        'phone' => '0822222222',
    ]);

    $this->actingAs($marketing1);

    $response = $this->get(route('customers.index'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('customers/index')
        ->has('customers', 1)
        ->where('customers.0.id', $customer1->id)
        ->where('customers.0.name', 'Customer of Marketing 1')
    );
});

test('admin users can see all customers from all marketing users', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $marketing1 = User::factory()->create(['roles' => ['Marketing']]);
    $marketing2 = User::factory()->create(['roles' => ['Marketing']]);

    $customer1 = Customer::create([
        'user_id' => $marketing1->id,
        'name' => 'Customer 1',
    ]);

    $customer2 = Customer::create([
        'user_id' => $marketing2->id,
        'name' => 'Customer 2',
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('customers.index'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('customers/index')
        ->has('customers', 2)
    );
});

test('creating customer automatically associates with authenticated user', function () {
    $marketing = User::factory()->create(['roles' => ['Marketing']]);
    $this->actingAs($marketing);

    $response = $this->post(route('customers.store'), [
        'name' => 'New Customer by Marketing',
        'phone' => '0812345678',
        'nik' => '3201010101010001',
    ]);

    $response->assertRedirect(route('customers.index'));

    $customer = Customer::where('name', 'New Customer by Marketing')->first();
    expect($customer)->not->toBeNull();
    expect($customer->user_id)->toBe($marketing->id);
});

test('marketing users cannot update or delete customer created by other users', function () {
    $marketing1 = User::factory()->create(['roles' => ['Marketing']]);
    $marketing2 = User::factory()->create(['roles' => ['Marketing']]);

    $customer1 = Customer::create([
        'user_id' => $marketing1->id,
        'name' => 'Customer of Marketing 1',
    ]);

    $this->actingAs($marketing2);

    $updateResponse = $this->put(route('customers.update', $customer1), [
        'name' => 'Hacked Name',
    ]);
    $updateResponse->assertForbidden();

    $deleteResponse = $this->delete(route('customers.destroy', $customer1));
    $deleteResponse->assertForbidden();
});

test('admin can update or delete any customer', function () {
    $admin = User::factory()->create(['roles' => ['Super Admin']]);
    $marketing = User::factory()->create(['roles' => ['Marketing']]);

    $customer = Customer::create([
        'user_id' => $marketing->id,
        'name' => 'Customer by Marketing',
    ]);

    $this->actingAs($admin);

    $updateResponse = $this->put(route('customers.update', $customer), [
        'name' => 'Updated by Admin',
    ]);
    $updateResponse->assertRedirect(route('customers.index'));

    $deleteResponse = $this->delete(route('customers.destroy', $customer));
    $deleteResponse->assertRedirect(route('customers.index'));

    expect(Customer::find($customer->id))->toBeNull();
});

test('creating customer inline in booking associates with the booking user', function () {
    $marketing = User::factory()->create(['roles' => ['Marketing']]);
    $this->actingAs($marketing);

    $response = $this->post(route('bookings.store'), [
        'new_customer_name' => 'Inline Booking Customer',
        'new_customer_phone' => '0899887766',
        'car_type' => 'Innova',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-09-10',
        'return_date' => '2026-09-12',
        'payment_method' => 'Cash',
        'payment_status' => 'Paid',
    ]);

    $response->assertRedirect(route('bookings.index'));

    $customer = Customer::where('name', 'Inline Booking Customer')->first();
    expect($customer)->not->toBeNull();
    expect($customer->user_id)->toBe($marketing->id);
});

test('admin can update the creator user_id of a customer', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $marketing1 = User::factory()->create(['roles' => ['Marketing']]);
    $marketing2 = User::factory()->create(['roles' => ['Marketing']]);

    $customer = Customer::create([
        'user_id' => $marketing1->id,
        'name' => 'Transferable Customer',
    ]);

    $this->actingAs($admin);

    $response = $this->put(route('customers.update', $customer), [
        'name' => 'Transferable Customer',
        'user_id' => $marketing2->id,
    ]);

    $response->assertRedirect(route('customers.index'));
    $customer->refresh();
    expect($customer->user_id)->toBe($marketing2->id);
});

test('marketing user updating customer cannot change its user_id', function () {
    $marketing1 = User::factory()->create(['roles' => ['Marketing']]);
    $marketing2 = User::factory()->create(['roles' => ['Marketing']]);

    $customer = Customer::create([
        'user_id' => $marketing1->id,
        'name' => 'Marketing 1 Customer',
    ]);

    $this->actingAs($marketing1);

    $response = $this->put(route('customers.update', $customer), [
        'name' => 'Marketing 1 Customer Updated',
        'user_id' => $marketing2->id,
    ]);

    $response->assertRedirect(route('customers.index'));
    $customer->refresh();
    expect($customer->name)->toBe('Marketing 1 Customer Updated');
    expect($customer->user_id)->toBe($marketing1->id); // Remains unchanged
});
