<?php

use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\User;

test('full rent car booking workflow', function () {
    // 1. Create a customer
    $customer = Customer::create([
        'name' => 'John Customer',
        'phone' => '0812345678',
        'email' => 'john@client.com',
        'address' => 'Customer Address',
    ]);

    // 2. Log in as Marketing to create a booking
    $marketing = User::factory()->create(['roles' => ['Marketing']]);
    $this->actingAs($marketing);

    $bookingData = [
        'customer_id' => $customer->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-07-12',
        'return_date' => '2026-07-15',
        'pickup_time' => '08:00',
        'return_time' => '08:00',
        'pickup_location' => 'Garasi',
        'dropoff_location' => 'Garasi',
        'payment_method' => 'DP',
        'payment_status' => 'Down Payment',
        'amount' => 1500000,
    ];

    $response = $this->post(route('bookings.store'), $bookingData);
    $response->assertRedirect(route('bookings.index'));

    $booking = Booking::first();
    expect($booking->status)->toBe('Pending');
    expect($booking->car_id)->toBeNull();
    expect($booking->peluncur_id)->toBeNull();

    // 3. Log in as Admin to assign car, peluncur, and wash officer
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $peluncur = User::factory()->create(['roles' => ['Peluncur']]);
    $cuci = User::factory()->create(['roles' => ['Petugas Cuci']]);
    $car = Car::create([
        'name' => 'Toyota Avanza',
        'year' => 2022,
        'plate_number' => 'B 9999 ZZZ',
        'status' => 'Ready',
    ]);

    $this->actingAs($admin);

    $assignData = [
        'car_id' => $car->id,
        'peluncur_id' => $peluncur->id,
        'petugas_cuci_id' => $cuci->id,
    ];

    $response = $this->put(route('bookings.update', $booking), $assignData);
    $response->assertRedirect(route('bookings.index'));

    $booking->refresh();
    expect($booking->status)->toBe('Confirmed'); // Auto-confirmed because car and peluncur are allocated
    expect($booking->car_id)->toBe($car->id);
    expect($booking->peluncur_id)->toBe($peluncur->id);
    expect($booking->petugas_cuci_id)->toBe($cuci->id);

    // 4. Log in as Peluncur to submit Delivery Checklist (Pengeluaran)
    $this->actingAs($peluncur);

    $deliveryData = [
        'checklist' => [
            'body' => true,
            'interior' => true,
            'fuel' => 'Full',
            'cleanliness' => 'Clean',
        ],
        'km_out' => 15000,
        'fuel_out' => 100,
        'handover_location' => 'Bandara Soekarno Hatta',
        'latitude' => '-6.2088',
        'longitude' => '106.8456',
        'notes' => 'Car handed over in perfect condition.',
    ];

    $response = $this->post(route('bookings.delivery', $booking), $deliveryData);
    $response->assertRedirect(route('rentals.index'));

    $booking->refresh();
    $car->refresh();

    expect($booking->status)->toBe('On Trip');
    expect($car->status)->toBe('Not Ready'); // Automatically changes to Not Ready
    expect($booking->delivery_latitude)->toBe('-6.2088');

    // 5. Log in as Peluncur to submit Return Checklist
    $returnData = [
        'checklist' => [
            'body' => true,
            'interior' => true,
            'fuel' => 'Full',
            'cleanliness' => 'Dirty',
        ],
        'notes' => 'Returned but muddy.',
    ];

    $response = $this->post(route('bookings.return', $booking), $returnData);
    $response->assertRedirect(route('rentals.index'));

    $booking->refresh();
    $car->refresh();

    expect($booking->status)->toBe('Returned');
    expect($car->status)->toBe('Ready'); // Automatically changes to Ready

    // 6. Log in as Petugas Cuci to complete washing
    $this->actingAs($cuci);

    $response = $this->from(route('rentals.index'))->post(route('bookings.wash', $booking));
    $response->assertRedirect(route('rentals.index'));

    $booking->refresh();
    $car->refresh();

    expect($booking->status)->toBe('Completed');
    expect($car->status)->toBe('Ready'); // Stays / ensures Ready
});

test('marketing can create booking with new customer on the fly', function () {
    $marketing = User::factory()->create(['roles' => ['Marketing']]);
    $this->actingAs($marketing);

    $bookingData = [
        'new_customer_name' => 'Alice New Client',
        'new_customer_phone' => '0899887766',
        'car_type' => 'Innova',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-07-25',
        'return_date' => '2026-07-28',
        'pickup_time' => '09:00',
        'return_time' => '09:00',
        'pickup_location' => 'Bandara',
        'dropoff_location' => 'Bandara',
        'payment_method' => 'Cash',
        'payment_status' => 'Paid',
        'amount' => 2000000,
    ];

    $response = $this->post(route('bookings.store'), $bookingData);
    $response->assertRedirect(route('bookings.index'));

    $newCustomer = Customer::where('name', 'Alice New Client')->first();
    expect($newCustomer)->not->toBeNull();
    expect($newCustomer->phone)->toBe('0899887766');

    $booking = Booking::where('customer_id', $newCustomer->id)->first();
    expect($booking)->not->toBeNull();
    expect($booking->car_type)->toBe('Innova');
    expect($booking->car_id)->toBeNull();
});

test('super admin has full access to all roles and permissions', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);

    expect($superAdmin->isSuperAdmin())->toBeTrue();
    expect($superAdmin->isAdmin())->toBeTrue();
    expect($superAdmin->isMarketing())->toBeTrue();
    expect($superAdmin->isPeluncur())->toBeTrue();
    expect($superAdmin->isPetugasCuci())->toBeTrue();
    expect($superAdmin->hasRole('AnyCustomRole'))->toBeTrue();

    $this->actingAs($superAdmin);
    $response = $this->get(route('users.index'));
    $response->assertOk();
});

test('admin role cannot access user management', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);

    $this->actingAs($admin);
    $response = $this->get(route('users.index'));
    $response->assertStatus(403);
});

test('super admin can edit and delete booking', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $customer = Customer::create([
        'name' => 'Test Customer',
        'phone' => '0812345678',
    ]);
    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_type' => 'Avanza',
        'booking_date' => '2026-07-25',
        'return_date' => '2026-07-28',
        'payment_method' => 'Cash',
        'payment_status' => 'Pending',
        'amount' => 500000,
        'status' => 'Pending',
    ]);

    $this->actingAs($superAdmin);

    // Edit booking
    $updateResponse = $this->put(route('bookings.update', $booking->id), [
        'car_type' => 'Fortuner VIP',
        'amount' => 1500000,
        'payment_status' => 'Paid',
    ]);
    $updateResponse->assertRedirect(route('bookings.index'));

    $booking->refresh();
    expect($booking->car_type)->toBe('Fortuner VIP');
    expect((float) $booking->amount)->toBe(1500000.0);
    expect($booking->payment_status)->toBe('Paid');

    // Delete booking
    $deleteResponse = $this->delete(route('bookings.destroy', $booking->id));
    $deleteResponse->assertRedirect(route('bookings.index'));

    expect(Booking::find($booking->id))->toBeNull();
});

test('creating or updating payment automatically syncs booking payment status', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create(['name' => 'Payment Client', 'phone' => '0811223344']);
    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_type' => 'Innova',
        'booking_date' => '2026-07-25',
        'payment_method' => 'Cash',
        'payment_status' => 'Pending',
        'amount' => 500000,
        'status' => 'Pending',
    ]);

    $this->actingAs($admin);

    // Create payment with status Lunas
    $response = $this->post(route('payments.store'), [
        'booking_id' => $booking->id,
        'payment_method' => 'Transfer',
        'dp_amount' => 0,
        'settlement_amount' => 500000,
        'total_amount' => 500000,
        'status' => 'Lunas',
    ]);
    $response->assertRedirect(route('payments.index'));

    $booking->refresh();
    expect($booking->payment_status)->toBe('Paid');
    expect($booking->payment_method)->toBe('Transfer');
});

test('admin can access allocations page and view data with blacklists', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $this->actingAs($admin);

    $response = $this->get(route('allocations.index'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->has('blacklists'));
});

test('admin and peluncur can access rentals page and view data', function () {
    $peluncur = User::factory()->create(['roles' => ['Peluncur']]);
    $this->actingAs($peluncur);

    $response = $this->get(route('rentals.index'));
    $response->assertOk();
});

test('user can cancel booking with optional cancellation reason', function () {
    $marketing = User::factory()->create(['roles' => ['Marketing']]);
    $customer = Customer::create([
        'user_id' => $marketing->id,
        'name' => 'Cancel Test Client',
        'phone' => '0899887766',
    ]);

    $booking = Booking::create([
        'user_id' => $marketing->id,
        'customer_id' => $customer->id,
        'car_type' => 'Avanza',
        'booking_date' => '2026-09-10',
        'payment_method' => 'Cash',
        'payment_status' => 'Pending',
        'amount' => 350000,
        'status' => 'Pending',
    ]);

    $this->actingAs($marketing);

    $response = $this->post(route('bookings.cancel', $booking), [
        'cancellation_reason' => 'Konsumen berubah rencana liburan',
    ]);

    $response->assertRedirect();

    $booking->refresh();
    expect($booking->status)->toBe('Cancelled');
    expect($booking->cancellation_reason)->toBe('Konsumen berubah rencana liburan');
    expect($booking->cancelled_at)->not->toBeNull();
});

test('admin sees bookings created by marketing', function () {
    $marketing = User::factory()->create(['name' => 'Marketing User', 'roles' => ['Marketing']]);
    $admin = User::factory()->create(['name' => 'Admin User', 'roles' => ['Admin']]);

    $customer = Customer::create([
        'user_id' => $marketing->id,
        'name' => 'Client of Marketing',
        'phone' => '081234567890',
    ]);

    $this->actingAs($marketing);
    $response = $this->post(route('bookings.store'), [
        'customer_id' => $customer->id,
        'car_type' => 'Innova Reborn',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-10-01',
        'return_date' => '2026-10-03',
        'pickup_time' => '09:00',
        'return_time' => '09:00',
        'pickup_location' => 'Bandara',
        'dropoff_location' => 'Bandara',
        'payment_method' => 'Cash',
        'amount' => 1200000,
    ]);
    $response->assertRedirect(route('bookings.index'));

    $booking = Booking::where('car_type', 'Innova Reborn')->first();
    expect($booking)->not->toBeNull();
    expect($booking->user_id)->toBe($marketing->id);

    // Marketing sees the booking
    $this->actingAs($marketing);
    $marketingView = $this->get(route('bookings.index'));
    $marketingView->assertOk();
    $marketingView->assertInertia(fn ($page) => $page
        ->component('bookings/index')
        ->where('bookings.data.0.id', $booking->id)
    );

    // Admin also sees the booking created by Marketing
    $this->actingAs($admin);
    $adminView = $this->get(route('bookings.index'));
    $adminView->assertOk();
    $adminView->assertInertia(fn ($page) => $page
        ->component('bookings/index')
        ->where('bookings.data.0.id', $booking->id)
    );

    // Admin also sees in allocations index
    $allocationView = $this->get(route('allocations.index'));
    $allocationView->assertOk();
    $allocationView->assertInertia(fn ($page) => $page
        ->component('allocations/index')
        ->where('bookings.data.0.id', $booking->id)
    );
});
