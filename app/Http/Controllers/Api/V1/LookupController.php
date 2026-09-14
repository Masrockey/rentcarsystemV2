<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\CarResource;
use App\Http\Resources\Api\V1\CarTypeResource;
use App\Http\Resources\Api\V1\CustomerResource;
use App\Http\Resources\Api\V1\DriverResource;
use App\Http\Resources\Api\V1\UserResource;
use App\Models\Car;
use App\Models\CarType;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LookupController extends BaseApiController
{
    /**
     * Get lookup and reference data for forms and dropdowns.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $customerQuery = Customer::orderBy('name');
        if (! ($user->isAdmin() || $user->isPeluncur())) {
            $customerQuery->where('user_id', $user->id);
        }

        $readyCars = Car::where('status', 'Ready')->orderBy('name')->get();
        $allCars = Car::orderBy('name')->get();
        $carTypes = CarType::orderBy('name')->get();
        $readyDrivers = Driver::where('status', 'Active')->orderBy('name')->get();
        $allDrivers = Driver::orderBy('name')->get();

        $peluncurOfficers = User::whereJsonContains('roles', 'Peluncur')->orderBy('name')->get();
        $washOfficers = User::whereJsonContains('roles', 'Petugas Cuci')->orderBy('name')->get();
        $marketingUsers = User::where(function ($q) {
            $q->whereJsonContains('roles', 'Marketing')
                ->orWhereJsonContains('roles', 'Admin')
                ->orWhereJsonContains('roles', 'Super Admin');
        })->orderBy('name')->get();

        return $this->sendResponse([
            'ready_cars' => CarResource::collection($readyCars),
            'all_cars' => CarResource::collection($allCars),
            'car_types' => CarTypeResource::collection($carTypes),
            'ready_drivers' => DriverResource::collection($readyDrivers),
            'all_drivers' => DriverResource::collection($allDrivers),
            'peluncur_officers' => UserResource::collection($peluncurOfficers),
            'wash_officers' => UserResource::collection($washOfficers),
            'marketing_users' => UserResource::collection($marketingUsers),
            'customers' => CustomerResource::collection($customerQuery->get()),
        ], 'Data referensi berhasil diambil.');
    }
}

