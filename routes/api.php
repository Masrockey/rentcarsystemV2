<?php

use App\Http\Controllers\Api\V1\ActivityLogController;
use App\Http\Controllers\Api\V1\AllocationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BlacklistController;
use App\Http\Controllers\Api\V1\BookingController;
use App\Http\Controllers\Api\V1\CarController;
use App\Http\Controllers\Api\V1\CarTypeController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DriverController;
use App\Http\Controllers\Api\V1\DriverTripLogController;
use App\Http\Controllers\Api\V1\InsuranceController;
use App\Http\Controllers\Api\V1\LookupController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\RentalController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ReturnController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\VehicleTaxController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (Version 1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // Public Authentication Endpoint
    Route::post('auth/login', [AuthController::class, 'login'])->name('api.v1.auth.login');

    // Protected API Endpoints (Bearer Token Required)
    Route::middleware('auth:sanctum')->group(function () {
        // Auth & Profile
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');
        Route::get('user', [AuthController::class, 'me'])->name('api.v1.user.me');
        Route::put('user/profile', [ProfileController::class, 'updateProfile'])->name('api.v1.user.profile');
        Route::put('user/password', [ProfileController::class, 'updatePassword'])->name('api.v1.user.password');

        // Dashboard & Analytics
        Route::get('dashboard', [DashboardController::class, 'index'])->name('api.v1.dashboard');

        // Form Lookups / Reference Data
        Route::get('lookups', [LookupController::class, 'index'])->name('api.v1.lookups');

        // Users Management (Super Admin only)
        Route::apiResource('users', UserController::class)->names('api.v1.users');

        // Customers Management
        Route::apiResource('customers', CustomerController::class)->names('api.v1.customers');

        // Cars / Armada Management
        Route::post('cars/{car}/service', [CarController::class, 'sendToService'])->name('api.v1.cars.service');
        Route::apiResource('cars', CarController::class)->names('api.v1.cars');

        // Car Types (Tipe Mobil) Management
        Route::apiResource('car-types', CarTypeController::class)->names('api.v1.car-types');

        // Drivers Management
        Route::apiResource('drivers', DriverController::class)->names('api.v1.drivers');

        // Bookings & Workflows
        Route::get('bookings/export', [BookingController::class, 'export'])->name('api.v1.bookings.export');
        Route::apiResource('bookings', BookingController::class)->names('api.v1.bookings');
        Route::post('bookings/{booking}/cancel', [BookingController::class, 'cancel'])->name('api.v1.bookings.cancel');
        Route::get('bookings/{booking}/checklist', [BookingController::class, 'showChecklist'])->name('api.v1.bookings.checklist');
        Route::post('bookings/{booking}/delivery', [BookingController::class, 'submitDelivery'])->name('api.v1.bookings.delivery');
        Route::post('bookings/{booking}/return', [BookingController::class, 'submitReturn'])->name('api.v1.bookings.return');
        Route::post('bookings/{booking}/wash', [BookingController::class, 'completeWash'])->name('api.v1.bookings.wash');
        Route::post('bookings/{booking}/complete', [BookingController::class, 'completeWash'])->name('api.v1.bookings.complete');

        // Driver Trip Logs (Check-in & Check-out)
        Route::get('bookings/{booking}/trip-logs', [DriverTripLogController::class, 'index'])->name('api.v1.bookings.trip-logs.index');
        Route::post('bookings/{booking}/trip-logs/checkin', [DriverTripLogController::class, 'checkin'])->name('api.v1.bookings.trip-logs.checkin');
        Route::post('bookings/{booking}/trip-logs/{tripLog}/checkout', [DriverTripLogController::class, 'checkout'])->name('api.v1.bookings.trip-logs.checkout');

        // Allocations Management
        Route::get('allocations/export', [AllocationController::class, 'export'])->name('api.v1.allocations.export');
        Route::get('allocations', [AllocationController::class, 'index'])->name('api.v1.allocations.index');
        Route::put('allocations/{booking}', [AllocationController::class, 'update'])->name('api.v1.allocations.update');
        Route::delete('allocations/{booking}', [AllocationController::class, 'destroy'])->name('api.v1.allocations.destroy');

        // Rentals / Kontrak Serah Terima
        Route::apiResource('rentals', RentalController::class)->names('api.v1.rentals');

        // Returns / Pengembalian Unit
        Route::get('returns', [ReturnController::class, 'index'])->name('api.v1.returns.index');
        Route::post('returns', [ReturnController::class, 'store'])->name('api.v1.returns.store');

        // Payments Management
        Route::apiResource('payments', PaymentController::class)->names('api.v1.payments');

        // Services / Perawatan Armada
        Route::apiResource('services', ServiceController::class)->names('api.v1.services');

        // Insurances / Asuransi Unit
        Route::apiResource('insurances', InsuranceController::class)->names('api.v1.insurances');

        // Vehicle Taxes / Pajak STNK
        Route::apiResource('vehicle-taxes', VehicleTaxController::class)->names('api.v1.vehicle-taxes');

        // Blacklist Konsumen
        Route::post('blacklists/import', [BlacklistController::class, 'import'])->name('api.v1.blacklists.import');
        Route::apiResource('blacklists', BlacklistController::class)->names('api.v1.blacklists');

        // Monthly Financial & Transaction Report
        Route::get('reports', [ReportController::class, 'index'])->name('api.v1.reports');

        // Activity Logs (Super Admin only)
        Route::get('activity-logs', [ActivityLogController::class, 'index'])->name('api.v1.activity-logs.index');
        Route::delete('activity-logs', [ActivityLogController::class, 'destroy'])->name('api.v1.activity-logs.destroy');

        // Notifications Management
        Route::get('notifications', [NotificationController::class, 'index'])->name('api.v1.notifications.index');
        Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('api.v1.notifications.read');
        Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('api.v1.notifications.mark-all-read');
        Route::delete('notifications/{notification}', [NotificationController::class, 'destroy'])->name('api.v1.notifications.destroy');
    });
});
