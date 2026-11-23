<?php

namespace App\Models;

use Database\Factories\ApplicationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $app_id
 * @property string $name
 * @property string|null $description
 * @property string $system_prompt
 * @property string $model
 * @property float $temperature
 * @property int $max_tokens
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Conversation> $conversations
 * @property-read Collection<int, KnowledgeSource> $knowledgeSources
 * @property-read Collection<int, KnowledgeChunk> $knowledgeChunks
 */
#[Fillable([
    'app_id',
    'name',
    'description',
    'welcome_message',
    'chat_settings',
    'system_prompt',
    'model',
    'temperature',
    'max_tokens',
    'is_active',
])]
class Application extends Model
{
    /** @use HasFactory<ApplicationFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'temperature' => 'float',
            'max_tokens' => 'integer',
            'is_active' => 'boolean',
            'chat_settings' => 'array',
        ];
    }

    /**
     * Get sanitized active AI model name.
     */
    protected function getModelAttribute(?string $value): string
    {
        if (empty($value) || str_contains($value, 'llama') || str_contains($value, 'GGUF') || str_contains($value, 'gpt-oss')) {
            return config('ai.model', 'qwen/qwen3.8-27b');
        }

        return $value;
    }

    /**
     * Scope query to only include active applications.
     */
    #[Scope]
    protected function active(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Get conversations for this application.
     *
     * @return HasMany<Conversation, $this>
     */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    /**
     * Get knowledge sources for this application.
     *
     * @return HasMany<KnowledgeSource, $this>
     */
    public function knowledgeSources(): HasMany
    {
        return $this->hasMany(KnowledgeSource::class);
    }

    /**
     * Get knowledge chunks for this application.
     *
     * @return HasMany<KnowledgeChunk, $this>
     */
    public function knowledgeChunks(): HasMany
    {
        return $this->hasMany(KnowledgeChunk::class);
    }
}
