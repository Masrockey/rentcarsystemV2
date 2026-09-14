<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Insurance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Insurance
 */
class InsuranceResource extends JsonResource
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
            'insurance_name' => $this->insurance_name,
            'policy_number' => $this->policy_number,
            'start_date' => $this->start_date?->format('Y-m-d') ?? ($this->start_date ? substr((string) $this->start_date, 0, 10) : null),
            'end_date' => $this->end_date?->format('Y-m-d') ?? ($this->end_date ? substr((string) $this->end_date, 0, 10) : null),
            'premium' => (float) $this->premium,
            'notes' => $this->notes,
            'car' => new CarResource($this->whenLoaded('car')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

