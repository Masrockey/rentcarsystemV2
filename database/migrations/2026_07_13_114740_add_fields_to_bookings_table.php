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
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('booking_number')->unique()->nullable()->after('id');
            $table->date('start_date')->nullable()->after('booking_date');
            $table->string('pickup_location')->nullable()->after('return_date');
            $table->string('dropoff_location')->nullable()->after('pickup_location');
            $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete()->after('peluncur_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['driver_id']);
            $table->dropColumn(['booking_number', 'start_date', 'pickup_location', 'dropoff_location', 'driver_id']);
        });
    }
};
