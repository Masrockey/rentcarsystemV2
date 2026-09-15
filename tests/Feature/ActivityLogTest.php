<?php

use App\Models\ActivityLog;
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
