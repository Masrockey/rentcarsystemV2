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
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('car_type');
            $table->foreignId('car_id')->nullable()->constrained('cars')->nullOnDelete();
            $table->foreignId('peluncur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('petugas_cuci_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('booking_date');
            $table->date('return_date')->nullable();
            $table->string('payment_method');
            $table->string('payment_status')->default('Pending');
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('status')->default('Pending');
            $table->json('delivery_checklist')->nullable();
            $table->string('delivery_latitude')->nullable();
            $table->string('delivery_longitude')->nullable();
            $table->text('delivery_notes')->nullable();
            $table->json('return_checklist')->nullable();
            $table->text('return_notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
