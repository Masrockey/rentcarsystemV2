<?php

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Car;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Laravel\Sanctum\Sanctum;

test('guests are redirected to the login page when visiting activity logs', function () {
    $response = $this->get(route('activity-logs.index'));
    $response->assertRedirect(route('login'));
});

test('non super admin users receive 403 forbidden when accessing activity logs', function () {
    $admin = User::factory()->create(['roles' => ['Admin']]);
    $this->actingAs($admin);

    $response = $this->get(route('activity-logs.index'));
    $response->assertForbidden();
});

test('super admin can access activity logs index page', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $this->actingAs($superAdmin);

    $response = $this->get(route('activity-logs.index'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('activity-logs/index')
        ->has('logs')
        ->has('filters')
        ->has('stats')
        ->has('availableActions')
        ->has('availableSubjectTypes')
    );
});

test('creating, updating, and deleting a model automatically logs activity with diffs', function () {
    $superAdmin = User::factory()->create(['name' => 'Root Admin', 'roles' => ['Super Admin']]);
    $this->actingAs($superAdmin);

    // 1. Create customer
    $customer = Customer::create([
        'name' => 'Budi Santoso',
        'phone' => '081299998888',
        'email' => 'budi@example.com',
        'address' => 'Denpasar, Bali',
    ]);

    $createLog = ActivityLog::where('subject_type', 'Customer')
        ->where('subject_id', $customer->id)
        ->where('action', 'created')
        ->first();

    expect($createLog)->not->toBeNull();
    expect($createLog->user_id)->toBe($superAdmin->id);
    expect($createLog->subject_label)->toContain('Budi Santoso');
    expect($createLog->properties['attributes']['phone'])->toBe('081299998888');

    // 2. Update customer
    $customer->update([
        'phone' => '081277776666',
        'address' => 'Kuta, Bali',
    ]);

    $updateLog = ActivityLog::where('subject_type', 'Customer')
        ->where('subject_id', $customer->id)
        ->where('action', 'updated')
        ->latest('id')
        ->first();

    expect($updateLog)->not->toBeNull();
    expect($updateLog->properties['old']['phone'])->toBe('081299998888');
    expect($updateLog->properties['new']['phone'])->toBe('081277776666');

    // 3. Delete customer
    $customer->delete();

    $deleteLog = ActivityLog::where('subject_type', 'Customer')
        ->where('subject_id', $customer->id)
        ->where('action', 'deleted')
        ->latest('id')
        ->first();

    expect($deleteLog)->not->toBeNull();
});

test('sensitive attributes like password are stripped from activity log properties', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $this->actingAs($superAdmin);

    $newUser = User::create([
        'name' => 'Officer One',
        'email' => 'officer1@example.com',
        'password' => bcrypt('super-secret-password'),
        'roles' => ['Peluncur'],
    ]);

    $log = ActivityLog::where('subject_type', 'User')
        ->where('subject_id', $newUser->id)
        ->where('action', 'created')
        ->first();

    expect($log)->not->toBeNull();
    expect(isset($log->properties['attributes']['password']))->toBeFalse();
    expect(isset($log->properties['attributes']['remember_token']))->toBeFalse();
});

test('activity logs can be filtered by action, subject_type, and search', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $this->actingAs($superAdmin);

    ActivityLog::create([
        'user_id' => $superAdmin->id,
        'user_name' => $superAdmin->name,
        'user_role' => 'Super Admin',
        'action' => 'created',
        'subject_type' => 'Car',
        'subject_id' => 99,
        'subject_label' => 'Toyota Innova Zenix (DK 1234 XY)',
        'description' => 'Menambahkan data armada Toyota Innova Zenix',
        'created_at' => now(),
    ]);

    ActivityLog::create([
        'user_id' => $superAdmin->id,
        'user_name' => $superAdmin->name,
        'user_role' => 'Super Admin',
        'action' => 'deleted',
        'subject_type' => 'Customer',
        'subject_id' => 101,
        'subject_label' => 'Siti Nurhaliza',
        'description' => 'Menghapus data konsumen Siti Nurhaliza',
        'created_at' => now(),
    ]);

    // Filter by action = created
    $responseAction = $this->get(route('activity-logs.index', ['action' => 'created']));
    $responseAction->assertOk();
    $responseAction->assertInertia(fn ($page) => $page
        ->where('filters.action', 'created')
    );

    // Filter by search = Innova
    $responseSearch = $this->get(route('activity-logs.index', ['search' => 'Innova']));
    $responseSearch->assertOk();
});

test('api endpoint /api/v1/activity-logs allows super admin and denies others', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $peluncur = User::factory()->create(['roles' => ['Peluncur']]);

    // Non-superadmin forbidden
    Sanctum::actingAs($peluncur);
    $denied = $this->getJson('/api/v1/activity-logs');
    $denied->assertStatus(403);

    // Superadmin allowed
    Sanctum::actingAs($superAdmin);
    $allowed = $this->getJson('/api/v1/activity-logs');
    $allowed->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonStructure([
            'data' => [
                'logs',
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total'],
        ]);
});

test('auth events login and logout generate activity logs', function () {
    $user = User::factory()->create(['name' => 'Login User', 'roles' => ['Admin']]);

    event(new Login('web', $user, false));
    $loginLog = ActivityLog::where('action', 'login')->where('user_id', $user->id)->first();
    expect($loginLog)->not->toBeNull();
    expect($loginLog->description)->toContain('berhasil login');

    event(new Logout('web', $user));
    $logoutLog = ActivityLog::where('action', 'logout')->where('user_id', $user->id)->first();
    expect($logoutLog)->not->toBeNull();
    expect($logoutLog->description)->toContain('logout');
});

test('activity log descriptions include workflow context like melalui Unit Kembali or Complete Booking', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $this->actingAs($superAdmin);

    $car = Car::factory()->create(['status' => 'Not Ready', 'name' => 'PREMIO', 'plate_number' => 'B 7773 TDB']);
    $customer = Customer::create([
        'name' => 'John Doe',
        'phone' => '081234567890',
        'email' => 'john@example.com',
        'address' => 'Jakarta',
    ]);
    $booking = Booking::create([
        'booking_number' => 'BK-'.date('Ymd').'-TEST01',
        'customer_id' => $customer->id,
        'car_id' => $car->id,
        'car_type' => 'PREMIO',
        'booking_date' => now()->toDateString(),
        'return_date' => now()->addDays(2)->toDateString(),
        'rental_type' => 'Lepas Kunci',
        'payment_method' => 'Cash',
        'payment_status' => 'Paid',
        'amount' => 500000,
        'status' => 'On Trip',
    ]);

    // Submit return checklist
    $this->post("/bookings/{$booking->id}/return", [
        'checklist' => [
            'kunci_kontak' => 'OK',
            'body_depan' => 'Baik',
        ],
        'km_out' => 5000,
        'fuel_out' => 80,
    ]);

    $log = ActivityLog::where('subject_type', 'Car')
        ->where('subject_id', $car->id)
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->description)->toContain('melalui "Unit Kembali"');
});

test('super admin can delete activity logs by period or date range', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    $this->actingAs($superAdmin);

    // Create logs with various dates
    ActivityLog::create([
        'user_name' => 'Old Log',
        'action' => 'created',
        'description' => 'Log 40 hari lalu',
        'created_at' => now()->subDays(40),
    ]);
    ActivityLog::create([
        'user_name' => 'Month Log',
        'action' => 'created',
        'description' => 'Log 20 hari lalu',
        'created_at' => now()->subDays(20),
    ]);
    ActivityLog::create([
        'user_name' => 'Week Log',
        'action' => 'created',
        'description' => 'Log 5 hari lalu',
        'created_at' => now()->subDays(5),
    ]);
    ActivityLog::create([
        'user_name' => 'Today Log',
        'action' => 'created',
        'description' => 'Log hari ini',
        'created_at' => now(),
    ]);

    // 1. Delete 1 week logs
    $response = $this->delete(route('activity-logs.destroy'), [
        'period' => '1_week',
    ]);
    $response->assertRedirect(route('activity-logs.index'));

    expect(ActivityLog::where('description', 'Log hari ini')->exists())->toBeFalse();
    expect(ActivityLog::where('description', 'Log 5 hari lalu')->exists())->toBeFalse();
    expect(ActivityLog::where('description', 'Log 20 hari lalu')->exists())->toBeTrue();
    expect(ActivityLog::where('description', 'Log 40 hari lalu')->exists())->toBeTrue();

    // 2. Delete with custom range
    $this->delete(route('activity-logs.destroy'), [
        'period' => 'custom',
        'start_date' => now()->subDays(25)->toDateString(),
        'end_date' => now()->subDays(15)->toDateString(),
    ]);

    expect(ActivityLog::where('description', 'Log 20 hari lalu')->exists())->toBeFalse();
    expect(ActivityLog::where('description', 'Log 40 hari lalu')->exists())->toBeTrue();
});

test('api endpoint can delete activity logs for super admin', function () {
    $superAdmin = User::factory()->create(['roles' => ['Super Admin']]);
    Sanctum::actingAs($superAdmin);

    ActivityLog::create([
        'user_name' => 'API Test Log',
        'action' => 'created',
        'description' => 'Log to delete via API',
        'created_at' => now()->subDays(2),
    ]);

    $response = $this->deleteJson('/api/v1/activity-logs', [
        'period' => '1_week',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);

    expect(ActivityLog::where('description', 'Log to delete via API')->exists())->toBeFalse();
});
