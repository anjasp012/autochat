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

// Admin panel routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Applications Management
    Route::post('admin/applications/switch-current', [ApplicationController::class, 'switchCurrent'])->name('admin.applications.switch-current');
    Route::post('admin/applications/{application}/toggle-status', [ApplicationController::class, 'toggleStatus'])->name('admin.applications.toggle-status');
    Route::resource('admin/applications', ApplicationController::class)->names('admin.applications');

    // Conversations & Human Takeover Management
    Route::post('admin/conversations/{conversation}/takeover', [ConversationController::class, 'takeover'])->name('admin.conversations.takeover');
    Route::post('admin/conversations/{conversation}/release-takeover', [ConversationController::class, 'releaseTakeover'])->name('admin.conversations.release-takeover');
    Route::post('admin/conversations/{conversation}/reply', [ConversationController::class, 'reply'])->name('admin.conversations.reply');
    Route::resource('admin/conversations', ConversationController::class)->only(['index', 'show', 'destroy'])->names('admin.conversations');

    // Knowledge Base placeholder
    Route::inertia('admin/knowledge-base', 'admin/knowledge-base/index')->name('admin.knowledge-base.index');
});

require __DIR__.'/settings.php';

// Direct slug route (e.g. domain/slug opens chatbot directly)
Route::get('{application:app_id}', [ChatController::class, 'show'])
    ->where('application', '^(?!dashboard|admin|login|logout|register|forgot-password|reset-password|settings|storage|up|_boost|_inertia).*$')
    ->name('chat.direct');
