<?php

namespace App\Models;

use Database\Factories\ConversationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $uuid
 * @property int $application_id
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property Carbon $last_activity_at
 * @property bool $is_taken_over
 * @property Carbon|null $taken_over_at
 * @property int|null $taken_over_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Application $application
 * @property-read User|null $takenOverBy
 * @property-read Collection<int, Message> $messages
 */
#[Fillable([
    'uuid',
    'application_id',
    'ip_address',
    'user_agent',
    'last_activity_at',
    'is_taken_over',
    'taken_over_at',
    'taken_over_by',
])]
class Conversation extends Model
{
    /** @use HasFactory<ConversationFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_activity_at' => 'datetime',
            'is_taken_over' => 'boolean',
            'taken_over_at' => 'datetime',
        ];
    }

    /**
     * Get the application that owns the conversation.
     *
     * @return BelongsTo<Application, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * Get the admin user who took over the conversation.
     *
     * @return BelongsTo<User, $this>
     */
    public function takenOverBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'taken_over_by');
    }

    /**
     * Get the messages for the conversation.
     *
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
