<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'roles'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'roles' => 'array',
        ];
    }

    public function hasRole(string $role): bool
    {
        return in_array('Super Admin', $this->roles ?? []) || in_array($role, $this->roles ?? []);
    }

    public function isSuperAdmin(): bool
    {
        return in_array('Super Admin', $this->roles ?? []);
    }

    public function isAdmin(): bool
    {
        return $this->isSuperAdmin() || in_array('Admin', $this->roles ?? []);
    }

    public function isMarketing(): bool
    {
        return $this->isSuperAdmin() || in_array('Marketing', $this->roles ?? []);
    }

    public function isPeluncur(): bool
    {
        return $this->isSuperAdmin() || in_array('Peluncur', $this->roles ?? []);
    }

    public function isPetugasCuci(): bool
    {
        return $this->isSuperAdmin() || in_array('Petugas Cuci', $this->roles ?? []);
    }
}
