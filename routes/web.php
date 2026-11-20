<?php

use App\Http\Controllers\Admin\ApplicationController;
use App\Http\Controllers\Admin\ConversationController;
use App\Http\Controllers\ChatController;
use App\Models\Application;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Public Chat routes
Route::get('chat', function () {
    $appId = Application::where('is_active', true)->value('app_id')
        ?? Application::value('app_id')
        ?? 'customer-support';

    return redirect()->route('chat.show', ['application' => $appId]);
})->name('chat.default');

Route::get('chat/{application:app_id}', [ChatController::class, 'show'])->name('chat.show');
Route::post('chat/{application:app_id}/send', [ChatController::class, 'sendMessage'])->name('chat.send');
Route::get('chat/{application:app_id}/session/{uuid}', [ChatController::class, 'getSessionMessages'])->name('chat.session');

// Authenticated Panel Routes (Direct Menu URLs without /admin)
Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Knowledge Base
    Route::inertia('knowledge-base', 'admin/knowledge-base/index')->name('knowledge-base.index');
    Route::redirect('admin/knowledge-base', '/knowledge-base');

    // Conversations & Human Takeover Management (WhatsApp-Style Live Console)
    Route::get('conversations', [ConversationController::class, 'index'])->name('conversations.index');
    Route::get('conversations/{conversation:uuid}', [ConversationController::class, 'show'])->name('conversations.show');
    Route::post('conversations/{conversation:uuid}/takeover', [ConversationController::class, 'takeover'])->name('conversations.takeover');
    Route::post('conversations/{conversation:uuid}/release-takeover', [ConversationController::class, 'releaseTakeover'])->name('conversations.release-takeover');
    Route::post('conversations/{conversation:uuid}/reply', [ConversationController::class, 'reply'])->name('conversations.reply');
    Route::delete('conversations/{conversation:uuid}', [ConversationController::class, 'destroy'])->name('conversations.destroy');

    // Backwards compatibility redirects for conversations
    Route::redirect('admin/conversations', '/conversations');
    Route::get('admin/conversations/{conversation:uuid}', fn ($conversation) => redirect("/conversations/{$conversation}"));

    // Bot Settings (Direct Menu: /setting)
    Route::get('setting', [ApplicationController::class, 'settings'])->name('setting');
    Route::redirect('admin/settings', '/setting');
    Route::redirect('admin/setting', '/setting');

    // Applications Management
    Route::post('applications/switch-current', [ApplicationController::class, 'switchCurrent'])->name('applications.switch-current');
    Route::post('applications/{application}/toggle-status', [ApplicationController::class, 'toggleStatus'])->name('applications.toggle-status');
    Route::get('applications/create', [ApplicationController::class, 'create'])->name('applications.create');
    Route::post('applications', [ApplicationController::class, 'store'])->name('applications.store');
    Route::get('applications/{application}/edit', [ApplicationController::class, 'edit'])->name('applications.edit');
    Route::put('applications/{application}', [ApplicationController::class, 'update'])->name('applications.update');
    Route::delete('applications/{application}', [ApplicationController::class, 'destroy'])->name('applications.destroy');

    // Backwards compatibility redirects for admin/applications
    Route::redirect('admin/applications', '/dashboard');
    Route::redirect('admin/applications/create', '/applications/create');
    Route::post('admin/applications/switch-current', [ApplicationController::class, 'switchCurrent']);
});

require __DIR__.'/settings.php';

// Direct slug route (e.g. domain/slug opens chatbot directly)
Route::get('{application:app_id}', [ChatController::class, 'show'])
    ->where('application', '^(?!dashboard|admin|login|logout|register|forgot-password|reset-password|settings|setting|knowledge-base|conversations|applications|chat|storage|up|_boost|_inertia).*$')
    ->name('chat.direct');
