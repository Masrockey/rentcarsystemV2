<?php

use App\Models\Booking;
use App\Models\Car;
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
            expect($data['message'])->toContain('*Telepon:* 0877603XXXXX');
            expect($data['message'])->not->toContain('087760365455');
            expect($data['message'])->toContain('*Dibuat Oleh:*');

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

test('whatsapp booking notification includes creator name in Dibuat Oleh', function () {
    $setting = WaServerSetting::current();
    $setting->update([
        'server_url' => 'http://localhost:3000',
        'device_id' => 'rentcars_main',
        'target_group_jid' => '120363028192839182@g.us',
    ]);

    $creator = User::factory()->create([
        'name' => 'Admin Testing',
        'roles' => ['Admin'],
    ]);

    $marketing = User::factory()->create([
        'name' => 'Marketing Budi',
        'roles' => ['Marketing'],
    ]);

    $customer = Customer::create([
        'name' => 'Pelanggan Setia',
        'phone' => '081234567890',
    ]);

    $booking = Booking::create([
        'user_id' => $marketing->id,
        'customer_id' => $customer->id,
        'booking_number' => 'BK-20261015-CREAT1',
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-10-16',
        'payment_method' => 'Cash',
        'status' => 'Pending',
    ]);

    Http::fake([
        '*/send/message' => function (Request $request) {
            $data = $request->data();
            expect($data['message'])->toContain('*Marketing:* Marketing Budi');
            expect($data['message'])->toContain('*Dibuat Oleh:* Admin Testing');
            expect($data['message'])->toContain('*Dibuat pada:*');

            return Http::response([
                'status' => 200,
                'results' => [
                    'message_id' => 'MSG_TEST_CREATOR',
                ],
            ], 200);
        },
    ]);

    $this->actingAs($creator);

    $result = WhatsAppService::sendNewBookingNotification($booking);

    expect($result)->toBeTrue();
});

test('whatsapp booking notification includes calculated duration', function () {
    $setting = WaServerSetting::current();
    $setting->update([
        'server_url' => 'http://localhost:3000',
        'device_id' => 'rentcars_main',
        'target_group_jid' => '120363028192839182@g.us',
    ]);

    $customer = Customer::create([
        'name' => 'Ibu Haji Aluh',
        'phone' => '087758526868',
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'booking_number' => 'BK-20261015-H93NSJ',
        'car_type' => 'Innova Reborn',
        'rental_type' => 'With Driver',
        'booking_date' => '2026-10-20',
        'return_date' => '2026-10-20',
        'pickup_time' => '07:00:00',
        'return_time' => '22:00:00',
        'pickup_location' => 'GARASI',
        'dropoff_location' => 'GARASI',
        'payment_method' => 'Cash',
        'status' => 'Pending',
    ]);

    Http::fake([
        '*/send/message' => function (Request $request) {
            $data = $request->data();
            expect($data['message'])->toContain('*Durasi:* 1 Hari (15 Jam)');
            expect($data['message'])->toContain("*Mulai:* 20/10/2026 07:00\n*Selesai:* 20/10/2026 22:00\n*Durasi:* 1 Hari (15 Jam)");

            return Http::response([
                'status' => 200,
                'results' => [
                    'message_id' => 'MSG_TEST_DURASI',
                ],
            ], 200);
        },
    ]);

    $result = WhatsAppService::sendNewBookingNotification($booking);

    expect($result)->toBeTrue();
});

test('whatsapp booking notification formats rincian biaya and pembayaran properly', function () {
    $setting = WaServerSetting::current();
    $setting->update([
        'server_url' => 'http://localhost:3000',
        'device_id' => 'rentcars_main',
        'target_group_jid' => '120363028192839182@g.us',
    ]);

    $customer = Customer::create([
        'name' => 'Pak Budi',
        'phone' => '081234567890',
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'booking_number' => 'BK-20261019-RINCI1',
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-10-20',
        'return_date' => '2026-10-21',
        'price' => 225000,
        'duration_type' => 'Hari',
        'duration_days' => 1,
        'delivery_fee' => 0,
        'amount' => 225000,
        'payment_method' => 'Cash',
        'payment_status' => 'Pending',
        'status' => 'Pending',
    ]);

    Http::fake([
        '*/send/message' => function (Request $request) {
            $data = $request->data();
            $expectedRincian = "*--- Rincian Biaya ---*\n"
                ."1 hari x Rp 225.000 = Rp 225.000\n"
                ."─────────────────────\n"
                ."*TOTAL TAGIHAN =* Rp 225.000\n\n"
                ."*--- Pembayaran ---*\n"
                ."*Total Bayar =* Rp 0\n"
                ."*Sisa =* Rp 225.000\n"
                .'*Status:* Belum Bayar';

            expect($data['message'])->toContain($expectedRincian);

            return Http::response([
                'status' => 200,
                'results' => [
                    'message_id' => 'MSG_TEST_RINCIAN',
                ],
            ], 200);
        },
    ]);

    $result = WhatsAppService::sendNewBookingNotification($booking);

    expect($result)->toBeTrue();
});

test('whatsapp booking notification formats fee pengantaran and fee pengambilan properly', function () {
    $setting = WaServerSetting::current();
    $setting->update([
        'server_url' => 'http://localhost:3000',
        'device_id' => 'rentcars_main',
        'target_group_jid' => '120363028192839182@g.us',
    ]);

    $customer = Customer::create([
        'name' => 'Ibu Siti',
        'phone' => '081233445566',
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'booking_number' => 'BK-20261019-RINCI2',
        'car_type' => 'Innova Reborn',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => '2026-10-20',
        'return_date' => '2026-10-22',
        'price' => 500000,
        'duration_type' => 'Hari',
        'duration_days' => 2,
        'delivery_fee' => 50000,
        'pickup_fee' => 75000,
        'amount' => 1125000,
        'payment_method' => 'Cash',
        'payment_status' => 'Pending',
        'status' => 'Pending',
    ]);

    Http::fake([
        '*/send/message' => function (Request $request) {
            $data = $request->data();
            expect($data['message'])->toContain('*Fee Pengantaran =* Rp 50.000');
            expect($data['message'])->toContain('*Fee Pengambilan =* Rp 75.000');
            expect($data['message'])->toContain('*TOTAL TAGIHAN =* Rp 1.125.000');

            return Http::response([
                'status' => 200,
                'results' => [
                    'message_id' => 'MSG_TEST_FEE',
                ],
            ], 200);
        },
    ]);

    $result = WhatsAppService::sendNewBookingNotification($booking);

    expect($result)->toBeTrue();
});

test('generateChecklistPdf generates valid pdf binary for delivery and return', function () {
    $customer = Customer::create([
        'name' => 'Bang Iskandar',
        'phone' => '087760365455',
    ]);

    $car = Car::create([
        'name' => 'CR-V',
        'year' => 2023,
        'plate_number' => 'DR 1234 XY',
        'status' => 'Ready',
        'last_km' => 50000,
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
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
        'status' => 'On Trip',
        'delivery_checklist' => [
            'km_out' => 50000,
            'fuel_out' => 100,
            'handover_location' => 'garasi',
            'checkout_date' => '06/10/2026',
            'checkout_time' => '14:43',
            'kunci_kontak' => 'OK',
            'copy_stnk' => 'OK',
            'body_kiri' => 'Baik',
            'body_kanan' => 'Baik',
            'photos' => [
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            ],
        ],
    ]);

    $pdfDelivery = WhatsAppService::generateChecklistPdf($booking, 'delivery', 'Petugas Uji');
    expect($pdfDelivery)->not->toBeNull();
    expect(str_starts_with($pdfDelivery, '%PDF'))->toBeTrue();
    expect($pdfDelivery)->not->toContain('[ ? ]');

    $pdfReturn = WhatsAppService::generateChecklistPdf($booking, 'return', 'Petugas Uji');
    expect($pdfReturn)->not->toBeNull();
    expect(str_starts_with($pdfReturn, '%PDF'))->toBeTrue();
    expect($pdfReturn)->not->toContain('[ ? ]');
});

test('whatsapp delivery notification sends formatted text and pdf attachment', function () {
    $setting = WaServerSetting::current();
    $setting->update([
        'server_url' => 'http://localhost:3000',
        'device_id' => 'rentcars_main',
        'target_group_jid' => '120363028192839182@g.us',
    ]);

    $customer = Customer::create([
        'name' => 'Bang Iskandar',
        'phone' => '087760365455',
    ]);

    $marketing = User::factory()->create(['name' => 'INGGAR SANJAYA', 'roles' => ['Marketing']]);
    $peluncur = User::factory()->create(['name' => 'Budi Peluncur', 'roles' => ['Driver']]);

    $car = Car::create([
        'name' => 'CR-V',
        'year' => 2023,
        'plate_number' => 'DR 1234 XY',
        'status' => 'On Trip',
        'last_km' => 50000,
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'user_id' => $marketing->id,
        'peluncur_id' => $peluncur->id,
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
        'status' => 'On Trip',
        'delivery_checklist' => [
            'km_out' => 50000,
            'fuel_out' => 100,
            'handover_location' => 'garasi',
            'checkout_date' => '05/10/2026',
            'checkout_time' => '22:24',
        ],
    ]);

    $sentMessage = false;
    $sentFile = false;

    Http::fake([
        '*/send/message' => function (Request $request) use (&$sentMessage) {
            $data = $request->data();
            expect($data['phone'])->toBe('120363028192839182@g.us');
            expect($data['message'])->toContain('*Serah Terima Unit / Unit Keluar*');
            expect($data['message'])->toContain('*No. Booking:* BK-20261005-NWG4CE');
            expect($data['message'])->toContain('*Customer:* Bang Iskandar');
            expect($data['message'])->toContain('*Telepon:* 0877603XXXXX');
            expect($data['message'])->not->toContain('087760365455');
            expect($data['message'])->toContain('*Type:* Lepas Kunci');
            expect($data['message'])->toContain('*Nama Kendaraan:* CR-V');
            expect($data['message'])->toContain('*No. Polisi:* DR 1234 XY');
            expect($data['message'])->toContain('*Lokasi Antar:* garasi');
            expect($data['message'])->toContain('*KM Keluar (Awal):* 50000');
            expect($data['message'])->toContain('*Peluncur:* Budi Peluncur');
            expect($data['message'])->toContain('*Diantar pada:* 05/10/2026 22:24');
            expect($data['message'])->toContain('*Marketing:* INGGAR SANJAYA');
            expect($data['message'])->toContain('*Dibuat Oleh:* Admin Operasional');

            $sentMessage = true;

            return Http::response(['status' => 200, 'results' => ['message_id' => 'MSG_DELIVERY_123']], 200);
        },
        '*/send/file' => function (Request $request) use (&$sentFile) {
            $sentFile = true;

            return Http::response(['status' => 200, 'results' => ['message_id' => 'FILE_DELIVERY_123']], 200);
        },
    ]);

    $result = WhatsAppService::sendDeliveryNotification($booking, 'Admin Operasional');

    expect($result)->toBeTrue();
    expect($sentMessage)->toBeTrue();
    expect($sentFile)->toBeTrue();
});

test('whatsapp return notification sends formatted text and pdf attachment', function () {
    $setting = WaServerSetting::current();
    $setting->update([
        'server_url' => 'http://localhost:3000',
        'device_id' => 'rentcars_main',
        'target_group_jid' => '120363028192839182@g.us',
    ]);

    $customer = Customer::create([
        'name' => 'Bang Iskandar',
        'phone' => '087760365455',
    ]);

    $marketing = User::factory()->create(['name' => 'INGGAR SANJAYA', 'roles' => ['Marketing']]);
    $peluncur = User::factory()->create(['name' => 'Budi Peluncur', 'roles' => ['Driver']]);

    $car = Car::create([
        'name' => 'CR-V',
        'year' => 2023,
        'plate_number' => 'DR 1234 XY',
        'status' => 'Ready',
        'last_km' => 50350,
    ]);

    $booking = Booking::create([
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'user_id' => $marketing->id,
        'peluncur_id' => $peluncur->id,
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
        'status' => 'Returned',
        'return_checklist' => [
            'km_out' => 50350,
            'fuel_out' => 90,
            'handover_location' => 'garasi',
            'checkout_date' => '05/10/2026',
            'checkout_time' => '22:24',
        ],
    ]);

    $sentMessage = false;
    $sentFile = false;

    Http::fake([
        '*/send/message' => function (Request $request) use (&$sentMessage) {
            $data = $request->data();
            expect($data['phone'])->toBe('120363028192839182@g.us');
            expect($data['message'])->toContain('*Pengembalian Unit / Unit Masuk*');
            expect($data['message'])->toContain('*No. Booking:* BK-20261005-NWG4CE');
            expect($data['message'])->toContain('*Customer:* Bang Iskandar');
            expect($data['message'])->toContain('*Telepon:* 0877603XXXXX');
            expect($data['message'])->not->toContain('087760365455');
            expect($data['message'])->toContain('*Type:* Lepas Kunci');
            expect($data['message'])->toContain('*Nama Kendaraan:* CR-V');
            expect($data['message'])->toContain('*No. Polisi:* DR 1234 XY');
            expect($data['message'])->toContain('*Lokasi Antar:* garasi');
            expect($data['message'])->toContain('*KM Masuk (Kembali):* 50350');
            expect($data['message'])->toContain('*Peluncur:* Budi Peluncur');
            expect($data['message'])->toContain('*Diantar pada:* 05/10/2026 22:24');
            expect($data['message'])->toContain('*Marketing:* INGGAR SANJAYA');
            expect($data['message'])->toContain('*Dibuat Oleh:* Petugas Lapangan');

            $sentMessage = true;

            return Http::response(['status' => 200, 'results' => ['message_id' => 'MSG_RETURN_123']], 200);
        },
        '*/send/file' => function (Request $request) use (&$sentFile) {
            $sentFile = true;

            return Http::response(['status' => 200, 'results' => ['message_id' => 'FILE_RETURN_123']], 200);
        },
    ]);

    $result = WhatsAppService::sendReturnNotification($booking, 'Petugas Lapangan');

    expect($result)->toBeTrue();
    expect($sentMessage)->toBeTrue();
    expect($sentFile)->toBeTrue();
});
