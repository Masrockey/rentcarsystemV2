<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name', 'brand', 'model', 'type', 'year', 'plate_number', 'color',
    'transmission', 'fuel_type', 'passenger_capacity', 'chassis_number',
    'engine_number', 'initial_km', 'last_km', 'daily_price', 'weekly_price', 'monthly_price',
    'photo', 'owner_partner', 'status',
])]
class Car extends Model
{
    use HasFactory, LogsActivity;

    public const SERVICE_INTERVAL_KM = 10000;

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'is_service_due',
        'next_service_km',
        'km_until_service',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function (Car $car) {
            if (! isset($car->attributes['initial_km']) || $car->initial_km === null) {
                $car->initial_km = $car->last_km ?? 0;
            }
        });
    }

    /**
     * Check if the car is currently due for service.
     */
    public function isServiceDue(): bool
    {
        return $this->last_km >= (($this->initial_km ?? 0) + self::SERVICE_INTERVAL_KM);
    }

    /**
     * Accessor for is_service_due.
     */
    public function getIsServiceDueAttribute(): bool
    {
        return $this->isServiceDue();
    }

    /**
     * Get the KM milestone at which the next service is required.
     */
    public function getNextServiceKmAttribute(): int
    {
        return ($this->initial_km ?? 0) + self::SERVICE_INTERVAL_KM;
    }

    /**
     * Get the remaining KM before the next service is required.
     */
    public function getKmUntilServiceAttribute(): int
    {
        return max(0, $this->next_service_km - ($this->last_km ?? 0));
    }

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
            'initial_km' => 'integer',
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
