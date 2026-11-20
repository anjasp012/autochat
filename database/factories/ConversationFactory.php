<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\Conversation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Conversation>
 */
class ConversationFactory extends Factory
{
    protected $model = Conversation::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'application_id' => Application::factory(),
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'last_activity_at' => now(),
        ];
    }
}
