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

test('admin can view bot setting page', function () {
    $app = Application::factory()->create([
        'app_id' => 'support-bot',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->admin)
        ->withSession(['current_app_id' => 'support-bot'])
        ->get('/setting');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/settings/index')
            ->where('application.app_id', 'support-bot')
        );
});

test('admin can create a new application', function () {
    $response = $this->actingAs($this->admin)->post('/admin/applications', [
        'name' => 'Marketing AI Bot',
        'app_id' => 'marketing-bot',
        'description' => 'Bot untuk konten marketing.',
        'system_prompt' => 'Anda adalah ahli pemasaran.',
        'model' => 'openai/gpt-oss-120b',
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
        'model' => 'openai/gpt-oss-120b',
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
            'model' => 'openai/gpt-oss-120b',
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

test('operator can view bot setting page for assigned application', function () {
    $app = Application::factory()->create([
        'app_id' => 'cs-assigned-bot',
        'is_active' => true,
    ]);
    $operator = User::factory()->create([
        'role' => 'operator',
        'is_admin' => false,
        'assigned_application_ids' => [$app->id],
    ]);

    $response = $this->actingAs($operator)->get('/setting');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/settings/index')
            ->where('application.app_id', 'cs-assigned-bot')
        );
});

test('operator without assigned applications receives forbidden on bot setting page', function () {
    Application::factory()->create(['app_id' => 'unassigned-bot']);
    $operator = User::factory()->create([
        'role' => 'operator',
        'is_admin' => false,
        'assigned_application_ids' => [],
    ]);

    $this->actingAs($operator)
        ->get('/setting')
        ->assertForbidden();
});

test('operator can only update automate canned responses and cannot alter other bot settings', function () {
    $app = Application::factory()->create([
        'name' => 'Original Bot',
        'app_id' => 'original-bot',
        'system_prompt' => 'Prompt asli tetap aman.',
        'model' => 'openai/gpt-oss-120b',
        'is_active' => true,
        'chat_settings' => [
            'bg_color' => '#112233',
            'welcome_opening' => 'Selamat datang original',
            'canned_responses' => [
                [
                    'id' => 'cr-old',
                    'shortcut' => 'lama',
                    'content' => 'Pesan lama',
                    'scope' => 'shared',
                ],
            ],
        ],
    ]);

    $operator = User::factory()->create([
        'role' => 'operator',
        'is_admin' => false,
        'assigned_application_ids' => [$app->id],
    ]);

    $response = $this->actingAs($operator)
        ->from('/setting')
        ->put("/applications/{$app->id}", [
            'name' => 'Hacked Name',
            'app_id' => 'hacked-slug',
            'system_prompt' => 'Prompt diubah operator',
            'is_active' => false,
            'chat_settings' => [
                'bg_color' => '#ff0000',
                'canned_responses' => [
                    [
                        'id' => 'cr-new',
                        'shortcut' => '#PromoBaru',
                        'content' => 'Info promo terbaru hari ini.',
                        'scope' => 'shared',
                    ],
                ],
            ],
        ]);

    $response->assertRedirect('/setting');

    $fresh = $app->fresh();
    expect($fresh->name)->toBe('Original Bot');
    expect($fresh->app_id)->toBe('original-bot');
    expect($fresh->system_prompt)->toBe('Prompt asli tetap aman.');
    expect($fresh->is_active)->toBeTrue();
    expect($fresh->chat_settings['bg_color'])->toBe('#112233');
    expect($fresh->chat_settings['welcome_opening'])->toBe('Selamat datang original');
    expect($fresh->chat_settings['canned_responses'])->toHaveCount(1);
    expect($fresh->chat_settings['canned_responses'][0]['shortcut'])->toBe('promobaru');
    expect($fresh->chat_settings['canned_responses'][0]['content'])->toBe('Info promo terbaru hari ini.');
});

test('operator cannot update unassigned application or create delete or toggle applications', function () {
    $assignedApp = Application::factory()->create(['app_id' => 'assigned-app']);
    $otherApp = Application::factory()->create(['app_id' => 'other-app', 'is_active' => true]);
    $operator = User::factory()->create([
        'role' => 'operator',
        'is_admin' => false,
        'assigned_application_ids' => [$assignedApp->id],
    ]);

    $this->actingAs($operator)
        ->put("/applications/{$otherApp->id}", [
            'chat_settings' => [
                'canned_responses' => [],
            ],
        ])
        ->assertForbidden();

    $this->actingAs($operator)
        ->post('/admin/applications', [
            'name' => 'New App',
            'app_id' => 'new-app',
            'system_prompt' => 'Prompt',
        ])
        ->assertForbidden();

    $this->actingAs($operator)
        ->post("/admin/applications/{$assignedApp->id}/toggle-status")
        ->assertForbidden();

    $this->actingAs($operator)
        ->delete("/admin/applications/{$assignedApp->id}")
        ->assertForbidden();

    expect($otherApp->fresh()->is_active)->toBeTrue();
    $this->assertDatabaseHas('applications', ['id' => $assignedApp->id]);
});
