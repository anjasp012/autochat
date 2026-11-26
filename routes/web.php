<?php

use App\Http\Controllers\Admin\ApplicationController;
use App\Http\Controllers\Admin\ConversationController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\ChatController;
use App\Models\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

// Akses domain utama dikosongkan (tidak menampilkan welcome page)
Route::get('/', fn () => response(''))->name('home');

// CMS Login dan panel admin diakses via /adminbot
Route::get('adminbot', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
})->name('adminbot');

Route::get('adminbot/login', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
});

Route::get('admin', fn () => redirect('adminbot'));

// Public Chat routes
Route::get('chat', function () {
    $appId = Application::where('is_active', true)->value('app_id')
        ?? Application::value('app_id')
        ?? 'customer-support';

    return redirect()->route('chat.show', ['application' => $appId]);
})->name('chat.default');

Route::get('chat/{application:app_id}', [ChatController::class, 'show'])->name('chat.show');
Route::get('chat/{application:app_id}/config', [ChatController::class, 'getWidgetConfig'])->name('chat.config');
Route::post('chat/{application:app_id}/send', [ChatController::class, 'sendMessage'])->name('chat.send');
Route::post('chat/{application:app_id}/end', [ChatController::class, 'endSession'])->name('chat.end');
Route::get('chat/{application:app_id}/session/{uuid}', [ChatController::class, 'getSessionMessages'])->name('chat.session');

// Authenticated Panel Routes (Direct Menu URLs without /admin)
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Knowledge Base
    Route::inertia('knowledge-base', 'admin/knowledge-base/index')->name('knowledge-base.index');
    Route::get('admin/knowledge-base', fn () => redirect('/knowledge-base'));

    // Bot Escalation Notifications
    Route::get('admin/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('admin/notifications/{escalation}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('admin/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');

    // Conversations & Human Takeover Management (WhatsApp-Style Live Console)
    Route::get('conversations', [ConversationController::class, 'index'])->name('conversations.index');
    Route::get('conversations/{conversation:uuid}', [ConversationController::class, 'show'])->name('conversations.show');
    Route::get('conversations/{conversation:uuid}/messages', [ConversationController::class, 'messages'])->name('conversations.messages');
    Route::post('conversations/{conversation:uuid}/takeover', [ConversationController::class, 'takeover'])->name('conversations.takeover');
    Route::post('conversations/{conversation:uuid}/release-takeover', [ConversationController::class, 'releaseTakeover'])->name('conversations.release-takeover');
    Route::post('conversations/{conversation:uuid}/archive', [ConversationController::class, 'archive'])->name('conversations.archive');
    Route::post('conversations/{conversation:uuid}/unarchive', [ConversationController::class, 'unarchive'])->name('conversations.unarchive');
    Route::post('conversations/{conversation:uuid}/reply', [ConversationController::class, 'reply'])->name('conversations.reply');
    Route::delete('conversations/destroy-all', [ConversationController::class, 'destroyAll'])->name('conversations.destroy-all');
    Route::delete('conversations/{conversation:uuid}', [ConversationController::class, 'destroy'])->name('conversations.destroy');

    // Backwards compatibility for conversations
    Route::get('admin/conversations', fn () => redirect('/conversations'));
    Route::get('admin/conversations/{conversation:uuid}', fn ($conversation) => redirect("/conversations/{$conversation}"));
    Route::get('admin/conversations/{conversation:uuid}/messages', [ConversationController::class, 'messages']);
    Route::post('admin/conversations/{conversation:uuid}/takeover', [ConversationController::class, 'takeover']);
    Route::post('admin/conversations/{conversation:uuid}/release-takeover', [ConversationController::class, 'releaseTakeover']);
    Route::post('admin/conversations/{conversation:uuid}/reply', [ConversationController::class, 'reply']);
    Route::delete('admin/conversations/destroy-all', [ConversationController::class, 'destroyAll']);
    Route::delete('admin/conversations/{conversation:uuid}', [ConversationController::class, 'destroy']);

    // Bot Settings (Direct Menu: /setting)
    Route::get('setting', [ApplicationController::class, 'settings'])->name('setting');
    Route::get('admin/settings', fn () => redirect('/setting'));
    Route::get('admin/setting', fn () => redirect('/setting'));

    // Applications Management (Direct routes & backwards compatibility)
    Route::get('applications', fn () => redirect()->route('dashboard'))->name('applications.index');
    Route::get('admin/applications', fn () => redirect()->route('dashboard'));

    Route::post('applications/switch-current', [ApplicationController::class, 'switchCurrent'])->name('applications.switch-current');
    Route::post('admin/applications/switch-current', [ApplicationController::class, 'switchCurrent']);

    Route::post('applications/{application}/toggle-status', [ApplicationController::class, 'toggleStatus'])->name('applications.toggle-status');
    Route::post('admin/applications/{application}/toggle-status', [ApplicationController::class, 'toggleStatus']);

    Route::get('applications/create', [ApplicationController::class, 'create'])->name('applications.create');
    Route::get('admin/applications/create', [ApplicationController::class, 'create']);

    Route::post('applications', [ApplicationController::class, 'store'])->name('applications.store');
    Route::post('admin/applications', [ApplicationController::class, 'store']);

    Route::get('applications/{application}/edit', [ApplicationController::class, 'edit'])->name('applications.edit');
    Route::get('admin/applications/{application}/edit', [ApplicationController::class, 'edit']);

    Route::put('applications/{application}', [ApplicationController::class, 'update'])->name('applications.update');
    Route::put('admin/applications/{application}', [ApplicationController::class, 'update']);

    Route::delete('applications/{application}', [ApplicationController::class, 'destroy'])->name('applications.destroy');
    Route::delete('admin/applications/{application}', [ApplicationController::class, 'destroy']);

    Route::get('admin/applications', fn () => redirect('/dashboard'));
});

require __DIR__.'/settings.php';

// Fallback route for uploaded chat media (images & videos) if public symlink is not created
Route::get('storage/{path}', function (string $path) {
    if (! Storage::disk('public')->exists($path)) {
        abort(404);
    }

    return Storage::disk('public')->response($path);
})->where('path', '.*')->name('storage.media');

// Direct slug route (e.g. domain/slug opens chatbot directly)
Route::get('{application:app_id}', [ChatController::class, 'show'])
    ->where('application', '^(?!dashboard|admin|adminbot|login|logout|register|forgot-password|reset-password|settings|setting|knowledge-base|conversations|applications|chat|storage|up|_boost|_inertia).*$')
    ->name('chat.direct');
