<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'otp',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'otp_expires_at' => 'datetime',
        ];
    }

    public function generateToken(): array
    {
        $expiration = config('sanctum.expiration');

        $expiresAt = $expiration !== null
            ? now()->addMinutes($expiration)
            : null;

        $token = $this->createToken('auth-token', ['*'], $expiresAt);

        return [
            'token' => $token->plainTextToken,
            'expires_at' => $expiresAt?->toISOString(),
        ];
    }

    public function isOtpExpired(): bool
    {
        return !$this->otp_expires_at
            || $this->otp_expires_at->isPast();
    }

    public function invalidateOtp(): void
    {
        $this->otp = null;
        $this->otp_expires_at = null;
        $this->save();
    }
}
