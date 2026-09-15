<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'name',
    'phone',
    'nik',
    'address',
    'incident_date',
    'perpetrator_info',
    'blacklisted_by',
    'report_date',
    'evidence_photos',
    'created_by',
])]
class Blacklist extends Model
{
    use HasFactory, LogsActivity;

    protected function casts(): array
    {
        return [
            'evidence_photos' => 'array',
            'incident_date' => 'date:Y-m-d',
            'report_date' => 'date:Y-m-d',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
