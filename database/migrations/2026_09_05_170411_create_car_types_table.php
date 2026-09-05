<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('car_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->nullable();
            $table->string('category')->nullable(); // Jenis mobil
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Seed initial default car types
        $defaultCarTypes = [
            ['name' => 'Avanza', 'type' => 'MPV', 'category' => 'Mobil Keluarga'],
            ['name' => 'Innova', 'type' => 'Medium MPV', 'category' => 'Mobil Keluarga Premium'],
            ['name' => 'Brio', 'type' => 'Hatchback', 'category' => 'City Car'],
            ['name' => 'Xpander', 'type' => 'MPV', 'category' => 'Mobil Keluarga'],
            ['name' => 'Fortuner', 'type' => 'High SUV', 'category' => 'SUV Tangguh'],
            ['name' => 'Alphard', 'type' => 'Luxury MPV', 'category' => 'Premium & VIP'],
            ['name' => 'Calya', 'type' => 'LCGC MPV', 'category' => 'Mobil Keluarga Hemat'],
            ['name' => 'Hiace', 'type' => 'Minibus / Van', 'category' => 'Komersial & Rombongan'],
            ['name' => 'Ertiga', 'type' => 'MPV', 'category' => 'Mobil Keluarga'],
            ['name' => 'Yaris', 'type' => 'Hatchback', 'category' => 'City Car'],
            ['name' => 'HR-V', 'type' => 'Compact SUV', 'category' => 'Crossover'],
            ['name' => 'CR-V', 'type' => 'Medium SUV', 'category' => 'SUV Premium'],
            ['name' => 'Pajero Sport', 'type' => 'High SUV', 'category' => 'SUV Tangguh'],
            ['name' => 'Mini Bus', 'type' => 'Minibus', 'category' => 'Komersial & Wisata'],
        ];

        $now = now();
        foreach ($defaultCarTypes as &$item) {
            $item['created_at'] = $now;
            $item['updated_at'] = $now;
        }

        DB::table('car_types')->insert($defaultCarTypes);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('car_types');
    }
};
