<?php

use App\Models\Application;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create([
        'is_admin' => true,
    ]);
});

test('unauthenticated users are redirected from applications list', function () {
    $response = $this->get('/admin/applications');
    $response->assertRedirect('/login');
});

test('admin accessing applications index is redirected to dashboard', function () {
    $response = $this->actingAs($this->admin)->get('/admin/applications');
    $response->assertRedirect('/dashboard');
});

test('admin can create a new application', function () {
    $response = $this->actingAs($this->admin)->post('/admin/applications', [
        'name' => 'Marketing AI Bot',
        'app_id' => 'marketing-bot',
        'description' => 'Bot untuk konten marketing.',
        'system_prompt' => 'Anda adalah ahli pemasaran.',
        'model' => 'Qwen3 1.7B Q4 GGUF',
        'temperature' => 0.8,
        'max_tokens' => 2048,
        'is_active' => true,
    ]);

    $response->assertRedirect('/dashboard');
    $response->assertSessionHas('current_app_id', 'marketing-bot');

    $this->assertDatabaseHas('applications', [
        'app_id' => 'marketing-bot',
        'name' => 'Marketing AI Bot',
        'temperature' => 0.8,
    ]);
});

test('creating application with duplicate app_id fails validation', function () {
    Application::factory()->create(['app_id' => 'existing-bot']);

    $response = $this->actingAs($this->admin)->post('/admin/applications', [
        'name' => 'Duplicate Bot',
        'app_id' => 'existing-bot',
        'system_prompt' => 'Prompt',
        'model' => 'Qwen3',
        'temperature' => 0.7,
        'max_tokens' => 2048,
        'is_active' => true,
    ]);

    $response->assertSessionHasErrors(['app_id']);
});

test('admin can update an application', function () {
    $app = Application::factory()->create([
        'name' => 'Old Name',
        'app_id' => 'old-slug',
    ]);

    $response = $this->actingAs($this->admin)
        ->from("/admin/applications/{$app->id}/edit")
        ->put("/admin/applications/{$app->id}", [
            'name' => 'New Name',
            'app_id' => 'old-slug',
            'system_prompt' => 'Updated prompt',
            'model' => 'Qwen3 1.7B Q4 GGUF',
            'temperature' => 0.5,
            'max_tokens' => 1024,
            'is_active' => false,
        ]);

    $response->assertRedirect("/admin/applications/{$app->id}/edit");

    $this->assertDatabaseHas('applications', [
        'id' => $app->id,
        'name' => 'New Name',
        'is_active' => false,
        'temperature' => 0.5,
    ]);
});

test('admin can toggle application active status', function () {
    $app = Application::factory()->create(['is_active' => true]);

    $response = $this->actingAs($this->admin)->from('/dashboard')->post("/admin/applications/{$app->id}/toggle-status");

    $response->assertRedirect('/dashboard');
    expect($app->fresh()->is_active)->toBeFalse();

    $this->actingAs($this->admin)->from('/dashboard')->post("/admin/applications/{$app->id}/toggle-status");
    expect($app->fresh()->is_active)->toBeTrue();
});

test('admin can switch current active application in session', function () {
    $app1 = Application::factory()->create(['app_id' => 'bot-one']);
    $app2 = Application::factory()->create(['app_id' => 'bot-two']);

    $response = $this->actingAs($this->admin)->from('/dashboard')->post('/admin/applications/switch-current', [
        'app_id' => 'bot-two',
    ]);

    $response->assertRedirect('/dashboard');
    $response->assertSessionHas('current_app_id', 'bot-two');
});

test('admin can delete an application', function () {
    $app = Application::factory()->create();

    $response = $this->actingAs($this->admin)->delete("/admin/applications/{$app->id}");

    $response->assertRedirect('/dashboard');
    $this->assertDatabaseMissing('applications', ['id' => $app->id]);
});
