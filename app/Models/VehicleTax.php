<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'car_id', 'stnk_number', 'valid_until',
    'annual_tax', 'five_year_tax', 'reminder_date', 'notes',
])]
class VehicleTax extends Model
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
            'valid_until' => 'date:Y-m-d',
            'reminder_date' => 'date:Y-m-d',
            'annual_tax' => 'decimal:2',
            'five_year_tax' => 'decimal:2',
        ];
    }

    /**
     * Get the car that owns this tax record.
     *
     * @return BelongsTo<Car, $this>
     */
    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class);
    }
}
