<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->string('brand')->nullable()->after('name');
            $table->string('model')->nullable()->after('brand');
            $table->string('type')->nullable()->after('model');
            $table->string('color')->nullable()->after('type');
            $table->string('transmission')->default('Manual')->after('color');
            $table->string('fuel_type')->default('Bensin')->after('transmission');
            $table->integer('passenger_capacity')->default(4)->after('fuel_type');
            $table->string('chassis_number')->nullable()->after('passenger_capacity');
            $table->string('engine_number')->nullable()->after('chassis_number');
            $table->integer('last_km')->default(0)->after('engine_number');
            $table->decimal('daily_price', 15, 2)->default(0)->after('last_km');
            $table->decimal('weekly_price', 15, 2)->default(0)->after('daily_price');
            $table->decimal('monthly_price', 15, 2)->default(0)->after('weekly_price');
            $table->string('photo')->nullable()->after('monthly_price');
            $table->string('owner_partner')->nullable()->after('photo');
            // Add 'Service' to allowed statuses (handled at app level)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->dropColumn([
                'brand', 'model', 'type', 'color', 'transmission', 'fuel_type',
                'passenger_capacity', 'chassis_number', 'engine_number', 'last_km',
                'daily_price', 'weekly_price', 'monthly_price', 'photo', 'owner_partner',
            ]);
        });
    }
};
