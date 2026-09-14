<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Payment
 */
class PaymentResource extends JsonResource
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
            'invoice_number' => $this->invoice_number,
            'booking_id' => $this->booking_id,
            'payment_method' => $this->payment_method,
            'dp_amount' => (float) $this->dp_amount,
            'settlement_amount' => (float) $this->settlement_amount,
            'total_amount' => (float) $this->total_amount,
            'status' => $this->status,
            'transfer_proof' => $this->transfer_proof,
            'transfer_proof_url' => $this->transfer_proof ? Storage::url($this->transfer_proof) : null,
            'booking' => new BookingResource($this->whenLoaded('booking')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
