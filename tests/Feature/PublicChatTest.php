<?php

use App\Models\Application;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->chatbot = Application::factory()->create([
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
        '*chat/completions' => Http::response([
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

    $response = $this->postJson("/chat/{$this->chatbot->app_id}/send", [
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
        'application_id' => $this->chatbot->id,
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
        'application_id' => $this->chatbot->id,
        'uuid' => $uuid,
        'last_activity_at' => now()->subMinutes(15),
    ]);

    Message::factory()->create([
        'conversation_id' => $conversation->id,
        'role' => 'user',
        'content' => 'Pesan 15 menit lalu',
    ]);

    // Attempting to send message to expired session fails with 422
    $response = $this->postJson("/chat/{$this->chatbot->app_id}/send", [
        'uuid' => $uuid,
        'message' => 'Pesan baru pada sesi kedaluwarsa',
    ]);

    $response->assertStatus(422)
        ->assertJson([
            'expired' => true,
        ]);

    // Ensure session messages endpoint reports expired
    $sessionResponse = $this->getJson("/chat/{$this->chatbot->app_id}/session/{$uuid}");
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
        '*chat/completions' => Http::response([
            'choices' => [
                ['message' => ['role' => 'assistant', 'content' => 'Sesi baru berhasil.']],
            ],
        ], 200),
    ]);

    $newUuid = (string) Str::uuid();

    $response = $this->postJson("/chat/{$this->chatbot->app_id}/send", [
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
        'application_id' => $this->chatbot->id,
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

test('real visitor ip is extracted from cf-connecting-ip header', function () {
    Http::fake([
        '*chat/completions' => Http::response([
            'choices' => [
                ['message' => ['role' => 'assistant', 'content' => 'Halo!']],
            ],
        ], 200),
    ]);

    $uuid = (string) Str::uuid();

    $this->withHeaders([
        'CF-Connecting-IP' => '114.125.45.1',
    ])->postJson("/chat/{$this->chatbot->app_id}/send", [
        'uuid' => $uuid,
        'message' => 'Test IP',
    ])->assertOk();

    $this->assertDatabaseHas('conversations', [
        'uuid' => $uuid,
        'ip_address' => '114.125.45.1',
    ]);
});

test('chat sends pure system prompt and conversation history to llm without automation injection', function () {
    $this->chatbot->update([
        'system_prompt' => 'Kamu adalah CS ramah bernama Rosa.',
        'chat_settings' => [
            'canned_responses' => [
                [
                    'id' => 'cr-lupa',
                    'shortcut' => 'lupa',
                    'content' => 'Panduan Lupa User ID',
                ],
            ],
        ],
    ]);

    $interceptedPrompt = '';
    Http::fake([
        '*chat/completions' => function ($request) use (&$interceptedPrompt) {
            $data = $request->data();
            $messages = $data['messages'] ?? [];
            $systemMsg = collect($messages)->firstWhere('role', 'system');
            $interceptedPrompt = $systemMsg['content'] ?? '';

            return Http::response([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => 'Halo Bosku, ada yang bisa Rosa bantu?']],
                ],
            ], 200);
        },
    ]);

    $uuid = (string) Str::uuid();

    $this->postJson("/chat/{$this->chatbot->app_id}/send", [
        'uuid' => $uuid,
        'message' => 'Halo Rosa',
    ])->assertOk();

    // Pastikan prompt adalah system prompt murni tanpa injeksi otomasi
    expect($interceptedPrompt)->toContain('Kamu adalah CS ramah bernama Rosa.');
    expect($interceptedPrompt)->not->toContain('Panduan Lupa User ID');
    expect($interceptedPrompt)->not->toContain('TAG / SHORTCUT TERPILIH');
});

test('casual question with deposit and saldo does not trigger form escalation', function () {
    Http::fake([
        '*chat/completions' => Http::response([
            'choices' => [
                ['message' => ['role' => 'assistant', 'content' => 'Minimal deposit adalah Rp 10.000 ya Bosku.']],
            ],
        ], 200),
    ]);

    $uuid = (string) Str::uuid();

    $response = $this->postJson("/chat/{$this->chatbot->app_id}/send", [
        'uuid' => $uuid,
        'message' => 'bos minimal depo berapa dan cek saldo dimana?',
    ]);

    $response->assertOk();
    $conv = Conversation::where('uuid', $uuid)->first();
    expect($conv->is_waiting_admin)->toBeFalse();
    expect($response->json('assistant_message.content'))->toContain('Minimal deposit');
});

test('conversation history sent to llm includes admin messages and user context', function () {
    $interceptedMessages = [];
    $interceptedSystem = '';
    Http::fake([
        '*chat/completions' => function ($request) use (&$interceptedMessages, &$interceptedSystem) {
            $data = $request->data();
            $msgs = $data['messages'] ?? [];
            $systemMsg = collect($msgs)->firstWhere('role', 'system');
            $interceptedSystem = $systemMsg['content'] ?? '';
            $interceptedMessages = collect($msgs)->where('role', '!=', 'system')->values()->toArray();

            return Http::response([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => 'Baik, ada yang bisa dibantu lagi?']],
                ],
            ], 200);
        },
    ]);

    $uuid = (string) Str::uuid();
    $conv = Conversation::create([
        'uuid' => $uuid,
        'application_id' => $this->chatbot->id,
        'user_identifier' => 'membergacor123',
        'last_activity_at' => now(),
    ]);

    Message::create([
        'conversation_id' => $conv->id,
        'role' => 'user',
        'content' => 'Halo min',
    ]);

    Message::create([
        'conversation_id' => $conv->id,
        'role' => 'admin',
        'content' => 'Halo Bosku, ini admin CS yang jawab langsung ya.',
    ]);

    $this->postJson("/chat/{$this->chatbot->app_id}/send", [
        'uuid' => $uuid,
        'message' => 'Oke makasih ya min',
    ])->assertOk();

    // Verify admin message was converted to assistant role in history
    $adminInHistory = collect($interceptedMessages)->firstWhere('content', 'Halo Bosku, ini admin CS yang jawab langsung ya.');
    expect($adminInHistory)->not->toBeNull();
    expect($adminInHistory['role'])->toBe('assistant');

    // Verify user context was injected into system prompt
    expect($interceptedSystem)->toContain('membergacor123');
});

test('visitor ending session marks conversation ended by user and adds system notice', function () {
    $uuid = (string) Str::uuid();
    $conversation = Conversation::factory()->create([
        'application_id' => $this->chatbot->id,
        'uuid' => $uuid,
        'last_activity_at' => now(),
    ]);

    $response = $this->postJson("/chat/{$this->chatbot->app_id}/end", [
        'uuid' => $uuid,
    ]);

    $response->assertOk()
        ->assertJson([
            'ended' => true,
            'ended_reason' => 'user',
        ]);

    $this->assertDatabaseHas('conversations', [
        'id' => $conversation->id,
        'ended_reason' => 'user',
    ]);

    $this->assertDatabaseHas('messages', [
        'conversation_id' => $conversation->id,
        'role' => 'system',
        'content' => 'Pengguna telah mengakhiri sesi percakapan.',
    ]);

    $this->postJson("/chat/{$this->chatbot->app_id}/send", [
        'uuid' => $uuid,
        'message' => 'Pesan setelah end chat',
    ])->assertStatus(422)
        ->assertJson([
            'expired' => true,
            'ended_reason' => 'user',
        ]);
});

test('expired conversation marks ended reason as timeout on session check', function () {
    $uuid = (string) Str::uuid();
    $conversation = Conversation::factory()->create([
        'application_id' => $this->chatbot->id,
        'uuid' => $uuid,
        'last_activity_at' => now()->subMinutes(15),
    ]);

    $this->getJson("/chat/{$this->chatbot->app_id}/session/{$uuid}")
        ->assertOk()
        ->assertJson([
            'exists' => true,
            'expired' => true,
            'ended_reason' => 'timeout',
        ]);

    $this->assertDatabaseHas('conversations', [
        'id' => $conversation->id,
        'ended_reason' => 'timeout',
    ]);

    $this->assertDatabaseHas('messages', [
        'conversation_id' => $conversation->id,
        'role' => 'system',
    ]);
});
