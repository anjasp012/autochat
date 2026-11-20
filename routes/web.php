<?php

use App\Http\Controllers\Admin\ApplicationController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Public Chat routes
Route::inertia('/chat', 'chat/show')->name('chat.default');
Route::inertia('/chat/{app_id}', 'chat/show')->name('chat.show');

// Admin panel routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Applications Management
    Route::post('admin/applications/switch-current', [ApplicationController::class, 'switchCurrent'])->name('admin.applications.switch-current');
    Route::post('admin/applications/{application}/toggle-status', [ApplicationController::class, 'toggleStatus'])->name('admin.applications.toggle-status');
    Route::resource('admin/applications', ApplicationController::class)->names('admin.applications');

    // Knowledge Base & Conversations
    Route::inertia('admin/knowledge-base', 'admin/knowledge-base/index')->name('admin.knowledge-base.index');
    Route::inertia('admin/conversations', 'admin/conversations/index')->name('admin.conversations.index');
});

require __DIR__.'/settings.php';
