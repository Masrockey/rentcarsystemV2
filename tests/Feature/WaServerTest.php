<?php

use App\Models\Booking;
use App\Models\Customer;
use App\Models\User;
use App\Models\WaServerSetting;
use App\Services\WhatsAppService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

test('guests are redirected to login when visiting wa server', function () {
    $response = $this->get(route('wa-server.index'));

    $response->assertRedirect('/login');
});

test('regular users cannot access wa server', function () {
    $user = User::factory()->create(['roles' => ['Driver']]);

    $response = $this->actingAs($user)->get(route('wa-server.index'));

    $response->assertForbidden();
});

test('admin cannot access wa server page', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);

    $response = $this->actingAs($admin)->get(route('wa-server.index'));

    $response->assertForbidden();
});

test('super admin can access wa server page', function () {
    Http::fake([
        '*/app/info' => Http::response(['status' => 200, 'results' => ['version' => 'v9.0.0']], 200),
        '*/app/status' => Http::response(['status' => 200, 'results' => ['is_connected' => true, 'is_logged_in' => true, 'device_id' => 'rentcars_main', 'jid' => '628123456789@s.whatsapp.net']], 200),
        '*/devices' => Http::response(['status' => 200, 'results' => []], 200),
    ]);

    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);

    $response = $this->actingAs($superAdmin)->get(route('wa-server.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('wa-server/index')
        ->has('settings')
        ->has('serverHealth')
        ->has('connectionStatus')
    );
});

test('super admin can update wa server settings', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);

    $response = $this->actingAs($superAdmin)->post(route('wa-server.settings'), [
        'server_url' => 'https://wa-gateway.example.com',
        'device_id' => 'custom_device_1',
        'auth_username' => 'api_user',
        'auth_password' => 'secret123',
        'auto_reconnect' => true,
    ]);

    $response->assertRedirect(route('wa-server.index'));

    $setting = WaServerSetting::current();
    expect($setting->server_url)->toBe('https://wa-gateway.example.com')
        ->and($setting->device_id)->toBe('custom_device_1')
        ->and($setting->auth_username)->toBe('api_user')
        ->and($setting->auth_password)->toBe('secret123');
});

test('super admin can request qr code from wa server', function () {
    Http::fake([
        '*/app/login' => Http::response([
            'status' => 200,
            'results' => [
                'qr_link' => 'https://example.com/qr.png',
                'qr_duration' => 20,
            ],
        ], 200),
    ]);

    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);

    $response = $this->actingAs($superAdmin)->get(route('wa-server.qr'));

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'qr_link' => 'https://example.com/qr.png',
        'qr_duration' => 20,
    ]);
});

test('super admin can request pairing code from wa server', function () {
    Http::fake([
        '*/app/login-with-code*' => Http::response([
            'status' => 200,
            'results' => [
                'pair_code' => 'ABCD-1234',
            ],
        ], 200),
    ]);

    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);

    $response = $this->actingAs($superAdmin)->postJson(route('wa-server.pair-code'), [
        'phone' => '08123456789',
    ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'pair_code' => 'ABCD-1234',
    ]);
});

test('super admin can send test message', function () {
    Http::fake([
        '*/send/message' => Http::response([
            'status' => 200,
            'results' => [
                'message_id' => 'MSG_TEST_9988',
            ],
        ], 200),
    ]);

    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);

    $response = $this->actingAs($superAdmin)->postJson(route('wa-server.test-message'), [
        'phone' => '08123456789',
        'message' => 'Tes pesan WhatsApp',
    ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'message_id' => 'MSG_TEST_9988',
    ]);
});

test('super admin can fetch groups from wa server', function () {
    Http::fake([
        '*/user/my/groups*' => Http::response([
            'status' => 200,
            'results' => [
                'data' => [
                    ['jid' => '120363028192839182@g.us', 'name' => 'Operasional Rental Mobil'],
                    ['jid' => '120363999999999999@g.us', 'name' => 'Driver & Crew'],
                ],
            ],
        ], 200),
    ]);

    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);

    $response = $this->actingAs($superAdmin)->get(route('wa-server.groups'));

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'groups' => [
            ['jid' => '120363999999999999@g.us', 'name' => 'Driver & Crew'],
            ['jid' => '120363028192839182@g.us', 'name' => 'Operasional Rental Mobil'],
        ],
    ]);
});

test('super admin can send test message to group jid', function () {
    Http::fake([
        '*/send/message' => function (Request $request) {
            $data = $request->data();
            expect($data['phone'])->toBe('120363028192839182@g.us');

            return Http::response([
                'status' => 200,
                'results' => [
                    'message_id' => 'MSG_GRP_123',
                ],
            ], 200);
        },
    ]);

    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);

    $response = $this->actingAs($superAdmin)->postJson(route('wa-server.test-message'), [
        'phone' => '120363028192839182@g.us',
        'message' => 'Halo dari sistem ke grup WhatsApp!',
    ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'message_id' => 'MSG_GRP_123',
    ]);
});

test('whatsapp booking notification masks last 5 digits of customer phone number', function () {
    $setting = WaServerSetting::current();
    $setting->update([
        'server_url' => 'http://localhost:3000',
        'device_id' => 'rentcars_main',
        'target_group_jid' => '120363028192839182@g.us',
    ]);

    Http::fake([
        '*/send/message' => function (Request $request) {
            $data = $request->data();
            expect($data['phone'])->toBe('120363028192839182@g.us');
            expect($data['message'])->toContain('Telepon: 0877603XXXXX');
            expect($data['message'])->not->toContain('087760365455');

            return Http::response([
                'status' => 200,
                'results' => [
                    'message_id' => 'MSG_NOTIF_123',
                ],
            ], 200);
        },
    ]);

    $customer = Customer::create([
        'name' => 'Bang Iskandar',
        'phone' => '087760365455',
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'booking_number' => 'BK-20261005-NWG4CE',
        'car_type' => 'CR-V',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-10-06',
        'return_date' => '2026-10-07',
        'pickup_time' => '14:43:00',
        'return_time' => '16:06:00',
        'pickup_location' => 'garasi',
        'dropoff_location' => 'garasi',
        'payment_method' => 'Cash',
        'status' => 'Pending',
    ]);

    $result = WhatsAppService::sendNewBookingNotification($booking);

    expect($result)->toBeTrue();
});
