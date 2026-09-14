<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Rental;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Rental
 */
class RentalResource extends JsonResource
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
            'contract_number' => $this->contract_number,
            'booking_id' => $this->booking_id,
            'car_id' => $this->car_id,
            'customer_id' => $this->customer_id,
            'officer_id' => $this->officer_id,
            'checkout_datetime' => $this->checkout_datetime?->toIso8601String(),
            'checkin_datetime' => $this->checkin_datetime?->toIso8601String(),
            'handover_location' => $this->handover_location,
            'km_out' => $this->km_out,
            'fuel_out' => $this->fuel_out,
            'fuel_range_km' => $this->fuel_range_km,
            'km_in' => $this->km_in,
            'fuel_in' => $this->fuel_in,
            'fine_amount' => (float) $this->fine_amount,
            'total_payment' => (float) $this->total_payment,
            'status' => $this->status,
            'tenant_signature' => $this->tenant_signature,
            'officer_signature' => $this->officer_signature,
            'car' => new CarResource($this->whenLoaded('car')),
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'officer' => new UserResource($this->whenLoaded('officer')),
            'booking' => new BookingResource($this->whenLoaded('booking')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

