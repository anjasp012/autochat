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

test('lupa pas prioritizes reset automation over generic lupa', function () {
    $this->chatbot->update([
        'chat_settings' => [
            'canned_responses' => [
                [
                    'id' => 'cr-lupa',
                    'shortcut' => 'lupa',
                    'content' => 'Panduan Lupa User ID: Mohon kirim data rekening.',
                ],
                [
                    'id' => 'cr-reset',
                    'shortcut' => 'reset',
                    'content' => 'Panduan Reset Password: Silakan klik menu Lupa Password di situs.',
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
                    ['message' => ['role' => 'assistant', 'content' => 'Silakan klik menu Lupa Password untuk reset kata sandi.']],
                ],
            ], 200);
        },
    ]);

    $uuid = (string) Str::uuid();

    $this->postJson("/chat/{$this->chatbot->app_id}/send", [
        'uuid' => $uuid,
        'message' => 'bos saya lupa pas akun saya',
    ])->assertOk();

    // Pastikan prompt memprioritaskan #reset daripada #lupa
    expect($interceptedPrompt)->toContain('TAG / SHORTCUT TERPILIH: #reset');
});

test('multi-turn follow up preserves pasaran togel context for short responses', function () {
    $uuid = (string) Str::uuid();

    $conv = Conversation::create([
        'uuid' => $uuid,
        'application_id' => $this->chatbot->id,
        'last_activity_at' => now(),
    ]);

    // Turn 1
    Message::create([
        'conversation_id' => $conv->id,
        'role' => 'user',
        'content' => 'pasaran hongkong',
    ]);
    Message::create([
        'conversation_id' => $conv->id,
        'role' => 'assistant',
        'content' => 'Untuk prediksi angka terbaru di Pasaran Hong Kong... Kalau ada pasar lain yang ingin Bosku lihat tinggal bilang ya!',
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
                    ['message' => ['role' => 'assistant', 'content' => 'Prediksi pasaran Kentucky hari ini.']],
                ],
            ], 200);
        },
    ]);

    // Turn 2: User says only "kentucky"
    $this->postJson("/chat/{$this->chatbot->app_id}/send", [
        'uuid' => $uuid,
        'message' => 'kentucky',
    ])->assertOk();

    // Verify context hint and pasaran URL are present in prompt
    expect($interceptedPrompt)->toContain('Pengguna sedang menyebut nama PASARAN TOGEL ("kentucky")');
    expect($interceptedPrompt)->toContain('pasaran=kentucky');
});
