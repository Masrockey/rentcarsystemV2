<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\PaymentResource;
use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PaymentController extends BaseApiController
{
    private function checkAdmin(Request $request): void
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Akses ditolak. Menu Payments hanya dapat diakses oleh Admin Unit dan Super Admin.');
        }
    }

    /**
     * Display a listing of payments.
     */
    public function index(Request $request): JsonResponse
    {
        $this->checkAdmin($request);

        $perPage = (int) $request->query('per_page', 10);
        $payments = Payment::with('booking.customer')
            ->latest()
            ->paginate($perPage);

        return $this->sendResponse(
            PaymentResource::collection($payments),
            'Daftar pembayaran berhasil diambil.',
            200,
            [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ]
        );
    }

    /**
     * Store a newly created payment.
     */
    public function store(Request $request): JsonResponse
    {
        $this->checkAdmin($request);

        $validated = $request->validate([
            'booking_id' => ['required', 'exists:bookings,id'],
            'payment_method' => ['required', 'string', Rule::in(['Cash', 'Transfer', 'DP'])],
            'dp_amount' => ['required', 'numeric', 'min:0'],
            'settlement_amount' => ['required', 'numeric', 'min:0'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'string', Rule::in(['Pending', 'DP Dibayar', 'Lunas'])],
            'transfer_proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $transferProofPath = null;
        if ($request->hasFile('transfer_proof')) {
            $transferProofPath = $request->file('transfer_proof')->store('payments', 'public');
        }

        $payment = Payment::create([
            ...$validated,
            'invoice_number' => 'INV-'.strtoupper(Str::random(8)),
            'transfer_proof' => $transferProofPath,
        ]);

        $this->syncBookingPaymentStatus($payment);

        return $this->sendResponse(new PaymentResource($payment->load('booking.customer')), 'Pembayaran berhasil dicatat.', 201);
    }

    /**
     * Display the specified payment.
     */
    public function show(Request $request, Payment $payment): JsonResponse
    {
        $this->checkAdmin($request);

        return $this->sendResponse(new PaymentResource($payment->load('booking.customer')), 'Detail pembayaran berhasil diambil.');
    }

    /**
     * Update the specified payment.
     */
    public function update(Request $request, Payment $payment): JsonResponse
    {
        $this->checkAdmin($request);

        $validated = $request->validate([
            'booking_id' => ['required', 'exists:bookings,id'],
            'payment_method' => ['required', 'string', Rule::in(['Cash', 'Transfer', 'DP'])],
            'dp_amount' => ['required', 'numeric', 'min:0'],
            'settlement_amount' => ['required', 'numeric', 'min:0'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'string', Rule::in(['Pending', 'DP Dibayar', 'Lunas'])],
            'transfer_proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        if ($request->hasFile('transfer_proof')) {
            $validated['transfer_proof'] = $request->file('transfer_proof')->store('payments', 'public');
        } else {
            unset($validated['transfer_proof']);
        }

        $payment->update($validated);

        $this->syncBookingPaymentStatus($payment);

        return $this->sendResponse(new PaymentResource($payment->fresh()->load('booking.customer')), 'Pembayaran berhasil diperbarui.');
    }

    /**
     * Remove the specified payment.
     */
    public function destroy(Request $request, Payment $payment): JsonResponse
    {
        $this->checkAdmin($request);

        $payment->delete();

        return $this->sendResponse(null, 'Pembayaran berhasil dihapus.');
    }

    private function syncBookingPaymentStatus(Payment $payment): void
    {
        $booking = $payment->booking;
        if (! $booking) {
            return;
        }

        $bookingPaymentStatus = match ($payment->status) {
            'Lunas' => 'Paid',
            'DP Dibayar' => 'Down Payment',
            default => 'Pending',
        };

        $booking->update([
            'payment_status' => $bookingPaymentStatus,
            'payment_method' => $payment->payment_method,
        ]);
    }
}

