<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'contract_number', 'booking_id', 'car_id', 'customer_id', 'officer_id',
    'checkout_datetime', 'checkin_datetime', 'handover_location',
    'km_out', 'fuel_out', 'fuel_range_km', 'km_in', 'fuel_in',
    'fine_amount', 'total_payment', 'status',
    'tenant_signature', 'officer_signature',
])]
class Rental extends Model
{
    use HasFactory, LogsActivity;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'checkout_datetime' => 'datetime',
            'checkin_datetime' => 'datetime',
            'fine_amount' => 'decimal:2',
            'total_payment' => 'decimal:2',
            'km_out' => 'integer',
            'fuel_out' => 'integer',
            'fuel_range_km' => 'integer',
            'km_in' => 'integer',
            'fuel_in' => 'integer',
        ];
    }

    /**
     * Get the booking for this rental.
     *
     * @return BelongsTo<Booking, $this>
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Get the car for this rental.
     *
     * @return BelongsTo<Car, $this>
     */
    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class);
    }

    /**
     * Get the customer for this rental.
     *
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the officer who handled this rental.
     *
     * @return BelongsTo<User, $this>
     */
    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_id');
    }
}
