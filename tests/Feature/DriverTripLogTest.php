<?php

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\DriverTripLog;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('driver can check in at first destination with gps, notes, and photo', function () {
    Storage::fake('public');

    $driverUser = User::factory()->create(['roles' => ['Driver']]);
    $driver = Driver::create([
        'user_id' => $driverUser->id,
        'name' => 'Driver Joko',
        'phone' => '081299990001',
        'sim' => 'SIM-111222',
        'status' => 'Active',
        'daily_rate' => 150000,
    ]);

    $customer = Customer::create([
        'name' => 'Customer Budi',
        'phone' => '081288880001',
        'email' => 'budi@test.com',
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'driver_id' => $driver->id,
        'car_type' => 'Avanza',
        'rental_type' => 'With Driver',
        'booking_date' => '2026-09-15',
        'return_date' => '2026-09-18',
        'status' => 'Confirmed',
        'payment_method' => 'Cash',
        'payment_status' => 'Pending',
        'amount' => 1000000,
    ]);

    $file = UploadedFile::fake()->image('checkin_bandara.jpg');

    $response = $this->actingAs($driverUser)->post("/bookings/{$booking->id}/trip-logs/checkin", [
        'location_name' => 'Penjemputan Bandara Lombok',
        'checkin_notes' => 'Sudah tiba di pintu kedatangan domestik',
        'checkin_latitude' => -8.7582,
        'checkin_longitude' => 116.2764,
        'checkin_photo' => $file,
    ]);

    $response->assertRedirect();

    $log = DriverTripLog::where('booking_id', $booking->id)->first();
    expect($log)->not->toBeNull();
    expect($log->location_name)->toBe('Penjemputan Bandara Lombok');
    expect($log->stop_order)->toBe(1);
    expect($log->status)->toBe('Checked In');
    expect($log->checkin_latitude)->toBe(-8.7582);
    expect($log->checkin_longitude)->toBe(116.2764);
    expect($log->checkin_notes)->toBe('Sudah tiba di pintu kedatangan domestik');
    expect($log->checkin_photo)->not->toBeNull();

    // Verify booking status transitioned from Confirmed to On Trip
    expect($booking->fresh()->status)->toBe('On Trip');
});

test('driver can check out from first stop then check in to second destination', function () {
    Storage::fake('public');

    $driverUser = User::factory()->create(['roles' => ['Driver']]);
    $driver = Driver::create([
        'user_id' => $driverUser->id,
        'name' => 'Driver Slamet',
        'phone' => '081299990002',
        'sim' => 'SIM-333444',
        'status' => 'Active',
        'daily_rate' => 150000,
    ]);

    $customer = Customer::create([
        'name' => 'Customer Sinta',
        'phone' => '081288880002',
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'driver_id' => $driver->id,
        'car_type' => 'Innova',
        'rental_type' => 'With Driver',
        'booking_date' => '2026-09-15',
        'status' => 'On Trip',
        'payment_method' => 'Cash',
        'payment_status' => 'Paid',
        'amount' => 1200000,
    ]);

    // 1. Initial stop (Tempat 1: Bandara)
    $log1 = DriverTripLog::create([
        'booking_id' => $booking->id,
        'driver_id' => $driver->id,
        'user_id' => $driverUser->id,
        'location_name' => 'Bandara',
        'stop_order' => 1,
        'checkin_at' => now()->subHours(2),
        'status' => 'Checked In',
    ]);

    // 2. Checkout from Stop 1
    $checkoutPhoto = UploadedFile::fake()->image('checkout_bandara.jpg');
    $respCheckout = $this->actingAs($driverUser)->post("/bookings/{$booking->id}/trip-logs/{$log1->id}/checkout", [
        'checkout_notes' => 'Tamu sudah naik mobil, menuju Hotel',
        'checkout_latitude' => -8.7585,
        'checkout_longitude' => 116.2769,
        'checkout_photo' => $checkoutPhoto,
    ]);
    $respCheckout->assertRedirect();

    $log1->refresh();
    expect($log1->status)->toBe('Checked Out');
    expect($log1->checkout_at)->not->toBeNull();
    expect($log1->checkout_notes)->toBe('Tamu sudah naik mobil, menuju Hotel');

    // 3. Check-in to Stop 2 (Tempat 2: Hotel)
    $respStop2 = $this->actingAs($driverUser)->post("/bookings/{$booking->id}/trip-logs/checkin", [
        'location_name' => 'Hotel Senggigi',
        'checkin_notes' => 'Sampai di lobby hotel',
        'checkin_latitude' => -8.5032,
        'checkin_longitude' => 116.0504,
    ]);
    $respStop2->assertRedirect();

    $log2 = DriverTripLog::where('booking_id', $booking->id)->where('stop_order', 2)->first();
    expect($log2)->not->toBeNull();
    expect($log2->location_name)->toBe('Hotel Senggigi');
    expect($log2->status)->toBe('Checked In');

    // Total logs for booking is 2
    expect(DriverTripLog::where('booking_id', $booking->id)->count())->toBe(2);
});

test('api allows driver multi-stop checkin and checkout', function () {
    Storage::fake('public');

    $driverUser = User::factory()->create(['roles' => ['Driver']]);
    $driver = Driver::create([
        'user_id' => $driverUser->id,
        'name' => 'Driver API',
        'phone' => '081299990003',
        'sim' => 'SIM-555666',
        'status' => 'Active',
        'daily_rate' => 150000,
    ]);

    $customer = Customer::create([
        'name' => 'Customer API',
        'phone' => '081288880003',
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'driver_id' => $driver->id,
        'car_type' => 'Fortuner',
        'rental_type' => 'With Driver',
        'booking_date' => '2026-09-15',
        'status' => 'Confirmed',
        'payment_method' => 'Transfer',
        'payment_status' => 'Paid',
        'amount' => 2000000,
    ]);

    // 1. API Check-in
    $respCheckin = $this->actingAs($driverUser)->postJson("/api/v1/bookings/{$booking->id}/trip-logs/checkin", [
        'location_name' => 'Destinasi Wisata 1',
        'checkin_notes' => 'Tiba di pintu masuk',
        'checkin_latitude' => -8.6500,
        'checkin_longitude' => 116.3000,
    ]);

    $respCheckin->assertCreated()->assertJsonPath('success', true);
    $logId = $respCheckin->json('data.id');

    // 2. API Listing
    $respList = $this->actingAs($driverUser)->getJson("/api/v1/bookings/{$booking->id}/trip-logs");
    $respList->assertOk()->assertJsonCount(1, 'data');

    // 3. API Checkout
    $respCheckout = $this->actingAs($driverUser)->postJson("/api/v1/bookings/{$booking->id}/trip-logs/{$logId}/checkout", [
        'checkout_notes' => 'Selesai tour',
        'checkout_latitude' => -8.6510,
        'checkout_longitude' => 116.3010,
    ]);

    $respCheckout->assertOk()->assertJsonPath('success', true);
    expect($respCheckout->json('data.status'))->toBe('Checked Out');
});

test('driver cannot check in to second stop if first stop has not checked out yet', function () {
    $driverUser = User::factory()->create(['roles' => ['Driver']]);
    $driver = Driver::create([
        'user_id' => $driverUser->id,
        'name' => 'Driver Budi',
        'phone' => '081299990004',
        'sim' => 'SIM-777888',
        'status' => 'Active',
        'daily_rate' => 150000,
    ]);

    $customer = Customer::create([
        'name' => 'Customer Budi',
        'phone' => '081288880004',
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'driver_id' => $driver->id,
        'car_type' => 'Avanza',
        'rental_type' => 'With Driver',
        'booking_date' => '2026-09-15',
        'status' => 'On Trip',
        'payment_method' => 'Cash',
        'payment_status' => 'Paid',
        'amount' => 500000,
    ]);

    DriverTripLog::create([
        'booking_id' => $booking->id,
        'driver_id' => $driver->id,
        'user_id' => $driverUser->id,
        'location_name' => 'Tempat Pertama',
        'stop_order' => 1,
        'checkin_at' => now(),
        'status' => 'Checked In',
    ]);

    // Attempting to check in to Tempat Kedua while Tempat Pertama is still Checked In should fail
    $resp = $this->actingAs($driverUser)->postJson("/api/v1/bookings/{$booking->id}/trip-logs/checkin", [
        'location_name' => 'Tempat Kedua',
    ]);

    $resp->assertStatus(422)
        ->assertJsonPath('success', false);
});

test('admin and super admin can view driver trip logs overview page with filters', function () {
    $admin = User::factory()->create(['roles' => ['Super Admin']]);

    $driverUser = User::factory()->create(['roles' => ['Driver']]);
    $driver = Driver::create([
        'user_id' => $driverUser->id,
        'name' => 'Driver Budi Handoko',
        'phone' => '081299990099',
        'sim' => 'SIM-999000',
        'status' => 'Active',
        'daily_rate' => 150000,
    ]);

    $customer = Customer::create([
        'name' => 'Customer Handoko',
        'phone' => '081288880099',
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'driver_id' => $driver->id,
        'car_type' => 'Innova',
        'rental_type' => 'With Driver',
        'booking_date' => '2026-09-15',
        'status' => 'On Trip',
        'payment_method' => 'Cash',
        'payment_status' => 'Paid',
        'amount' => 700000,
    ]);

    DriverTripLog::create([
        'booking_id' => $booking->id,
        'driver_id' => $driver->id,
        'user_id' => $driverUser->id,
        'location_name' => 'Hotel Senggigi Resort',
        'stop_order' => 1,
        'checkin_at' => now(),
        'status' => 'Checked In',
    ]);

    // Admin can access page
    $response = $this->actingAs($admin)
        ->get(route('driver-trip-logs.index'))
        ->assertOk();

    // Admin can filter by search
    $this->actingAs($admin)
        ->get(route('driver-trip-logs.index', ['search' => 'Senggigi']))
        ->assertOk();

    // Admin can filter by driver
    $this->actingAs($admin)
        ->get(route('driver-trip-logs.index', ['driver_id' => $driver->id]))
        ->assertOk();
});

test('non-admin role cannot access driver trip logs overview page', function () {
    $driverUser = User::factory()->create(['roles' => ['Driver']]);

    $this->actingAs($driverUser)
        ->get(route('driver-trip-logs.index'))
        ->assertForbidden();
});
