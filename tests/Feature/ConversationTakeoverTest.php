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
