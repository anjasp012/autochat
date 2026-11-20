<?php

namespace App\Models;

use Database\Factories\KnowledgeSourceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $application_id
 * @property string $url
 * @property string|null $title
 * @property string $crawl_status
 * @property Carbon|null $last_crawled_at
 * @property string|null $error_message
 * @property int $total_chunks
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Application $application
 * @property-read Collection<int, KnowledgeChunk> $chunks
 */
#[Fillable([
    'application_id',
    'url',
    'title',
    'crawl_status',
    'last_crawled_at',
    'error_message',
    'total_chunks',
])]
class KnowledgeSource extends Model
{
    /** @use HasFactory<KnowledgeSourceFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_crawled_at' => 'datetime',
            'total_chunks' => 'integer',
        ];
    }

    /**
     * Get the application that owns the knowledge source.
     *
     * @return BelongsTo<Application, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * Get the chunks for the knowledge source.
     *
     * @return HasMany<KnowledgeChunk, $this>
     */
    public function chunks(): HasMany
    {
        return $this->hasMany(KnowledgeChunk::class);
    }
}
