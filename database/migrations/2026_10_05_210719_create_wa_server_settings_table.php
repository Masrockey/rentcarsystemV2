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
        Schema::create('wa_server_settings', function (Blueprint $table) {
            $table->id();
            $table->string('server_url')->default('http://localhost:3000');
            $table->string('device_id')->default('rentcars_main');
            $table->string('auth_username')->nullable();
            $table->string('auth_password')->nullable();
            $table->string('webhook_url')->nullable();
            $table->string('webhook_secret')->nullable();
            $table->boolean('auto_reconnect')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wa_server_settings');
    }
};
