<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    /**
     * Display a listing of payments.
     */
    public function index(Request $request): Response
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Akses ditolak. Menu Payments hanya dapat diakses oleh Admin Unit dan Super Admin.');
        }

        return Inertia::render('payments/index', [
            'payments' => Payment::with('booking.customer')
                ->latest()
                ->paginate(10)
                ->withQueryString(),
            'bookings' => Booking::with('customer')
                ->where('payment_status', '!=', 'Paid')
                ->orderBy('id', 'desc')
                ->get(['id', 'booking_number', 'customer_id', 'payment_status']),
        ]);
    }

    /**
     * Store a newly created payment.
     */
    public function store(Request $request): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Akses ditolak. Menu Payments hanya dapat diakses oleh Admin Unit dan Super Admin.');
        }

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

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Payment recorded successfully.']);

        return to_route('payments.index');
    }

    /**
     * Update the specified payment.
     */
    public function update(Request $request, Payment $payment): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Akses ditolak. Menu Payments hanya dapat diakses oleh Admin Unit dan Super Admin.');
        }

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

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Payment updated successfully.']);

        return to_route('payments.index');
    }

    /**
     * Sync booking payment_status and payment_method based on payment record.
     */
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

    /**
     * Remove the specified payment.
     */
    public function destroy(Request $request, Payment $payment): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Akses ditolak. Menu Payments hanya dapat diakses oleh Admin Unit dan Super Admin.');
        }

        $payment->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Payment deleted successfully.']);

        return to_route('payments.index');
    }
}
