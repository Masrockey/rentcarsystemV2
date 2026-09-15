<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityLogger
{
    /**
     * Hidden fields that must never be recorded in audit logs.
     *
     * @var list<string>
     */
    protected static array $sensitiveFields = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Record an activity log entry.
     */
    public static function log(
        string $action,
        string $description,
        ?Model $subject = null,
        array $properties = [],
        ?User $user = null
    ): ?ActivityLog {
        try {
            $user = $user ?? Auth::user();
            $roles = $user ? $user->getNormalizedRoles() : [];
            $roleLabel = ! empty($roles) ? implode(', ', $roles) : null;

            $subjectType = null;
            $subjectId = null;
            $subjectLabel = null;

            if ($subject) {
                $subjectType = class_basename($subject);
                $subjectId = $subject->getKey();
                $subjectLabel = self::resolveSubjectLabel($subject);
            }

            $cleanProperties = self::cleanSensitiveData($properties);

            return ActivityLog::create([
                'user_id' => $user?->id,
                'user_name' => $user?->name ?? 'Sistem',
                'user_role' => $roleLabel,
                'action' => $action,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'subject_label' => $subjectLabel,
                'description' => $description,
                'properties' => ! empty($cleanProperties) ? $cleanProperties : null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent() ? substr(Request::userAgent(), 0, 500) : null,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Never break main app flow if logging fails
            report($e);

            return null;
        }
    }

    /**
     * Record an authentication event (login, logout, failed).
     */
    public static function logAuth(string $action, string $description, ?User $user = null, array $properties = []): ?ActivityLog
    {
        return self::log(
            action: $action,
            description: $description,
            subject: $user,
            properties: $properties,
            user: $user
        );
    }

    /**
     * Resolve a user-friendly label for a given model.
     */
    public static function resolveSubjectLabel(Model $model): string
    {
        $class = class_basename($model);

        return match ($class) {
            'Booking' => $model->booking_number ?? "#{$model->getKey()}",
            'Car' => "{$model->name} ({$model->plate_number})",
            'CarType' => $model->name ?? "#{$model->getKey()}",
            'Customer' => $model->name ?? "#{$model->getKey()}",
            'Driver' => $model->name ?? "#{$model->getKey()}",
            'Payment' => "Pembayaran #{$model->getKey()}".($model->payment_method ? " ({$model->payment_method})" : ''),
            'Rental' => $model->contract_number ?? "Kontrak #{$model->getKey()}",
            'Service' => "Servis {$model->car?->name} (#{$model->getKey()})",
            'Insurance' => "Asuransi {$model->car?->name} (#{$model->getKey()})",
            'VehicleTax' => "Pajak {$model->car?->name} (#{$model->getKey()})",
            'Blacklist' => $model->name ?? "#{$model->getKey()}",
            'User' => "{$model->name} ({$model->email})",
            default => "{$class} #{$model->getKey()}",
        };
    }

    /**
     * Filter sensitive attributes out of properties array.
     */
    protected static function cleanSensitiveData(array $data): array
    {
        foreach ($data as $key => $val) {
            if (in_array(strtolower($key), self::$sensitiveFields, true)) {
                unset($data[$key]);
            } elseif (is_array($val)) {
                $data[$key] = self::cleanSensitiveData($val);
            }
        }

        return $data;
    }
}
