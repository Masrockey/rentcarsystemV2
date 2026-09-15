<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'booking_id',
    'driver_id',
    'user_id',
    'location_name',
    'stop_order',
    'checkin_at',
    'checkin_latitude',
    'checkin_longitude',
    'checkin_notes',
    'checkin_photo',
    'checkout_at',
    'checkout_latitude',
    'checkout_longitude',
    'checkout_notes',
    'checkout_photo',
    'status',
])]
class DriverTripLog extends Model
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
            'stop_order' => 'integer',
            'checkin_at' => 'datetime',
            'checkout_at' => 'datetime',
            'checkin_latitude' => 'float',
            'checkin_longitude' => 'float',
            'checkout_latitude' => 'float',
            'checkout_longitude' => 'float',
        ];
    }

    /**
     * Get the booking associated with this trip log.
     *
     * @return BelongsTo<Booking, $this>
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Get the driver associated with this trip log.
     *
     * @return BelongsTo<Driver, $this>
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    /**
     * Get the user that recorded this trip log.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
