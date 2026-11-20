<?php

namespace Database\Factories;

use App\Models\Application;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    protected $model = Application::class;

    public function definition(): array
    {
        $name = fake()->words(2, true);

        return [
            'app_id' => Str::slug($name).'-'.fake()->unique()->randomNumber(3),
            'name' => ucwords($name),
            'description' => fake()->sentence(),
            'system_prompt' => 'Anda adalah asisten AI yang ramah dan membantu.',
            'model' => 'Qwen3 1.7B Q4 GGUF',
            'temperature' => 0.70,
            'max_tokens' => 2048,
            'is_active' => true,
        ];
    }
}
