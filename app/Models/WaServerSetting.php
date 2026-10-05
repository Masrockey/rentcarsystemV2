<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'server_url',
    'device_id',
    'auth_username',
    'auth_password',
    'webhook_url',
    'webhook_secret',
    'auto_reconnect',
    'target_group_jid',
    'target_group_name',
])]
class WaServerSetting extends Model
{
    use HasFactory;

    /**
     * Get the singleton active WA Server setting record.
     */
    public static function current(): self
    {
        return static::firstOrCreate([], [
            'server_url' => config('whatsapp.server_url', 'http://localhost:3000'),
            'device_id' => config('whatsapp.device_id', 'rentcars_main'),
            'auth_username' => config('whatsapp.auth_user', null),
            'auth_password' => config('whatsapp.auth_pass', null),
            'webhook_url' => null,
            'webhook_secret' => null,
            'auto_reconnect' => true,
        ]);
    }
}
