<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Service
 */
class ServiceResource extends JsonResource
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
            'service_date' => $this->service_date?->format('Y-m-d') ?? ($this->service_date ? substr((string) $this->service_date, 0, 10) : null),
            'workshop' => $this->workshop,
            'service_type' => $this->service_type,
            'km' => $this->km,
            'cost' => (float) $this->cost,
            'next_service_date' => $this->next_service_date?->format('Y-m-d') ?? ($this->next_service_date ? substr((string) $this->next_service_date, 0, 10) : null),
            'notes' => $this->notes,
            'car' => new CarResource($this->whenLoaded('car')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
