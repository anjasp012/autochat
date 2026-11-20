<?php

use App\Models\Application;
use App\Models\Conversation;
use App\Models\KnowledgeChunk;
use App\Models\KnowledgeSource;
use App\Models\Message;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

test('applications can be created and queried', function () {
    $app = Application::factory()->create([
        'app_id' => 'support-bot',
        'name' => 'Support Bot',
        'system_prompt' => 'Help customers.',
        'is_active' => true,
    ]);

    expect($app)->toBeInstanceOf(Application::class)
        ->and($app->app_id)->toBe('support-bot')
        ->and($app->is_active)->toBeTrue();

    $this->assertDatabaseHas('applications', [
        'app_id' => 'support-bot',
        'name' => 'Support Bot',
    ]);
});

test('conversations and messages relationship works properly', function () {
    $app = Application::factory()->create();

    $uuid = (string) Str::uuid();
    $conversation = Conversation::factory()->create([
        'application_id' => $app->id,
        'uuid' => $uuid,
    ]);

    $userMsg = Message::factory()->create([
        'conversation_id' => $conversation->id,
        'role' => 'user',
        'content' => 'Halo, ada yang bisa dibantu?',
    ]);

    $assistantMsg = Message::factory()->create([
        'conversation_id' => $conversation->id,
        'role' => 'assistant',
        'content' => 'Tentu, saya siap membantu.',
    ]);

    expect($conversation->application->id)->toBe($app->id)
        ->and($conversation->messages)->toHaveCount(2)
        ->and($conversation->messages->first()->role)->toBe('user')
        ->and($conversation->messages->last()->role)->toBe('assistant');
});

test('knowledge sources and chunks relationship works properly', function () {
    $app = Application::factory()->create();

    $source = KnowledgeSource::factory()->create([
        'application_id' => $app->id,
        'url' => 'https://example.com/docs',
        'crawl_status' => 'completed',
    ]);

    $chunk = KnowledgeChunk::factory()->create([
        'knowledge_source_id' => $source->id,
        'application_id' => $app->id,
        'content' => 'Dokumentasi penting mengenai produk kami.',
        'metadata' => ['chunk' => 1, 'url' => 'https://example.com/docs'],
    ]);

    expect($source->chunks)->toHaveCount(1)
        ->and($source->chunks->first()->content)->toContain('Dokumentasi')
        ->and($source->chunks->first()->metadata['chunk'])->toBe(1)
        ->and($chunk->application->id)->toBe($app->id);
});

test('system settings helper stores and retrieves typed values', function () {
    SystemSetting::set('ai_base_url', 'http://127.0.0.1:8080');
    SystemSetting::set('session_timeout_minutes', 10, 'integer');
    SystemSetting::set('is_production_ready', true, 'boolean');
    SystemSetting::set('global_api_key', 'super-secret-key', 'encrypted');
    SystemSetting::set('allowed_domains', ['example.com', 'laravel.com'], 'json');

    expect(SystemSetting::get('ai_base_url'))->toBe('http://127.0.0.1:8080')
        ->and(SystemSetting::get('session_timeout_minutes'))->toBe(10)
        ->and(SystemSetting::get('is_production_ready'))->toBeTrue()
        ->and(SystemSetting::get('global_api_key'))->toBe('super-secret-key')
        ->and(SystemSetting::get('allowed_domains'))->toBe(['example.com', 'laravel.com'])
        ->and(SystemSetting::get('non_existent', 'default_val'))->toBe('default_val');
});

test('admin user can authenticate via login screen', function () {
    $admin = User::factory()->create([
        'email' => 'admin@test.com',
        'password' => bcrypt('secretpassword123'),
        'is_admin' => true,
    ]);

    $response = $this->post('/login', [
        'email' => 'admin@test.com',
        'password' => 'secretpassword123',
    ]);

    $this->assertAuthenticatedAs($admin);
    $response->assertRedirect('/dashboard');
});
