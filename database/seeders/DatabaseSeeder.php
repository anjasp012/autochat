<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Admin User
        User::firstOrCreate(
            ['email' => 'admin@autochat.local'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('password123'),
                'is_admin' => true,
                'email_verified_at' => now(),
            ]
        );

        // Default Chatbot Application
        Application::firstOrCreate(
            ['app_id' => 'customer-support'],   
            [
                'name' => 'Customer Support AI',
                'description' => 'Asisten cerdas untuk melayani dan menjawab pertanyaan seputar layanan kami.',
                'system_prompt' => 'Anda adalah Customer Support AI yang ramah, sopan, dan selalu memberikan jawaban yang akurat berdasarkan knowledge base yang tersedia.',
                'model' => 'openai/gpt-oss-120b',
                'temperature' => 0.70,
                'max_tokens' => 2048,
                'is_active' => true,
            ]
        );

        // Default System Settings
        $defaults = [
            'ai_base_url' => ['value' => 'https://api.groq.com/openai/v1', 'type' => 'string', 'group' => 'ai'],
            'ai_model' => ['value' => 'openai/gpt-oss-120b', 'type' => 'string', 'group' => 'ai'],
            'global_api_key' => ['value' => 'autochat_secret_key_2026', 'type' => 'encrypted', 'group' => 'system'],
            'session_timeout_minutes' => ['value' => '10', 'type' => 'integer', 'group' => 'session'],
        ];

        foreach ($defaults as $key => $setting) {
            SystemSetting::set($key, $setting['value'], $setting['type'], $setting['group']);
        }
    }
}
