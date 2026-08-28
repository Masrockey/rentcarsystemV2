<?php

use App\Models\Blacklist;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('authenticated user can view blacklists index', function () {
    $user = User::factory()->create(['roles' => ['Admin']]);

    Blacklist::create([
        'name' => 'Budi Santoso',
        'phone' => '081299998888',
        'nik' => '3201010101010001',
        'address' => 'Jakarta Selatan',
        'incident_date' => '2026-08-01',
        'perpetrator_info' => 'Membawa kabur unit lepas kunci',
        'blacklisted_by' => 'Cabang Jakarta',
        'report_date' => '2026-08-02',
    ]);

    $response = $this->actingAs($user)->get(route('blacklists.index'));

    $response->assertOk();
});

test('user can create a blacklist entry with evidence photo', function () {
    Storage::fake('public');
    $user = User::factory()->create(['roles' => ['Admin']]);

    $photo = UploadedFile::fake()->image('evidance.jpg');

    $response = $this->actingAs($user)->post(route('blacklists.store'), [
        'name' => 'Joko Widodo',
        'phone' => '081377776666',
        'nik' => '5101010101010002',
        'address' => 'Denpasar, Bali',
        'incident_date' => '2026-08-10',
        'perpetrator_info' => 'BBM kosong & bodi lecet parah tidak mau ganti rugi',
        'blacklisted_by' => 'Rental Bali Center',
        'report_date' => '2026-08-11',
        'evidence_photos' => [$photo],
    ]);

    $response->assertRedirect(route('blacklists.index'));

    $this->assertDatabaseHas('blacklists', [
        'name' => 'Joko Widodo',
        'phone' => '081377776666',
        'nik' => '5101010101010002',
        'blacklisted_by' => 'Rental Bali Center',
    ]);
});

test('user can bulk import blacklists from excel data rows', function () {
    $user = User::factory()->create(['roles' => ['Admin']]);

    $rows = [
        [
            'name' => 'Siti Nurhaliza',
            'phone' => '081555554444',
            'nik' => '3301010101010003',
            'address' => 'Bandung, Jawa Barat',
            'incident_date' => '2026-08-01',
            'perpetrator_info' => 'Penggelapan unit lepas kunci',
            'blacklisted_by' => 'Cabang Bandung',
            'report_date' => '2026-08-02',
        ],
        [
            'name' => 'Rudi Salam',
            'phone' => '081666667777',
            'nik' => '3401010101010004',
            'address' => 'Surabaya, Jawa Timur',
            'incident_date' => '2026-08-05',
            'perpetrator_info' => 'Menunggak sewa 2 bulan',
            'blacklisted_by' => 'Cabang Surabaya',
            'report_date' => '2026-08-06',
        ],
    ];

    $response = $this->actingAs($user)->post(route('blacklists.import'), [
        'rows' => $rows,
    ]);

    $response->assertRedirect(route('blacklists.index'));

    $this->assertDatabaseHas('blacklists', [
        'name' => 'Siti Nurhaliza',
        'phone' => '081555554444',
    ]);

    $this->assertDatabaseHas('blacklists', [
        'name' => 'Rudi Salam',
        'phone' => '081666667777',
    ]);
});

test('marketing role cannot create or import blacklists', function () {
    $marketing = User::factory()->create(['roles' => ['Marketing']]);

    $response = $this->actingAs($marketing)->post(route('blacklists.store'), [
        'name' => 'Bad Consumer',
        'phone' => '0811111111',
    ]);

    $response->assertForbidden();

    $importResponse = $this->actingAs($marketing)->post(route('blacklists.import'), [
        'rows' => [
            ['name' => 'Bad Consumer', 'phone' => '0811111111'],
        ],
    ]);

    $importResponse->assertForbidden();
});
