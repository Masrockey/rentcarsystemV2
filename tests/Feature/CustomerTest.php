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
        ->has('customers.data', 1)
        ->where('customers.data.0.id', $customer1->id)
        ->where('customers.data.0.name', 'Customer of Marketing 1')
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
        ->has('customers.data', 2)
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
        'pickup_time' => '10:00',
        'return_time' => '10:00',
        'pickup_location' => 'Garasi',
        'dropoff_location' => 'Garasi',
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

test('users can search customers by name, nik, phone, email, address, sim_number, emergency_contact, or creator', function () {
    $admin = User::factory()->create(['name' => 'Admin Officer', 'roles' => ['Super Admin']]);
    $marketing = User::factory()->create(['name' => 'Doni Marketing', 'roles' => ['Marketing']]);

    $cust1 = Customer::create([
        'user_id' => $marketing->id,
        'name' => 'Budi Santoso',
        'nik' => '3201010101010001',
        'phone' => '08123456789',
        'email' => 'budi@example.com',
        'address' => 'Jl. Merdeka No 1',
        'sim_number' => 'SIM12345',
        'emergency_contact' => '0899999999',
    ]);

    $cust2 = Customer::create([
        'user_id' => $admin->id,
        'name' => 'Siti Rahma',
        'nik' => '3578034567890003',
        'phone' => '08777777777',
        'email' => 'siti@example.com',
        'address' => 'Jl. Sudirman No 2',
        'sim_number' => 'SIM67890',
        'emergency_contact' => '0888888888',
    ]);

    $this->actingAs($admin);

    // Search by NIK
    $this->get(route('customers.index', ['search' => '3201010101010001']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('customers/index')
            ->has('customers.data', 1)
            ->where('customers.data.0.id', $cust1->id)
            ->where('search', '3201010101010001')
        );

    // Search by Phone
    $this->get(route('customers.index', ['search' => '08777777777']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('customers/index')
            ->has('customers.data', 1)
            ->where('customers.data.0.id', $cust2->id)
        );

    // Search by Creator Name
    $this->get(route('customers.index', ['search' => 'Doni']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('customers/index')
            ->has('customers.data', 1)
            ->where('customers.data.0.id', $cust1->id)
        );
});

test('customer cannot be created with duplicate name, nik, phone, or email and displays marketing name', function () {
    $marketing = User::factory()->create(['name' => 'Budi Marketing', 'roles' => ['Marketing']]);

    Customer::create([
        'user_id' => $marketing->id,
        'name' => 'John Doe',
        'nik' => '1234567890123456',
        'phone' => '08123456789',
        'email' => 'john@example.com',
    ]);

    $this->actingAs($marketing);

    // Duplicate name
    $response = $this->post(route('customers.store'), [
        'name' => 'John Doe',
        'nik' => '9999999999999999',
        'phone' => '08999999999',
        'email' => 'other@example.com',
    ]);
    $response->assertSessionHasErrors(['name' => 'Nama customer sudah terdaftar untuk customer lain dengan marketing Budi Marketing. Silakan hubungi admin atau marketing yang bersangkutan.']);

    // Duplicate NIK
    $response = $this->post(route('customers.store'), [
        'name' => 'Jane Doe',
        'nik' => '1234567890123456',
        'phone' => '08999999999',
        'email' => 'other@example.com',
    ]);
    $response->assertSessionHasErrors(['nik' => 'NIK sudah terdaftar untuk customer lain dengan marketing Budi Marketing. Silakan hubungi admin atau marketing yang bersangkutan.']);

    // Duplicate Phone
    $response = $this->post(route('customers.store'), [
        'name' => 'Jane Doe',
        'nik' => '9999999999999999',
        'phone' => '08123456789',
        'email' => 'other@example.com',
    ]);
    $response->assertSessionHasErrors(['phone' => 'Nomor HP sudah terdaftar untuk customer lain dengan marketing Budi Marketing. Silakan hubungi admin atau marketing yang bersangkutan.']);

    // Duplicate Email
    $response = $this->post(route('customers.store'), [
        'name' => 'Jane Doe',
        'nik' => '9999999999999999',
        'phone' => '08999999999',
        'email' => 'john@example.com',
    ]);
    $response->assertSessionHasErrors(['email' => 'Email sudah terdaftar untuk customer lain dengan marketing Budi Marketing. Silakan hubungi admin atau marketing yang bersangkutan.']);
});

test('booking cannot be created with duplicate inline customer and displays marketing name', function () {
    $marketing = User::factory()->create(['name' => 'Agus Marketing', 'roles' => ['Marketing']]);

    Customer::create([
        'user_id' => $marketing->id,
        'name' => 'Existing Customer',
        'nik' => '3201010101019999',
        'phone' => '081299998888',
        'email' => 'existing@example.com',
    ]);

    $this->actingAs($marketing);

    $this->post(route('bookings.store'), [
        'new_customer_name' => 'Existing Customer',
        'new_customer_nik' => '1111111111111111',
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-09-15',
        'return_date' => '2026-09-17',
        'pickup_time' => '10:00',
        'return_time' => '10:00',
        'pickup_location' => 'Garasi',
        'dropoff_location' => 'Garasi',
        'payment_method' => 'Cash',
    ])->assertSessionHasErrors(['new_customer_name' => 'Nama customer sudah terdaftar untuk customer lain dengan marketing Agus Marketing. Silakan hubungi admin atau marketing yang bersangkutan.']);

    $this->post(route('bookings.store'), [
        'new_customer_name' => 'Brand New Name',
        'new_customer_nik' => '3201010101019999',
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-09-15',
        'return_date' => '2026-09-17',
        'pickup_time' => '10:00',
        'return_time' => '10:00',
        'pickup_location' => 'Garasi',
        'dropoff_location' => 'Garasi',
        'payment_method' => 'Cash',
    ])->assertSessionHasErrors(['new_customer_nik' => 'NIK sudah terdaftar untuk customer lain dengan marketing Agus Marketing. Silakan hubungi admin atau marketing yang bersangkutan.']);
});

test('admin can edit customer phone and preserving original phone if masked', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create([
        'name' => 'Original Customer',
        'phone' => '081234567890',
        'nik' => '3201010101010099',
    ]);

    $this->actingAs($admin);

    // 1. Updating with masked phone keeps the original phone
    $response = $this->put(route('customers.update', $customer), [
        'name' => 'Updated Customer Name',
        'phone' => '08123456****',
    ]);
    $response->assertRedirect(route('customers.index'));
    $customer->refresh();
    expect($customer->name)->toBe('Updated Customer Name');
    expect($customer->phone)->toBe('081234567890');

    // 2. Updating with new phone number updates the phone
    $response2 = $this->put(route('customers.update', $customer), [
        'name' => 'Updated Customer Name 2',
        'phone' => '089988776655',
    ]);
    $response2->assertRedirect(route('customers.index'));
    $customer->refresh();
    expect($customer->phone)->toBe('089988776655');
});
