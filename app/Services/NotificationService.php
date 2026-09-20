<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Support\Collection;

class NotificationService
{
    /**
     * Send notification to a single user.
     */
    public static function sendToUser(
        int $userId,
        string $title,
        string $message,
        ?string $url = null,
        string $type = 'general',
        ?string $icon = null,
        array $data = []
    ): ?AppNotification {
        try {
            return AppNotification::create([
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'url' => $url,
                'icon' => $icon,
                'data' => ! empty($data) ? $data : null,
            ]);
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    /**
     * Send notification to multiple users by IDs.
     *
     * @param  array<int>  $userIds
     * @return Collection<int, AppNotification>
     */
    public static function sendToUsers(
        array $userIds,
        string $title,
        string $message,
        ?string $url = null,
        string $type = 'general',
        ?string $icon = null,
        array $data = []
    ): Collection {
        $created = collect();
        $uniqueIds = array_unique(array_filter($userIds));

        foreach ($uniqueIds as $userId) {
            $notif = self::sendToUser($userId, $title, $message, $url, $type, $icon, $data);
            if ($notif) {
                $created->push($notif);
            }
        }

        return $created;
    }

    /**
     * Send notification to all users having any of the specified roles.
     *
     * @param  array<string>|string  $roles
     * @return Collection<int, AppNotification>
     */
    public static function sendToRoles(
        array|string $roles,
        string $title,
        string $message,
        ?string $url = null,
        string $type = 'general',
        ?string $icon = null,
        array $data = [],
        ?int $excludeUserId = null
    ): Collection {
        $rolesList = is_array($roles) ? $roles : [$roles];
        $targetUserIds = [];

        $allUsers = User::all(['id', 'roles']);
        foreach ($allUsers as $user) {
            if ($excludeUserId && $user->id === $excludeUserId) {
                continue;
            }

            foreach ($rolesList as $role) {
                if ($user->hasRole($role)) {
                    $targetUserIds[] = $user->id;
                    break;
                }
            }
        }

        return self::sendToUsers($targetUserIds, $title, $message, $url, $type, $icon, $data);
    }
}
