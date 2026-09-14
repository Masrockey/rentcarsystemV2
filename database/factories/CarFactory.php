<?php

namespace Database\Factories;

use App\Models\Car;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Car>
 */
class CarFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['Toyota Avanza 1.3 G', 'Daihatsu Xenia 1.3 R', 'Honda Brio E', 'Mitsubishi Xpander Ultimate']),
            'brand' => fake()->randomElement(['Toyota', 'Daihatsu', 'Honda', 'Mitsubishi']),
            'model' => fake()->randomElement(['Avanza', 'Xenia', 'Brio', 'Xpander']),
            'type' => 'MPV',
            'year' => fake()->numberBetween(2020, 2024),
            'plate_number' => fake()->unique()->bothify('B #### ???'),
            'color' => fake()->safeColorName(),
            'transmission' => 'Manual',
            'fuel_type' => 'Bensin',
            'passenger_capacity' => 7,
            'initial_km' => 10000,
            'last_km' => 10000,
            'daily_price' => 350000,
            'weekly_price' => 2100000,
            'monthly_price' => 7500000,
            'status' => 'Ready',
        ];
    }
}
