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
            $table->integer('fuel_range_km')->nullable()->after('delivery_checklist');
        });

        Schema::table('rentals', function (Blueprint $table) {
            $table->integer('fuel_range_km')->nullable()->after('fuel_out');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('fuel_range_km');
        });

        Schema::table('rentals', function (Blueprint $table) {
            $table->dropColumn('fuel_range_km');
        });
    }
};
