<?php

namespace App\Models\Concerns;

use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Model;

trait LogsActivity
{
    /**
     * Boot the trait to listen for Eloquent events.
     */
    public static function bootLogsActivity(): void
    {
        static::created(function (Model $model) {
            $label = ActivityLogger::resolveSubjectLabel($model);
            $className = self::getModelFriendlyName($model);

            ActivityLogger::log(
                action: 'created',
                description: "Menambahkan {$className} baru: {$label}",
                subject: $model,
                properties: [
                    'attributes' => $model->attributesToArray(),
                ]
            );
        });

        static::updated(function (Model $model) {
            $changes = $model->getChanges();
            unset($changes['updated_at']);

            if (empty($changes)) {
                return;
            }

            $old = [];
            foreach (array_keys($changes) as $key) {
                $old[$key] = $model->getOriginal($key);
            }

            $label = ActivityLogger::resolveSubjectLabel($model);
            $className = self::getModelFriendlyName($model);

            // Special description for status changes
            if (isset($changes['status'])) {
                $oldStatus = $old['status'] ?? '-';
                $newStatus = $changes['status'];
                $desc = "Memperbarui status {$className} {$label} dari '{$oldStatus}' menjadi '{$newStatus}'";
            } else {
                $desc = "Memperbarui data {$className}: {$label}";
            }

            ActivityLogger::log(
                action: 'updated',
                description: $desc,
                subject: $model,
                properties: [
                    'old' => $old,
                    'new' => $changes,
                ]
            );
        });

        static::deleted(function (Model $model) {
            $label = ActivityLogger::resolveSubjectLabel($model);
            $className = self::getModelFriendlyName($model);

            ActivityLogger::log(
                action: 'deleted',
                description: "Menghapus data {$className}: {$label}",
                subject: $model,
                properties: [
                    'attributes' => $model->attributesToArray(),
                ]
            );
        });
    }

    /**
     * Get user-friendly name for the model in Indonesian.
     */
    protected static function getModelFriendlyName(Model $model): string
    {
        return match (class_basename($model)) {
            'Booking' => 'Booking',
            'Car' => 'Mobil',
            'CarType' => 'Tipe Mobil',
            'Customer' => 'Pelanggan',
            'Driver' => 'Supir',
            'Payment' => 'Pembayaran',
            'Rental' => 'Kontrak Serah Terima',
            'Service' => 'Perawatan/Servis Mobil',
            'Insurance' => 'Asuransi Mobil',
            'VehicleTax' => 'Pajak Kendaraan',
            'Blacklist' => 'Blacklist Konsumen',
            'User' => 'User Akun',
            default => class_basename($model),
        };
    }
}
