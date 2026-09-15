<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Concerns\LogsActivity;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'username', 'email', 'phone', 'password', 'roles'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, LogsActivity, Notifiable, TwoFactorAuthenticatable;

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

    /**
     * @return array<string>
     */
    public function getNormalizedRoles(): array
    {
        $roles = $this->roles;
        if (is_string($roles)) {
            $decoded = json_decode($roles, true);
            $roles = is_array($decoded) ? $decoded : [$roles];
        }
        if (! is_array($roles)) {
            return [];
        }

        return array_map(fn ($r) => strtolower(trim((string) $r)), $roles);
    }

    public function hasRole(string $role): bool
    {
        $roles = $this->getNormalizedRoles();
        $target = strtolower(trim($role));

        return in_array('super admin', $roles) || in_array('superadmin', $roles) || in_array($target, $roles);
    }

    public function isSuperAdmin(): bool
    {
        $roles = $this->getNormalizedRoles();

        return in_array('super admin', $roles) || in_array('superadmin', $roles);
    }

    public function isAdmin(): bool
    {
        $roles = $this->getNormalizedRoles();

        return $this->isSuperAdmin() || in_array('admin', $roles);
    }

    public function isMarketing(): bool
    {
        $roles = $this->getNormalizedRoles();

        return $this->isSuperAdmin() || in_array('marketing', $roles);
    }

    public function isPeluncur(): bool
    {
        $roles = $this->getNormalizedRoles();

        return $this->isSuperAdmin() || in_array('peluncur', $roles);
    }

    public function isPetugasCuci(): bool
    {
        $roles = $this->getNormalizedRoles();

        return $this->isSuperAdmin() || in_array('petugas cuci', $roles) || in_array('petugascuci', $roles);
    }

    public function isDriver(): bool
    {
        $roles = $this->getNormalizedRoles();

        return in_array('driver', $roles) || in_array('supir', $roles);
    }

    /**
     * Get the driver profile associated with the user.
     *
     * @return HasOne<Driver, $this>
     */
    public function driver(): HasOne
    {
        return $this->hasOne(Driver::class, 'user_id');
    }
}
