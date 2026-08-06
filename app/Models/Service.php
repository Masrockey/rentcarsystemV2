<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'car_id', 'service_date', 'workshop', 'service_type',
    'km', 'cost', 'next_service_date', 'notes',
])]
class Service extends Model
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
            'service_date' => 'date:Y-m-d',
            'next_service_date' => 'date:Y-m-d',
            'cost' => 'decimal:2',
            'km' => 'integer',
        ];
    }

    /**
     * Get the car that owns this service record.
     *
     * @return BelongsTo<Car, $this>
     */
    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class);
    }
}
