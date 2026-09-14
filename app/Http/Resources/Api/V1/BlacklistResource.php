<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Blacklist;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Blacklist
 */
class BlacklistResource extends JsonResource
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
            'phone' => $this->phone,
            'nik' => $this->nik,
            'address' => $this->address,
            'incident_date' => $this->incident_date?->format('Y-m-d') ?? ($this->incident_date ? substr((string) $this->incident_date, 0, 10) : null),
            'perpetrator_info' => $this->perpetrator_info,
            'blacklisted_by' => $this->blacklisted_by,
            'report_date' => $this->report_date?->format('Y-m-d') ?? ($this->report_date ? substr((string) $this->report_date, 0, 10) : null),
            'evidence_photos' => $this->evidence_photos ?? [],
            'created_by' => $this->created_by,
            'creator' => new UserResource($this->whenLoaded('creator')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

