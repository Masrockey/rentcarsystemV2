<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Booking
 */
class BookingResource extends JsonResource
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
            'booking_number' => $this->booking_number,
            'user_id' => $this->user_id,
            'customer_id' => $this->customer_id,
            'car_id' => $this->car_id,
            'driver_id' => $this->driver_id,
            'peluncur_id' => $this->peluncur_id,
            'petugas_cuci_id' => $this->petugas_cuci_id,
            'car_type' => $this->car_type,
            'rental_type' => $this->rental_type,
            'booking_date' => $this->booking_date?->format('Y-m-d') ?? ($this->booking_date ? substr((string) $this->booking_date, 0, 10) : null),
            'start_date' => $this->start_date?->format('Y-m-d') ?? ($this->start_date ? substr((string) $this->start_date, 0, 10) : null),
            'return_date' => $this->return_date?->format('Y-m-d') ?? ($this->return_date ? substr((string) $this->return_date, 0, 10) : null),
            'pickup_time' => $this->pickup_time ? substr((string) $this->pickup_time, 0, 5) : null,
            'return_time' => $this->return_time ? substr((string) $this->return_time, 0, 5) : null,
            'pickup_location' => $this->pickup_location,
            'dropoff_location' => $this->dropoff_location,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'amount' => (float) $this->amount,
            'status' => $this->status,
            'cancellation_reason' => $this->cancellation_reason,
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'fuel_range_km' => $this->fuel_range_km,
            'delivery_checklist' => $this->delivery_checklist,
            'delivery_latitude' => $this->delivery_latitude,
            'delivery_longitude' => $this->delivery_longitude,
            'delivery_notes' => $this->delivery_notes,
            'return_checklist' => $this->return_checklist,
            'return_latitude' => $this->return_latitude,
            'return_longitude' => $this->return_longitude,
            'return_notes' => $this->return_notes,
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'car' => new CarResource($this->whenLoaded('car')),
            'driver' => new DriverResource($this->whenLoaded('driver')),
            'marketing' => new UserResource($this->whenLoaded('user')),
            'peluncur' => new UserResource($this->whenLoaded('peluncur')),
            'petugas_cuci' => new UserResource($this->whenLoaded('petugasCuci')),
            'rental' => new RentalResource($this->whenLoaded('rental')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
