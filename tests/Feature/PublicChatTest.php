<?php

use App\Models\Application;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->app = Application::factory()->create([
        'name' => 'Support Assistant',
        'app_id' => 'support-assistant',
        'system_prompt' => 'Anda adalah asisten support.',
        'is_active' => true,
    ]);
});

test('visiting chat root redirects to default application chat', function () {
    $response = $this->get('/chat');

    $response->assertRedirect('/chat/support-assistant');
});

test('visiting direct slug url renders the public chat interface', function () {
    $response = $this->get('/support-assistant');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('chat/show')
            ->has('application', fn ($app) => $app
                ->where('app_id', 'support-assistant')
                ->where('name', 'Support Assistant')
                ->where('is_active', true)
                ->etc()
            )
            ->where('sessionTimeoutMinutes', 10)
        );
});

test('visiting chat slug url renders the public chat interface', function () {
    $response = $this->get('/chat/support-assistant');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('chat/show')
            ->has('application')
        );
});

test('user can send message and receive ai response', function () {
    Http::preventStrayRequests();

    Http::fake([
        'http://127.0.0.1:8080/v1/chat/completions' => Http::response([
            'choices' => [
                [
                    'message' => [
                        'role' => 'assistant',
                        'content' => 'Halo! Ada yang bisa saya bantu hari ini?',
                    ],
                ],
            ],
            'usage' => [
                'prompt_tokens' => 20,
                'completion_tokens' => 12,
                'total_tokens' => 32,
            ],
        ], 200),
    ]);

    $uuid = (string) Str::uuid();

    $response = $this->postJson("/chat/{$this->app->app_id}/send", [
        'uuid' => $uuid,
        'message' => 'Halo bot!',
    ]);

    $response->assertOk()
        ->assertJson([
            'conversation_uuid' => $uuid,
            'user_message' => [
                'content' => 'Halo bot!',
                'role' => 'user',
            ],
            'assistant_message' => [
                'content' => 'Halo! Ada yang bisa saya bantu hari ini?',
                'role' => 'assistant',
            ],
        ]);

    $this->assertDatabaseHas('conversations', [
        'uuid' => $uuid,
        'application_id' => $this->app->id,
    ]);

    $this->assertDatabaseHas('messages', [
        'role' => 'user',
        'content' => 'Halo bot!',
    ]);

    $this->assertDatabaseHas('messages', [
        'role' => 'assistant',
        'content' => 'Halo! Ada yang bisa saya bantu hari ini?',
        'tokens_used' => 32,
    ]);
});

test('session expires after 10 minutes of inactivity', function () {
    $uuid = (string) Str::uuid();

    // Create a conversation that was last active 15 minutes ago
    $conversation = Conversation::factory()->create([
        'application_id' => $this->app->id,
        'uuid' => $uuid,
        'last_activity_at' => now()->subMinutes(15),
    ]);

    Message::factory()->create([
        'conversation_id' => $conversation->id,
        'role' => 'user',
        'content' => 'Pesan 15 menit lalu',
    ]);

    // Attempting to send message to expired session fails with 422
    $response = $this->postJson("/chat/{$this->app->app_id}/send", [
        'uuid' => $uuid,
        'message' => 'Pesan baru pada sesi kedaluwarsa',
    ]);

    $response->assertStatus(422)
        ->assertJson([
            'expired' => true,
        ]);

    // Ensure session messages endpoint reports expired
    $sessionResponse = $this->getJson("/chat/{$this->app->app_id}/session/{$uuid}");
    $sessionResponse->assertOk()
        ->assertJson([
            'exists' => true,
            'expired' => true,
            'messages' => [],
        ]);
});

test('user can start a new chat with new uuid after previous session expires', function () {
    Http::preventStrayRequests();

    Http::fake([
        'http://127.0.0.1:8080/v1/chat/completions' => Http::response([
            'choices' => [
                ['message' => ['role' => 'assistant', 'content' => 'Sesi baru berhasil.']],
            ],
        ], 200),
    ]);

    $newUuid = (string) Str::uuid();

    $response = $this->postJson("/chat/{$this->app->app_id}/send", [
        'uuid' => $newUuid,
        'message' => 'Pesan sesi baru',
    ]);

    $response->assertOk()
        ->assertJson([
            'conversation_uuid' => $newUuid,
            'assistant_message' => [
                'content' => 'Sesi baru berhasil.',
            ],
        ]);

    $this->assertDatabaseHas('conversations', [
        'uuid' => $newUuid,
        'application_id' => $this->app->id,
    ]);
});

test('inactive application rejects chat messages', function () {
    $inactiveApp = Application::factory()->create([
        'app_id' => 'offline-bot',
        'is_active' => false,
    ]);

    $response = $this->postJson("/chat/{$inactiveApp->app_id}/send", [
        'uuid' => (string) Str::uuid(),
        'message' => 'Halo?',
    ]);

    $response->assertStatus(403);
});
