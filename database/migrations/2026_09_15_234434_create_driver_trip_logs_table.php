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
        Schema::create('driver_trip_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('location_name');
            $table->unsignedInteger('stop_order')->default(1);

            // Check-in data
            $table->dateTime('checkin_at');
            $table->decimal('checkin_latitude', 10, 7)->nullable();
            $table->decimal('checkin_longitude', 10, 7)->nullable();
            $table->text('checkin_notes')->nullable();
            $table->string('checkin_photo')->nullable();

            // Check-out data
            $table->dateTime('checkout_at')->nullable();
            $table->decimal('checkout_latitude', 10, 7)->nullable();
            $table->decimal('checkout_longitude', 10, 7)->nullable();
            $table->text('checkout_notes')->nullable();
            $table->string('checkout_photo')->nullable();

            $table->string('status')->default('Checked In'); // 'Checked In', 'Checked Out'
            $table->timestamps();

            $table->index(['booking_id', 'stop_order']);
            $table->index(['driver_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('driver_trip_logs');
    }
};
