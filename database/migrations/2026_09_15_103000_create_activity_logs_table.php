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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('user_role')->nullable();
            $table->string('action'); // created, updated, deleted, login, logout, failed_login, delivery, return, wash, cancel, etc.
            $table->string('subject_type')->nullable(); // Booking, Rental, Customer, Car, Payment, User, etc.
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('subject_label')->nullable(); // e.g. "Booking BK-20260915-XYZ"
            $table->text('description');
            $table->json('properties')->nullable(); // changes, diff, old/new attributes
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['subject_type', 'subject_id']);
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};

