<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\KnowledgeSource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<KnowledgeSource>
 */
class KnowledgeSourceFactory extends Factory
{
    protected $model = KnowledgeSource::class;

    public function definition(): array
    {
        return [
            'application_id' => Application::factory(),
            'url' => fake()->url(),
            'title' => fake()->sentence(3),
            'crawl_status' => 'completed',
            'last_crawled_at' => now(),
            'error_message' => null,
            'total_chunks' => fake()->numberBetween(1, 10),
        ];
    }
}
