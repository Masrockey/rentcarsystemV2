<?php

namespace App\Http\Resources\Api\V1;

use App\Models\VehicleTax;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin VehicleTax
 */
class VehicleTaxResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'car_id' => $this->car_id,
            'stnk_number' => $this->stnk_number,
            'valid_until' => $this->valid_until?->format('Y-m-d') ?? ($this->valid_until ? substr((string) $this->valid_until, 0, 10) : null),
            'annual_tax' => (float) $this->annual_tax,
            'five_year_tax' => (float) $this->five_year_tax,
            'reminder_date' => $this->reminder_date?->format('Y-m-d') ?? ($this->reminder_date ? substr((string) $this->reminder_date, 0, 10) : null),
            'notes' => $this->notes,
            'car' => new CarResource($this->whenLoaded('car')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
