<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Car;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Car
 */
class CarResource extends JsonResource
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
            'name' => $this->name,
            'brand' => $this->brand,
            'model' => $this->model,
            'type' => $this->type,
            'year' => $this->year,
            'plate_number' => $this->plate_number,
            'color' => $this->color,
            'transmission' => $this->transmission,
            'fuel_type' => $this->fuel_type,
            'passenger_capacity' => $this->passenger_capacity,
            'chassis_number' => $this->chassis_number,
            'engine_number' => $this->engine_number,
            'initial_km' => $this->initial_km ?? 0,
            'last_km' => $this->last_km ?? 0,
            'next_service_km' => $this->next_service_km,
            'km_until_service' => $this->km_until_service,
            'is_service_due' => $this->isServiceDue(),
            'daily_price' => (float) $this->daily_price,
            'weekly_price' => (float) $this->weekly_price,
            'monthly_price' => (float) $this->monthly_price,
            'photo' => $this->photo,
            'photo_url' => $this->photo ? Storage::url($this->photo) : null,
            'owner_partner' => $this->owner_partner,
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
