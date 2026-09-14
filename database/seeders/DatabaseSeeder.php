<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed users with roles
        User::factory()->create([
            'name' => 'Super Administrator',
            'username' => 'superadmin',
            'email' => 'superadmin@rentcars.com',
            'password' => Hash::make('password'),
            'roles' => ['Super Admin'],
        ]);

        User::factory()->create([
            'name' => 'Admin Unit',
            'username' => 'admin',
            'email' => 'admin@rentcars.com',
            'password' => Hash::make('password'),
            'roles' => ['Admin'],
        ]);

        User::factory()->create([
            'name' => 'Marketing Officer',
            'username' => 'marketing',
            'email' => 'marketing@rentcars.com',
            'password' => Hash::make('password'),
            'roles' => ['Marketing'],
        ]);

        User::factory()->create([
            'name' => 'Peluncur Field',
            'username' => 'peluncur',
            'email' => 'peluncur@rentcars.com',
            'password' => Hash::make('password'),
            'roles' => ['Peluncur'],
        ]);

        User::factory()->create([
            'name' => 'Petugas Cuci Cleaner',
            'username' => 'cuci',
            'email' => 'cuci@rentcars.com',
            'password' => Hash::make('password'),
            'roles' => ['Petugas Cuci'],
        ]);

        // Seed drivers
        Driver::create(['name' => 'Budi Santoso', 'phone' => '08111111111', 'sim' => 'A1234567', 'address' => 'Jakarta Selatan', 'status' => 'Active', 'daily_rate' => 200000]);
        Driver::create(['name' => 'Slamet Riyadi', 'phone' => '08222222222', 'sim' => 'B2345678', 'address' => 'Jakarta Barat', 'status' => 'Active', 'daily_rate' => 200000]);
        Driver::create(['name' => 'Agus Prasetyo', 'phone' => '08333333333', 'sim' => 'C3456789', 'address' => 'Depok', 'status' => 'Active', 'daily_rate' => 175000]);

        // Seed cars
        Car::create(['name' => 'Toyota Avanza', 'brand' => 'Toyota', 'model' => 'Avanza', 'type' => 'MPV', 'year' => 2022, 'plate_number' => 'B 1234 ABC', 'color' => 'Putih', 'transmission' => 'Manual', 'fuel_type' => 'Bensin', 'passenger_capacity' => 7, 'last_km' => 45000, 'daily_price' => 350000, 'weekly_price' => 2100000, 'monthly_price' => 7500000, 'status' => 'Ready']);
        Car::create(['name' => 'Daihatsu Xenia', 'brand' => 'Daihatsu', 'model' => 'Xenia', 'type' => 'MPV', 'year' => 2021, 'plate_number' => 'B 5678 DEF', 'color' => 'Silver', 'transmission' => 'Automatic', 'fuel_type' => 'Bensin', 'passenger_capacity' => 7, 'last_km' => 62000, 'daily_price' => 320000, 'weekly_price' => 1900000, 'monthly_price' => 6800000, 'status' => 'Ready']);
        Car::create(['name' => 'Toyota Innova', 'brand' => 'Toyota', 'model' => 'Innova', 'type' => 'MPV', 'year' => 2023, 'plate_number' => 'B 9012 GHI', 'color' => 'Hitam', 'transmission' => 'Automatic', 'fuel_type' => 'Diesel', 'passenger_capacity' => 7, 'last_km' => 28000, 'daily_price' => 550000, 'weekly_price' => 3300000, 'monthly_price' => 12000000, 'status' => 'Ready']);
        Car::create(['name' => 'Toyota Alphard', 'brand' => 'Toyota', 'model' => 'Alphard', 'type' => 'MPV', 'year' => 2024, 'plate_number' => 'B 3456 JKL', 'color' => 'Putih', 'transmission' => 'Automatic', 'fuel_type' => 'Bensin', 'passenger_capacity' => 7, 'last_km' => 12000, 'daily_price' => 1500000, 'weekly_price' => 9000000, 'monthly_price' => 32000000, 'status' => 'Ready']);
        Car::create(['name' => 'Toyota Fortuner', 'brand' => 'Toyota', 'model' => 'Fortuner', 'type' => 'SUV', 'year' => 2023, 'plate_number' => 'B 7890 MNO', 'color' => 'Hitam', 'transmission' => 'Automatic', 'fuel_type' => 'Diesel', 'passenger_capacity' => 7, 'last_km' => 35000, 'daily_price' => 800000, 'weekly_price' => 4800000, 'monthly_price' => 18000000, 'status' => 'Not Ready']);
        Car::create(['name' => 'Honda Civic', 'brand' => 'Honda', 'model' => 'Civic', 'type' => 'Sedan', 'year' => 2022, 'plate_number' => 'B 2468 PQR', 'color' => 'Merah', 'transmission' => 'Automatic', 'fuel_type' => 'Bensin', 'passenger_capacity' => 5, 'last_km' => 55000, 'daily_price' => 500000, 'weekly_price' => 3000000, 'monthly_price' => 11000000, 'status' => 'Belum Dicuci']);

        // Seed customers
        Customer::create(['name' => 'John Doe', 'nik' => '3175012345670001', 'phone' => '08123456789', 'email' => 'john@example.com', 'address' => 'Sudirman St. No. 12, Jakarta', 'emergency_contact' => '08111222333']);
        Customer::create(['name' => 'Jane Smith', 'nik' => '3275056789010002', 'phone' => '08234567890', 'email' => 'jane@example.com', 'address' => 'Dago St. No. 45, Bandung', 'emergency_contact' => '08444555666']);
        Customer::create(['name' => 'Bob Johnson', 'nik' => '3578034567890003', 'phone' => '08345678901', 'email' => 'bob@example.com', 'address' => 'Manyar St. No. 78, Surabaya', 'emergency_contact' => '08777888999']);
    }
}
