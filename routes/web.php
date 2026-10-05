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
use App\Http\Controllers\DriverTripLogController;
use App\Http\Controllers\InsuranceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RentalController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReturnController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VehicleTaxController;
use App\Http\Controllers\WaServerController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');
Route::redirect('/home', '/dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Users CRUD
    Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);

    // Customers CRUD
    Route::resource('customers', CustomerController::class)->only(['index', 'store', 'update', 'destroy']);

    // Cars CRUD & Service Action
    Route::post('cars/{car}/service', [CarController::class, 'sendToService'])->name('cars.service');
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
    Route::post('bookings/{booking}/complete', [BookingController::class, 'completeWash'])->name('bookings.complete');

    // Driver Trip Logs (Check-in & Check-out)
    Route::get('driver-trip-logs', [DriverTripLogController::class, 'overview'])->name('driver-trip-logs.index');
    Route::get('bookings/{booking}/trip-logs', [DriverTripLogController::class, 'index'])->name('bookings.trip-logs.index');
    Route::post('bookings/{booking}/trip-logs/checkin', [DriverTripLogController::class, 'checkin'])->name('bookings.trip-logs.checkin');
    Route::post('bookings/{booking}/trip-logs/{tripLog}/checkout', [DriverTripLogController::class, 'checkout'])->name('bookings.trip-logs.checkout');

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
    Route::delete('activity-logs', [ActivityLogController::class, 'destroy'])->name('activity-logs.destroy');

    // Notifications Management
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // WA Server (WhatsApp API MultiDevice Management)
    Route::get('wa-server', [WaServerController::class, 'index'])->name('wa-server.index');
    Route::post('wa-server/settings', [WaServerController::class, 'updateSettings'])->name('wa-server.settings');
    Route::get('wa-server/qr', [WaServerController::class, 'getQr'])->name('wa-server.qr');
    Route::post('wa-server/pair-code', [WaServerController::class, 'getPairingCode'])->name('wa-server.pair-code');
    Route::get('wa-server/status', [WaServerController::class, 'checkStatus'])->name('wa-server.status');
    Route::post('wa-server/reconnect', [WaServerController::class, 'reconnect'])->name('wa-server.reconnect');
    Route::post('wa-server/logout', [WaServerController::class, 'logout'])->name('wa-server.logout');
    Route::post('wa-server/devices', [WaServerController::class, 'addDevice'])->name('wa-server.devices.store');
    Route::delete('wa-server/devices/{deviceId}', [WaServerController::class, 'deleteDevice'])->name('wa-server.devices.destroy');
    Route::get('wa-server/groups', [WaServerController::class, 'getGroups'])->name('wa-server.groups');
    Route::post('wa-server/target-group', [WaServerController::class, 'setTargetGroup'])->name('wa-server.target-group');
    Route::post('wa-server/test-message', [WaServerController::class, 'sendTestMessage'])->name('wa-server.test-message');
});

require __DIR__.'/settings.php';
