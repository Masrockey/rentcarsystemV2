<?php

use App\Models\Blacklist;
use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\User;
use App\Models\VehicleTax;
use Laravel\Sanctum\Sanctum;

test('payments API records payment and syncs booking payment_status', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create(['name' => 'Cust Pay', 'phone' => '08123456']);
    $booking = Booking::create([
        'user_id' => $admin->id,
        'customer_id' => $customer->id,
        'booking_number' => 'BK-PAY-01',
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->toDateString(),
        'payment_method' => 'Transfer',
        'payment_status' => 'Pending',
        'amount' => 500000,
    ]);

    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/v1/payments', [
        'booking_id' => $booking->id,
        'payment_method' => 'Transfer',
        'dp_amount' => 500000,
        'settlement_amount' => 0,
        'total_amount' => 500000,
        'status' => 'Lunas',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true);

    expect($booking->fresh()->payment_status)->toBe('Paid');
});

test('services API records maintenance and updates car last_km', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $car = Car::create(['name' => 'Innova Service', 'year' => 2021, 'plate_number' => 'B 7777 SRV', 'status' => 'Ready', 'last_km' => 20000]);

    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/v1/services', [
        'car_id' => $car->id,
        'service_date' => now()->toDateString(),
        'service_type' => 'Ganti Oli & Tune Up',
        'km' => 25000,
        'cost' => 750000,
        'workshop' => 'Bengkel Auto2000',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true);

    expect($car->fresh()->last_km)->toBe(25000);
});

test('insurances API stores insurance record', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $car = Car::create(['name' => 'Avanza Ins', 'year' => 2022, 'plate_number' => 'B 8888 INS', 'status' => 'Ready']);

    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/v1/insurances', [
        'car_id' => $car->id,
        'insurance_name' => 'Garda Oto All Risk',
        'policy_number' => 'POL-998877',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addYear()->toDateString(),
        'premium' => 3500000,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.policy_number', 'POL-998877');
});

test('vehicle taxes API returns expiring soon count', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $car = Car::create(['name' => 'Brio Tax', 'year' => 2023, 'plate_number' => 'B 9999 TAX', 'status' => 'Ready']);

    VehicleTax::create([
        'car_id' => $car->id,
        'stnk_number' => 'STNK-12345',
        'valid_until' => now()->addDays(10)->toDateString(),
        'annual_tax' => 2000000,
        'five_year_tax' => 2500000,
    ]);

    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/vehicle-taxes');

    $response->assertOk()
        ->assertJsonPath('meta.expiring_soon_count', 1);
});

test('blacklists API imports rows and allows CRUD', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    Sanctum::actingAs($admin);

    $importRes = $this->postJson('/api/v1/blacklists/import', [
        'rows' => [
            [
                'name' => 'Bad Tenant',
                'phone' => '08999999999',
                'nik' => '3201000000000001',
                'perpetrator_info' => 'Membawa kabur unit',
            ],
        ],
    ]);

    $importRes->assertOk()
        ->assertJsonPath('data.imported_count', 1);

    expect(Blacklist::where('phone', '08999999999')->exists())->toBeTrue();
});

test('dashboard API returns role specific data', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/dashboard');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonStructure([
            'data' => [
                'stats' => [
                    'admin' => [
                        'total_cars',
                        'cars_ready',
                        'total_bookings',
                        'total_revenue',
                    ],
                ],
            ],
        ]);
});

test('reports API returns monthly report aggregation', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $customer = Customer::create(['name' => 'Cust Rep', 'phone' => '081234']);

    Booking::create([
        'user_id' => $admin->id,
        'customer_id' => $customer->id,
        'booking_number' => 'BK-REP-01',
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->toDateString(),
        'payment_method' => 'Cash',
        'amount' => 600000,
        'status' => 'Completed',
    ]);

    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/reports');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data');
});

test('lookups API returns form reference options', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/lookups');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonStructure([
            'data' => [
                'ready_cars',
                'all_cars',
                'car_types',
                'ready_drivers',
                'all_drivers',
                'peluncur_officers',
                'wash_officers',
                'marketing_users',
                'customers',
            ],
        ]);
});
