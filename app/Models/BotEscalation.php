<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $application_id
 * @property int $conversation_id
 * @property string|null $user_identifier
 * @property string $type
 * @property string $title
 * @property string $message
 * @property bool $is_read
 * @property bool $is_resolved
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Application $application
 * @property-read Conversation $conversation
 */
#[Fillable([
    'application_id',
    'conversation_id',
    'user_identifier',
    'type',
    'title',
    'message',
    'is_read',
    'is_resolved',
])]
class BotEscalation extends Model
{
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'is_resolved' => 'boolean',
        ];
    }

    /**
     * Get the application that owns the escalation.
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * Get the conversation that triggered the escalation.
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
