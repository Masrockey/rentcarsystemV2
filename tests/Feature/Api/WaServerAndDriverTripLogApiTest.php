<?php

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\DriverTripLog;
use App\Models\User;
use App\Models\WaServerSetting;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

test('driver trip logs overview API returns paginated logs with filters', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $driverUser = User::factory()->create(['roles' => ['Driver']]);
    $driver = Driver::create([
        'user_id' => $driverUser->id,
        'name' => 'Pak Joko',
        'phone' => '08123456789',
        'status' => 'Active',
    ]);
    $customer = Customer::create(['name' => 'Bapak Ahmad', 'phone' => '0877889900']);

    $booking = Booking::create([
        'user_id' => $admin->id,
        'customer_id' => $customer->id,
        'driver_id' => $driver->id,
        'booking_number' => 'BK-TRIP-01',
        'car_type' => 'Avanza',
        'rental_type' => 'With Driver',
        'booking_date' => now()->toDateString(),
        'payment_method' => 'Cash',
        'amount' => 500000,
        'status' => 'On Trip',
    ]);

    DriverTripLog::create([
        'booking_id' => $booking->id,
        'driver_id' => $driver->id,
        'user_id' => $driverUser->id,
        'location_name' => 'Bandara Ngurah Rai',
        'stop_order' => 1,
        'status' => 'Checked In',
        'checkin_at' => now(),
    ]);

    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/driver-trip-logs?search=Ngurah+Rai');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.location_name', 'Bandara Ngurah Rai')
        ->assertJsonPath('data.0.driver_name', 'Pak Joko');
});

test('wa-server API endpoints require Super Admin role', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/wa-server');
    $response->assertForbidden();
});

test('wa-server API returns server status and settings for super admin', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    WaServerSetting::current()->update([
        'server_url' => 'http://localhost:3000',
        'device_id' => 'device_main',
        'target_group_jid' => 'group_123@g.us',
        'target_group_name' => 'Notif Group',
    ]);

    Sanctum::actingAs($superAdmin);

    $response = $this->getJson('/api/v1/wa-server');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.settings.device_id', 'device_main')
        ->assertJsonPath('data.settings.target_group_jid', 'group_123@g.us');
});

test('wa-server API updates settings and target group', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    Sanctum::actingAs($superAdmin);

    $settingsRes = $this->putJson('/api/v1/wa-server/settings', [
        'server_url' => 'https://wa.example.com',
        'device_id' => 'device_prod',
        'target_group_jid' => 'prod_group@g.us',
        'target_group_name' => 'Prod Notif',
    ]);

    $settingsRes->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.server_url', 'https://wa.example.com')
        ->assertJsonPath('data.device_id', 'device_prod');

    $targetRes = $this->postJson('/api/v1/wa-server/target-group', [
        'target_group_jid' => 'new_target@g.us',
        'target_group_name' => 'New Target Group',
    ]);

    $targetRes->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.target_group_jid', 'new_target@g.us');

    expect(WaServerSetting::current()->target_group_jid)->toBe('new_target@g.us');
});

test('wa-server API sends test message via WhatsAppService', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    WaServerSetting::current()->update([
        'server_url' => 'http://localhost:3000',
        'device_id' => 'device_main',
    ]);

    Http::fake([
        '*/send/message' => Http::response([
            'status' => 200,
            'results' => [
                'message_id' => 'MSG_TEST_API_123',
            ],
        ], 200),
    ]);

    Sanctum::actingAs($superAdmin);

    $response = $this->postJson('/api/v1/wa-server/test-message', [
        'phone' => '081234567890',
        'message' => 'Halo ini pesan tes API.',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);

    Http::assertSent(function (Request $request) {
        return str_contains($request->url(), '/send/message')
            && $request['phone'] === '6281234567890'
            && str_contains($request['message'], 'Halo ini pesan tes API.');
    });
});
