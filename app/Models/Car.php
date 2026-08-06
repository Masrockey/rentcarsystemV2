<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name', 'brand', 'model', 'type', 'year', 'plate_number', 'color',
    'transmission', 'fuel_type', 'passenger_capacity', 'chassis_number',
    'engine_number', 'last_km', 'daily_price', 'weekly_price', 'monthly_price',
    'photo', 'owner_partner', 'status',
])]
class Car extends Model
{
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'daily_price' => 'decimal:2',
            'weekly_price' => 'decimal:2',
            'monthly_price' => 'decimal:2',
            'last_km' => 'integer',
            'passenger_capacity' => 'integer',
            'year' => 'integer',
        ];
    }

    /**
     * Get the bookings for the car.
     *
     * @return HasMany<Booking, $this>
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Get the services for the car.
     *
     * @return HasMany<Service, $this>
     */
    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    /**
     * Get the insurances for the car.
     *
     * @return HasMany<Insurance, $this>
     */
    public function insurances(): HasMany
    {
        return $this->hasMany(Insurance::class);
    }

    /**
     * Get the vehicle taxes for the car.
     *
     * @return HasMany<VehicleTax, $this>
     */
    public function vehicleTaxes(): HasMany
    {
        return $this->hasMany(VehicleTax::class);
    }

    /**
     * Get the rentals for the car.
     *
     * @return HasMany<Rental, $this>
     */
    public function rentals(): HasMany
    {
        return $this->hasMany(Rental::class);
    }
}
