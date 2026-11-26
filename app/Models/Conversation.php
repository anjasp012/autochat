<?php

namespace App\Models;

use App\Events\MessageSent;
use Carbon\CarbonInterface;
use Database\Factories\ConversationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $uuid
 * @property int $application_id
 * @property string|null $ip_address
 * @property string|null $city
 * @property string|null $user_agent
 * @property string|null $user_identifier
 * @property Carbon $last_activity_at
 * @property bool $is_taken_over
 * @property bool $is_waiting_admin
 * @property bool $is_archived
 * @property string|null $ended_reason
 * @property Carbon|null $ended_at
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
    'user_identifier',
    'ip_address',
    'city',
    'user_agent',
    'last_activity_at',
    'is_taken_over',
    'is_waiting_admin',
    'is_archived',
    'ended_reason',
    'ended_at',
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
            'is_waiting_admin' => 'boolean',
            'is_archived' => 'boolean',
            'ended_at' => 'datetime',
            'taken_over_at' => 'datetime',
        ];
    }

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
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

    /**
     * Get the latest message for the conversation.
     *
     * @return HasOne<Message, $this>
     */
    public function latestMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    /**
     * Mark conversation as ended by visitor ('user') or inactivity ('timeout').
     */
    public function markAsEnded(string $reason, ?CarbonInterface $endedAt = null, ?int $timeoutMinutes = null): bool
    {
        if ($this->ended_reason !== null) {
            return false;
        }

        $resolvedReason = $reason === 'user' ? 'user' : 'timeout';
        $resolvedEndedAt = $endedAt ?? now();
        $minutes = $timeoutMinutes ?? (int) config('ai.session_timeout', 10);

        $this->update([
            'ended_reason' => $resolvedReason,
            'ended_at' => $resolvedEndedAt,
            'is_waiting_admin' => false,
        ]);

        $content = $resolvedReason === 'user'
            ? 'Pengguna telah mengakhiri sesi percakapan.'
            : "Sesi percakapan berakhir otomatis karena batas waktu ({$minutes} menit tanpa aktivitas).";

        $systemMessage = Message::create([
            'conversation_id' => $this->id,
            'role' => 'system',
            'content' => $content,
            'tokens_used' => 0,
        ]);

        $this->refresh();
        $systemMessage->setRelation('conversation', $this->loadMissing(['application']));
        MessageSent::safeDispatch($systemMessage);

        return true;
    }

    /**
     * Check inactivity deadline and mark as ended by timeout if expired.
     */
    public function syncTimeoutStatus(?int $timeoutMinutes = null): bool
    {
        if ($this->ended_reason !== null || ! $this->last_activity_at) {
            return false;
        }

        $minutes = $timeoutMinutes ?? (int) config('ai.session_timeout', 10);
        $expiredAt = $this->last_activity_at->copy()->addMinutes($minutes);

        if ($expiredAt->isPast()) {
            return $this->markAsEnded('timeout', $expiredAt, $minutes);
        }

        return false;
    }

    /**
     * Sync any open conversations that have exceeded inactivity timeout.
     */
    public static function syncExpiredConversations(?int $applicationId = null, ?int $timeoutMinutes = null): void
    {
        $minutes = $timeoutMinutes ?? (int) config('ai.session_timeout', 10);
        $cutoff = now()->subMinutes($minutes);

        static::query()
            ->whereNull('ended_reason')
            ->where('last_activity_at', '<=', $cutoff)
            ->when($applicationId, fn ($q) => $q->where('application_id', $applicationId))
            ->limit(50)
            ->get()
            ->each(fn (self $conv) => $conv->syncTimeoutStatus($minutes));
    }

    /**
     * Count unread escalations and unanswered visitor conversations for admin badges/favicon.
     *
     * @return array{unread_escalations: int, unread_chats: int, total_notifications: int}
     */
    public static function countUnreadAttentionForUser(?User $user): array
    {
        if (! $user) {
            return [
                'unread_escalations' => 0,
                'unread_chats' => 0,
                'total_notifications' => 0,
            ];
        }

        $isSuperAdmin = $user->isSuperAdmin();
        $assignedIds = $user->assigned_application_ids ?? [];

        $unreadEscalationsQuery = BotEscalation::query()
            ->where('is_read', false)
            ->when(! $isSuperAdmin, fn ($q) => $q->whereIn('application_id', $assignedIds));

        $unreadEscalationsCount = (clone $unreadEscalationsQuery)->count();
        $escalationConvIds = (clone $unreadEscalationsQuery)
            ->whereNotNull('conversation_id')
            ->pluck('conversation_id')
            ->all();

        $unreadChatConvIds = static::query()
            ->where('is_archived', false)
            ->whereNull('ended_reason')
            ->when(! $isSuperAdmin, fn ($q) => $q->whereIn('application_id', $assignedIds))
            ->whereHas('latestMessage', fn ($q) => $q->where('role', 'user'))
            ->pluck('id')
            ->all();

        $totalUnique = count(array_unique(array_merge($escalationConvIds, $unreadChatConvIds)));

        return [
            'unread_escalations' => $unreadEscalationsCount,
            'unread_chats' => count($unreadChatConvIds),
            'total_notifications' => max($totalUnique, $unreadEscalationsCount),
        ];
    }
}
