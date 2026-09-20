<?php

use App\Models\AppNotification;
use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\User;
use App\Services\NotificationService;
use Laravel\Sanctum\Sanctum;

test('NotificationService sends notification to specific roles and excludes sender', function () {
    $admin = User::factory()->create(['name' => 'Admin User', 'roles' => ['Admin']]);
    $superAdmin = User::factory()->create(['name' => 'Super Admin', 'roles' => ['Super Admin']]);
    $marketing = User::factory()->create(['name' => 'Marketing User', 'roles' => ['Marketing']]);

    $notifs = NotificationService::sendToRoles(
        ['Admin', 'Super Admin'],
        'Test Title',
        'Test Message',
        '/bookings',
        'booking_created',
        'CalendarPlus',
        ['foo' => 'bar'],
        $marketing->id
    );

    expect($notifs)->toHaveCount(2);

    $adminNotif = AppNotification::where('user_id', $admin->id)->first();
    expect($adminNotif)->not->toBeNull();
    expect($adminNotif->title)->toBe('Test Title');
    expect($adminNotif->message)->toBe('Test Message');
    expect($adminNotif->read_at)->toBeNull();

    $marketingNotif = AppNotification::where('user_id', $marketing->id)->first();
    expect($marketingNotif)->toBeNull();
});

test('marketing creating a booking notifies admins and super admins', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $marketing = User::factory()->create(['name' => 'Marketing Andi', 'roles' => ['Marketing']]);
    $customer = Customer::create([
        'name' => 'Budi Customer',
        'user_id' => $marketing->id,
        'phone' => '081234567890',
    ]);

    $this->actingAs($marketing);

    $response = $this->post(route('bookings.store'), [
        'customer_id' => $customer->id,
        'car_type' => 'Avanza',
        'rental_type' => 'Lepas Kunci',
        'booking_date' => now()->format('Y-m-d'),
        'return_date' => now()->addDays(2)->format('Y-m-d'),
        'pickup_time' => '10:00',
        'return_time' => '10:00',
        'pickup_location' => 'Kantor',
        'dropoff_location' => 'Kantor',
        'payment_method' => 'Cash',
        'payment_status' => 'Pending',
        'amount' => 500000,
    ]);

    $response->assertRedirect(route('bookings.index'));

    $adminNotif = AppNotification::where('user_id', $admin->id)
        ->where('type', 'booking_created')
        ->first();
    expect($adminNotif)->not->toBeNull();
    expect($adminNotif->title)->toBe('Booking Baru Masuk');
    expect($adminNotif->message)->toContain('Marketing Andi');

    $superAdminNotif = AppNotification::where('user_id', $superAdmin->id)
        ->where('type', 'booking_created')
        ->first();
    expect($superAdminNotif)->not->toBeNull();
});

test('allocating a booking sends notification to the assigned peluncur and driver', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $peluncur = User::factory()->create(['name' => 'Peluncur Rudi', 'roles' => ['Peluncur']]);
    $driverUser = User::factory()->create(['name' => 'Driver Joko', 'roles' => ['Driver']]);
    $driver = Driver::create([
        'user_id' => $driverUser->id,
        'name' => 'Driver Joko',
        'phone' => '08987654321',
        'status' => 'Active',
    ]);
    $car = Car::factory()->create([
        'name' => 'Innova',
        'plate_number' => 'DK 1234 AB',
        'status' => 'Ready',
    ]);

    $marketing = User::factory()->create(['roles' => ['Marketing']]);
    $customer = Customer::create([
        'name' => 'Customer Santi',
        'phone' => '08129876543',
        'user_id' => $marketing->id,
    ]);

    $booking = Booking::create([
        'booking_number' => 'BK-'.date('Ymd').'-TEST01',
        'user_id' => $marketing->id,
        'customer_id' => $customer->id,
        'car_type' => 'Innova',
        'rental_type' => 'With Driver',
        'booking_date' => now()->format('Y-m-d'),
        'return_date' => now()->addDays(2)->format('Y-m-d'),
        'pickup_time' => '09:00',
        'return_time' => '09:00',
        'pickup_location' => 'Bandara',
        'dropoff_location' => 'Hotel',
        'payment_method' => 'Transfer',
        'status' => 'Pending',
        'amount' => 750000,
    ]);

    $this->actingAs($admin);

    $response = $this->put(route('allocations.update', $booking), [
        'car_id' => $car->id,
        'peluncur_id' => $peluncur->id,
        'driver_id' => $driver->id,
        'amount' => 750000,
    ]);

    $response->assertRedirect();

    // Peluncur received notification
    $peluncurNotif = AppNotification::where('user_id', $peluncur->id)
        ->where('type', 'booking_allocated')
        ->first();
    expect($peluncurNotif)->not->toBeNull();
    expect($peluncurNotif->title)->toBe('Tugas Serah Terima Booking');
    expect($peluncurNotif->message)->toContain($booking->booking_number);

    // Driver received notification
    $driverNotif = AppNotification::where('user_id', $driverUser->id)
        ->where('type', 'booking_allocated')
        ->first();
    expect($driverNotif)->not->toBeNull();
    expect($driverNotif->title)->toBe('Penugasan Driver Booking');

    // Marketing creator received notification
    $marketingNotif = AppNotification::where('user_id', $marketing->id)
        ->where('type', 'booking_allocated')
        ->first();
    expect($marketingNotif)->not->toBeNull();
    expect($marketingNotif->title)->toBe('Booking Telah Dialokasikan');
});

test('user can fetch notifications and mark as read via web endpoint', function () {
    $user = User::factory()->create(['roles' => ['Marketing']]);
    $this->actingAs($user);

    $notif1 = AppNotification::create([
        'user_id' => $user->id,
        'type' => 'test',
        'title' => 'Notif 1',
        'message' => 'Message 1',
    ]);

    $notif2 = AppNotification::create([
        'user_id' => $user->id,
        'type' => 'test',
        'title' => 'Notif 2',
        'message' => 'Message 2',
    ]);

    // Fetch index
    $res = $this->getJson(route('notifications.index'));
    $res->assertOk();
    $res->assertJson([
        'unread_count' => 2,
    ]);
    expect($res->json('notifications'))->toHaveCount(2);

    // Mark single as read
    $markRes = $this->postJson(route('notifications.read', $notif1));
    $markRes->assertOk();
    expect($notif1->fresh()->read_at)->not->toBeNull();

    // Check updated unread count
    $res2 = $this->getJson(route('notifications.index'));
    $res2->assertJson([
        'unread_count' => 1,
    ]);

    // Mark all as read
    $markAllRes = $this->postJson(route('notifications.mark-all-read'));
    $markAllRes->assertOk();
    expect($notif2->fresh()->read_at)->not->toBeNull();

    $res3 = $this->getJson(route('notifications.index'));
    $res3->assertJson([
        'unread_count' => 0,
    ]);
});

test('user cannot mark or delete another users notification', function () {
    $user1 = User::factory()->create(['roles' => ['Marketing']]);
    $user2 = User::factory()->create(['roles' => ['Admin']]);

    $notif = AppNotification::create([
        'user_id' => $user1->id,
        'type' => 'test',
        'title' => 'Private Notif',
        'message' => 'Only for user 1',
    ]);

    $this->actingAs($user2);

    $res = $this->postJson(route('notifications.read', $notif));
    $res->assertForbidden();

    $deleteRes = $this->deleteJson(route('notifications.destroy', $notif));
    $deleteRes->assertForbidden();

    expect($notif->fresh())->not->toBeNull();
});

test('api notification endpoints work with sanctum authentication', function () {
    $user = User::factory()->create(['roles' => ['Admin']]);
    Sanctum::actingAs($user);

    $notif = AppNotification::create([
        'user_id' => $user->id,
        'type' => 'api_test',
        'title' => 'API Notif',
        'message' => 'Testing API',
    ]);

    $res = $this->getJson('/api/v1/notifications');
    $res->assertOk();
    $res->assertJsonStructure([
        'data' => [
            'notifications',
            'unread_count',
        ],
    ]);

    $markRes = $this->postJson("/api/v1/notifications/{$notif->id}/read");
    $markRes->assertOk();
    expect($notif->fresh()->read_at)->not->toBeNull();
});
