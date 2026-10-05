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
        Schema::table('wa_server_settings', function (Blueprint $table) {
            $table->string('target_group_jid')->nullable()->after('auto_reconnect');
            $table->string('target_group_name')->nullable()->after('target_group_jid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wa_server_settings', function (Blueprint $table) {
            $table->dropColumn(['target_group_jid', 'target_group_name']);
        });
    }
};
