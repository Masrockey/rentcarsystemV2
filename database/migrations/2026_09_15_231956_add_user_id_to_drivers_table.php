<?php

use App\Models\Driver;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });

        // Automatically create & associate User accounts for any existing drivers
        $drivers = Driver::whereNull('user_id')->get();
        foreach ($drivers as $driver) {
            $baseUsername = Str::slug($driver->name, '_');
            if (empty($baseUsername)) {
                $baseUsername = 'driver_'.$driver->id;
            }

            $username = $baseUsername;
            $counter = 1;
            while (User::where('username', $username)->exists()) {
                $username = $baseUsername.'_'.$counter;
                $counter++;
            }

            $baseEmail = $username.'@driver.rentcars.com';
            $email = $baseEmail;
            $emailCounter = 1;
            while (User::where('email', $email)->exists()) {
                $email = $username.'_'.$emailCounter.'@driver.rentcars.com';
                $emailCounter++;
            }

            $user = User::create([
                'name' => $driver->name,
                'username' => $username,
                'email' => $email,
                'phone' => $driver->phone,
                'password' => Hash::make('password'),
                'roles' => ['Driver'],
            ]);

            $driver->updateQuietly(['user_id' => $user->id]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
