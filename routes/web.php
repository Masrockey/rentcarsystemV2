<?php

use App\Http\Controllers\BookingController;
use App\Http\Controllers\CarController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\InsuranceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RentalController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VehicleTaxController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');
Route::redirect('/home', '/dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Users CRUD
    Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);

    // Customers CRUD
    Route::resource('customers', CustomerController::class)->only(['index', 'store', 'update', 'destroy']);

    // Cars CRUD
    Route::resource('cars', CarController::class)->only(['index', 'store', 'update', 'destroy']);

    // Drivers CRUD
    Route::resource('drivers', DriverController::class)->only(['index', 'store', 'update', 'destroy']);

    // Bookings & Workflows
    Route::resource('bookings', BookingController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('bookings/{booking}/checklist', [BookingController::class, 'showChecklist'])->name('bookings.checklist');
    Route::post('bookings/{booking}/delivery', [BookingController::class, 'submitDelivery'])->name('bookings.delivery');
    Route::post('bookings/{booking}/return', [BookingController::class, 'submitReturn'])->name('bookings.return');
    Route::post('bookings/{booking}/wash', [BookingController::class, 'completeWash'])->name('bookings.wash');

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

    // Monthly Report
    Route::get('reports', ReportController::class)->name('reports');
});

require __DIR__.'/settings.php';
