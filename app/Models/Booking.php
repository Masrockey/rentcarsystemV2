<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'user_id',
    'booking_number',
    'customer_id',
    'car_type',
    'rental_type',
    'car_id',
    'peluncur_id',
    'petugas_cuci_id',
    'driver_id',
    'booking_date',
    'start_date',
    'return_date',
    'pickup_location',
    'dropoff_location',
    'payment_method',
    'payment_status',
    'amount',
    'status',
    'delivery_checklist',
    'delivery_latitude',
    'delivery_longitude',
    'delivery_notes',
    'return_checklist',
    'return_notes',
])]
class Booking extends Model
{
    use HasFactory;

    /**
     * Get the user that created the booking.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'booking_date' => 'date:Y-m-d',
            'start_date' => 'date:Y-m-d',
            'return_date' => 'date:Y-m-d',
            'delivery_checklist' => 'array',
            'return_checklist' => 'array',
            'amount' => 'decimal:2',
        ];
    }

    /**
     * Get the customer that owns the booking.
     *
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the car assigned to the booking.
     *
     * @return BelongsTo<Car, $this>
     */
    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class);
    }

    /**
     * Get the peluncur officer assigned to the booking.
     *
     * @return BelongsTo<User, $this>
     */
    public function peluncur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'peluncur_id');
    }

    /**
     * Get the wash officer assigned to the booking.
     *
     * @return BelongsTo<User, $this>
     */
    public function petugasCuci(): BelongsTo
    {
        return $this->belongsTo(User::class, 'petugas_cuci_id');
    }

    /**
     * Get the driver assigned to the booking.
     *
     * @return BelongsTo<Driver, $this>
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    /**
     * Get the payment for this booking.
     *
     * @return HasOne<Payment, $this>
     */
    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    /**
     * Get the rentals for this booking.
     *
     * @return HasMany<Rental, $this>
     */
    public function rentals(): HasMany
    {
        return $this->hasMany(Rental::class);
    }
}
