<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard can be filtered by preset and custom date range', function () {
    $user = User::factory()->create(['roles' => ['Super Admin']]);
    $this->actingAs($user);

    // Filter by preset
    $response = $this->get(route('dashboard', ['preset' => 'today']));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('filters')
        ->where('filters.preset', 'today')
        ->where('filters.is_filtered', true)
    );

    // Filter by custom date
    $response = $this->get(route('dashboard', [
        'start_date' => '2026-09-01',
        'end_date' => '2026-09-10',
    ]));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('filters')
        ->where('filters.start_date', '2026-09-01')
        ->where('filters.end_date', '2026-09-10')
        ->where('filters.is_filtered', true)
    );
});
