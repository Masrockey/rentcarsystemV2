<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AllocationController;
use App\Http\Controllers\BlacklistController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\CarController;
use App\Http\Controllers\CarTypeController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\InsuranceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RentalController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReturnController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VehicleTaxController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');
Route::redirect('/home', '/dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Users CRUD
    Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);

    // Customers CRUD
    Route::resource('customers', CustomerController::class)->only(['index', 'store', 'update', 'destroy']);

    // Cars CRUD
    Route::resource('cars', CarController::class)->only(['index', 'store', 'update', 'destroy']);

    // Car Types (Tipe & Jenis Mobil) CRUD
    Route::resource('car-types', CarTypeController::class)->only(['index', 'store', 'update', 'destroy']);

    // Drivers CRUD
    Route::resource('drivers', DriverController::class)->only(['index', 'store', 'update', 'destroy']);

    // Bookings & Workflows
    Route::get('bookings/export', [BookingController::class, 'export'])->name('bookings.export');
    Route::resource('bookings', BookingController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::post('bookings/{booking}/cancel', [BookingController::class, 'cancel'])->name('bookings.cancel');
    Route::get('bookings/{booking}/checklist', [BookingController::class, 'showChecklist'])->name('bookings.checklist');
    Route::post('bookings/{booking}/delivery', [BookingController::class, 'submitDelivery'])->name('bookings.delivery');
    Route::post('bookings/{booking}/return', [BookingController::class, 'submitReturn'])->name('bookings.return');
    Route::post('bookings/{booking}/wash', [BookingController::class, 'completeWash'])->name('bookings.wash');

    // Dedicated Car & Staff Allocations
    Route::get('allocations/export', [AllocationController::class, 'export'])->name('allocations.export');
    Route::get('allocations', [AllocationController::class, 'index'])->name('allocations.index');
    Route::put('allocations/{booking}', [AllocationController::class, 'update'])->name('allocations.update');
    Route::delete('allocations/{booking}', [AllocationController::class, 'destroy'])->name('allocations.destroy');

    // Payments CRUD
    Route::resource('payments', PaymentController::class)->only(['index', 'store', 'update', 'destroy']);

    // Services (Car Maintenance) CRUD
    Route::resource('services', ServiceController::class)->only(['index', 'store', 'update', 'destroy']);

    // Insurance CRUD
    Route::resource('insurances', InsuranceController::class)->only(['index', 'store', 'update', 'destroy']);

    // Vehicle Taxes / STNK CRUD
    Route::resource('vehicle-taxes', VehicleTaxController::class)->only(['index', 'store', 'update', 'destroy']);

    // Rentals / Serah Terima CRUD
    Route::resource('rentals', RentalController::class)->only(['index', 'store', 'update', 'destroy']);

    // Unit Kembali / Pengembalian Unit
    Route::get('returns', [ReturnController::class, 'index'])->name('returns.index');
    Route::post('returns', [ReturnController::class, 'store'])->name('returns.store');

    // Blacklist Konsumen CRUD
    Route::post('blacklists/import', [BlacklistController::class, 'import'])->name('blacklists.import');
    Route::resource('blacklists', BlacklistController::class)->only(['index', 'store', 'update', 'destroy']);

    // Monthly Report
    Route::get('reports', ReportController::class)->name('reports');

    // Super Admin Activity Logs
    Route::get('activity-logs', [ActivityLogController::class, 'index'])->name('activity-logs.index');
});

require __DIR__.'/settings.php';
