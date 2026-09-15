<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Events\Dispatcher;

class AuthEventSubscriber
{
    /**
     * Handle user login events.
     */
    public function handleUserLogin(Login $event): void
    {
        /** @var User|null $user */
        $user = $event->user instanceof User ? $event->user : null;

        if ($user) {
            ActivityLogger::logAuth(
                action: 'login',
                description: "Pengguna {$user->name} ({$user->email}) berhasil login ke sistem",
                user: $user,
                properties: [
                    'guard' => $event->guard,
                ]
            );
        }
    }

    /**
     * Handle user logout events.
     */
    public function handleUserLogout(Logout $event): void
    {
        /** @var User|null $user */
        $user = $event->user instanceof User ? $event->user : null;

        if ($user) {
            ActivityLogger::logAuth(
                action: 'logout',
                description: "Pengguna {$user->name} ({$user->email}) logout dari sistem",
                user: $user,
                properties: [
                    'guard' => $event->guard,
                ]
            );
        }
    }

    /**
     * Handle failed login attempts.
     */
    public function handleUserFailedLogin(Failed $event): void
    {
        $email = $event->credentials['email'] ?? $event->credentials['username'] ?? 'Tidak diketahui';

        ActivityLogger::log(
            action: 'failed_login',
            description: "Percobaan login gagal untuk akun: {$email}",
            properties: [
                'email' => $email,
                'guard' => $event->guard,
            ]
        );
    }

    /**
     * Register the listeners for the subscriber.
     */
    public function subscribe(Dispatcher $events): array
    {
        return [
            Login::class => 'handleUserLogin',
            Logout::class => 'handleUserLogout',
            Failed::class => 'handleUserFailedLogin',
        ];
    }
}
