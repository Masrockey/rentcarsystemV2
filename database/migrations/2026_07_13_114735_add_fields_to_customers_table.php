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
        Schema::table('customers', function (Blueprint $table) {
            $table->string('nik', 20)->nullable()->after('name');
            $table->string('sim_number')->nullable()->after('nik');
            $table->date('sim_expiry')->nullable()->after('sim_number');
            $table->string('ktp_photo')->nullable()->after('sim_expiry');
            $table->string('sim_photo')->nullable()->after('ktp_photo');
            $table->string('selfie_photo')->nullable()->after('sim_photo');
            $table->string('emergency_contact')->nullable()->after('selfie_photo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'nik', 'sim_number', 'sim_expiry',
                'ktp_photo', 'sim_photo', 'selfie_photo', 'emergency_contact',
            ]);
        });
    }
};
