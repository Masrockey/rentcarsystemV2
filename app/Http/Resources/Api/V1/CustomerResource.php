<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Customer
 */
class CustomerResource extends JsonResource
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
            'user_id' => $this->user_id,
            'name' => $this->name,
            'nik' => $this->nik,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'sim_number' => $this->sim_number,
            'sim_expiry' => $this->sim_expiry?->format('Y-m-d') ?? ($this->sim_expiry ? substr((string) $this->sim_expiry, 0, 10) : null),
            'emergency_contact' => $this->emergency_contact,
            'ktp_photo' => $this->ktp_photo,
            'ktp_photo_url' => $this->ktp_photo ? Storage::url($this->ktp_photo) : null,
            'sim_photo' => $this->sim_photo,
            'sim_photo_url' => $this->sim_photo ? Storage::url($this->sim_photo) : null,
            'selfie_photo' => $this->selfie_photo,
            'selfie_photo_url' => $this->selfie_photo ? Storage::url($this->selfie_photo) : null,
            'marketing' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
