<?php

use App\Models\Application;
use App\Models\Conversation;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->create([
        'is_admin' => true,
    ]);

    $this->appOne = Application::factory()->create([
        'app_id' => 'bot-alpha',
        'name' => 'Bot Alpha',
        'is_active' => true,
    ]);

    $this->appTwo = Application::factory()->create([
        'app_id' => 'bot-beta',
        'name' => 'Bot Beta',
        'is_active' => true,
    ]);
});

test('unauthenticated users are redirected from conversations page', function () {
    $response = $this->get('/conversations');
    $response->assertRedirect('/login');
});

test('conversations are strictly scoped to the active application in session', function () {
    $convAlpha = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
    ]);
    $convBeta = Conversation::factory()->create([
        'application_id' => $this->appTwo->id,
    ]);

    // When session current_app_id is bot-alpha
    $response = $this->actingAs($this->admin)
        ->withSession(['current_app_id' => 'bot-alpha'])
        ->get('/conversations');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/conversations/index')
            ->where('selectedApp.app_id', 'bot-alpha')
            ->has('conversations', 1)
            ->where('conversations.0.id', $convAlpha->id)
        );

    // When switching session to bot-beta
    $responseBeta = $this->actingAs($this->admin)
        ->withSession(['current_app_id' => 'bot-beta'])
        ->get('/conversations');

    $responseBeta->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/conversations/index')
            ->where('selectedApp.app_id', 'bot-beta')
            ->has('conversations', 1)
            ->where('conversations.0.id', $convBeta->id)
        );
});

test('admin can take over and release a conversation using uuid', function () {
    $conversation = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
        'is_taken_over' => false,
    ]);

    // Takeover using uuid
    $response = $this->actingAs($this->admin)
        ->post("/conversations/{$conversation->uuid}/takeover");

    $response->assertRedirect();
    $this->assertDatabaseHas('conversations', [
        'id' => $conversation->id,
        'is_taken_over' => true,
        'taken_over_by' => $this->admin->id,
    ]);

    // Release takeover using uuid
    $releaseResponse = $this->actingAs($this->admin)
        ->post("/conversations/{$conversation->uuid}/release-takeover");

    $releaseResponse->assertRedirect();
    $this->assertDatabaseHas('conversations', [
        'id' => $conversation->id,
        'is_taken_over' => false,
        'taken_over_by' => null,
    ]);
});

test('admin can view conversation detail page with uuid in whatsapp console', function () {
    $conversation = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
    ]);

    $response = $this->actingAs($this->admin)
        ->get("/conversations/{$conversation->uuid}");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/conversations/index')
            ->where('activeConversation.uuid', $conversation->uuid)
        );
});

test('admin can reply to visitor in conversation', function () {
    $conversation = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
        'is_taken_over' => true,
    ]);

    $response = $this->actingAs($this->admin)
        ->post("/conversations/{$conversation->uuid}/reply", [
            'message' => 'Halo dari admin manusia!',
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('messages', [
        'conversation_id' => $conversation->id,
        'role' => 'assistant',
        'content' => 'Halo dari admin manusia!',
    ]);
});

test('admin can delete a conversation using uuid', function () {
    $conversation = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
    ]);

    $response = $this->actingAs($this->admin)
        ->delete("/conversations/{$conversation->uuid}");

    $response->assertRedirect('/conversations');
    $this->assertDatabaseMissing('conversations', [
        'id' => $conversation->id,
    ]);
});

test('admin reply expands standalone automation shortcut like #bosku', function () {
    $this->appOne->update([
        'chat_settings' => [
            'canned_responses' => [
                [
                    'id' => 'cr-bosku',
                    'shortcut' => 'bosku',
                    'content' => 'Halo Bosku! Ada yang bisa admin bantu hari ini?',
                    'scope' => 'shared',
                ],
            ],
        ],
    ]);

    $conversation = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
        'is_taken_over' => true,
        'taken_over_by' => $this->admin->id,
    ]);

    $response = $this->actingAs($this->admin)
        ->post("/conversations/{$conversation->uuid}/reply", [
            'message' => '#bosku',
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('messages', [
        'conversation_id' => $conversation->id,
        'role' => 'admin',
        'content' => 'Halo Bosku! Ada yang bisa admin bantu hari ini?',
    ]);
});

test('admin console syncs expired conversations and filters ended status', function () {
    $expiredConv = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
        'last_activity_at' => now()->subMinutes(20),
    ]);

    $userEndedConv = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
        'ended_reason' => 'user',
        'ended_at' => now()->subMinute(),
    ]);

    $activeConv = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
        'last_activity_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)
        ->withSession(['current_app_id' => 'bot-alpha'])
        ->get('/conversations?status=ended');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/conversations/index')
            ->where('counts.ended', 2)
            ->has('conversations', 2)
        );

    $this->assertDatabaseHas('conversations', [
        'id' => $expiredConv->id,
        'ended_reason' => 'timeout',
    ]);
    $this->assertDatabaseHas('conversations', [
        'id' => $userEndedConv->id,
        'ended_reason' => 'user',
    ]);
    $this->assertDatabaseHas('conversations', [
        'id' => $activeConv->id,
        'ended_reason' => null,
    ]);
});

test('notifications endpoint returns combined unread escalations and unanswered chat counts', function () {
    $waitingConv = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
    ]);
    $waitingConv->messages()->create([
        'role' => 'user',
        'content' => 'Halo admin',
    ]);

    $endedConv = Conversation::factory()->create([
        'application_id' => $this->appOne->id,
        'ended_reason' => 'user',
        'ended_at' => now(),
    ]);
    $endedConv->messages()->create([
        'role' => 'user',
        'content' => 'Sudah ditutup',
    ]);

    $this->actingAs($this->admin)
        ->getJson('/admin/notifications')
        ->assertOk()
        ->assertJsonPath('chat_notifications.unread_chats', 1)
        ->assertJsonPath('chat_notifications.total_notifications', 1);
});
