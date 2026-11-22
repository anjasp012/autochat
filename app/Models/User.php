<?php

namespace App\Models;

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
 * @property bool $is_admin
 * @property string $role
 * @property array|null $assigned_application_ids
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'is_admin', 'role', 'assigned_application_ids'])]
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
            'is_admin' => 'boolean',
            'assigned_application_ids' => 'array',
        ];
    }

    /**
     * Determine whether the user is the primary admin / super admin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'admin' || $this->role === 'super_admin' || ($this->is_admin && empty($this->role));
    }

    /**
     * Determine whether the user is a staff / operator.
     */
    public function isOperator(): bool
    {
        return $this->role === 'operator';
    }

    /**
     * Determine whether the user can access a specific application ID.
     */
    public function canAccessApplication(int $applicationId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if (empty($this->assigned_application_ids)) {
            return false;
        }

        return in_array($applicationId, $this->assigned_application_ids, false);
    }
}
