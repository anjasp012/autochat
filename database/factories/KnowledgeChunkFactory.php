<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\KnowledgeChunk;
use App\Models\KnowledgeSource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<KnowledgeChunk>
 */
class KnowledgeChunkFactory extends Factory
{
    protected $model = KnowledgeChunk::class;

    public function definition(): array
    {
        return [
            'knowledge_source_id' => KnowledgeSource::factory(),
            'application_id' => fn (array $attributes) => KnowledgeSource::find($attributes['knowledge_source_id'])?->application_id ?? Application::factory(),
            'content' => fake()->paragraphs(2, true),
            'metadata' => [
                'chunk_index' => 1,
                'char_count' => 120,
            ],
        ];
    }
}
