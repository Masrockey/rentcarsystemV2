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
        Schema::create('rentals', function (Blueprint $table) {
            $table->id();
            $table->string('contract_number')->unique();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->foreignId('car_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('officer_id')->constrained('users');
            $table->dateTime('checkout_datetime')->nullable();
            $table->dateTime('checkin_datetime')->nullable();
            $table->string('handover_location')->nullable();
            $table->integer('km_out')->default(0);
            $table->integer('fuel_out')->default(100);
            $table->integer('km_in')->nullable();
            $table->integer('fuel_in')->nullable();
            $table->decimal('fine_amount', 15, 2)->default(0);
            $table->decimal('total_payment', 15, 2)->default(0);
            $table->string('status')->default('Active');
            $table->text('tenant_signature')->nullable();
            $table->text('officer_signature')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rentals');
    }
};
