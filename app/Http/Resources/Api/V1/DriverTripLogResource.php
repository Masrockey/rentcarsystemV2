<?php

namespace App\Http\Resources\Api\V1;

use App\Models\DriverTripLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin DriverTripLog
 */
class DriverTripLogResource extends JsonResource
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
            'booking_id' => $this->booking_id,
            'driver_id' => $this->driver_id,
            'user_id' => $this->user_id,
            'driver_name' => $this->driver?->name,
            'location_name' => $this->location_name,
            'stop_order' => $this->stop_order,
            'status' => $this->status,

            // Check-in
            'checkin_at' => $this->checkin_at?->toIso8601String(),
            'checkin_at_formatted' => $this->checkin_at?->format('d/m/Y H:i'),
            'checkin_latitude' => $this->checkin_latitude,
            'checkin_longitude' => $this->checkin_longitude,
            'checkin_notes' => $this->checkin_notes,
            'checkin_photo' => $this->checkin_photo,
            'checkin_photo_url' => $this->checkin_photo ? Storage::url($this->checkin_photo) : null,
            'checkin_map_url' => ($this->checkin_latitude && $this->checkin_longitude)
                ? "https://www.openstreetmap.org/?mlat={$this->checkin_latitude}&mlon={$this->checkin_longitude}#map=16/{$this->checkin_latitude}/{$this->checkin_longitude}"
                : null,

            // Check-out
            'checkout_at' => $this->checkout_at?->toIso8601String(),
            'checkout_at_formatted' => $this->checkout_at?->format('d/m/Y H:i'),
            'checkout_latitude' => $this->checkout_latitude,
            'checkout_longitude' => $this->checkout_longitude,
            'checkout_notes' => $this->checkout_notes,
            'checkout_photo' => $this->checkout_photo,
            'checkout_photo_url' => $this->checkout_photo ? Storage::url($this->checkout_photo) : null,
            'checkout_map_url' => ($this->checkout_latitude && $this->checkout_longitude)
                ? "https://www.openstreetmap.org/?mlat={$this->checkout_latitude}&mlon={$this->checkout_longitude}#map=16/{$this->checkout_latitude}/{$this->checkout_longitude}"
                : null,

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
