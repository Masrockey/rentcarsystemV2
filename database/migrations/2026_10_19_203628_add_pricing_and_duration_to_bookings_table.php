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
            $table->decimal('price', 15, 2)->nullable()->after('rental_type');
            $table->string('duration_type')->default('24 Jam')->after('price');
            $table->integer('duration_days')->default(1)->after('return_time');
            $table->decimal('delivery_fee', 15, 2)->default(0)->after('payment_method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['price', 'duration_type', 'duration_days', 'delivery_fee']);
        });
    }
};
