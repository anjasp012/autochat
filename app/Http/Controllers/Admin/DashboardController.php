<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\BotEscalation;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the analytics and overview dashboard for the admin.
     */
    public function index(Request $request): Response
    {
        $sessionAppId = $request->session()->get('current_app_id');
        $currentApp = null;

        if ($sessionAppId) {
            $currentApp = Application::where('app_id', $sessionAppId)->first();
        }

        if (! $currentApp) {
            $currentApp = Application::where('is_active', true)->first() ?? Application::first();
        }

        $appQuery = Conversation::query()
            ->when($currentApp, fn ($q, $app) => $q->where('application_id', $app->id));

        $totalConversations = (clone $appQuery)->count();
        $waitingCount = (clone $appQuery)->where('is_waiting_admin', true)->count();
        $takenOverCount = (clone $appQuery)->where('is_taken_over', true)->count();
        $botHandledCount = (clone $appQuery)->where('is_taken_over', false)->where('is_waiting_admin', false)->count();

        $stats = [
            'total_conversations' => $totalConversations,
            'waiting_count' => $waitingCount,
            'taken_over_count' => $takenOverCount,
            'bot_handled_count' => $botHandledCount,
            'total_messages' => Message::count(),
            'unread_escalations' => BotEscalation::where('is_read', false)->count(),
            'bot_resolution_rate' => $totalConversations > 0
                ? round(($botHandledCount / $totalConversations) * 100)
                : 100,
        ];

        $recentEscalations = BotEscalation::query()
            ->when($currentApp, fn ($q, $app) => $q->where('application_id', $app->id))
            ->latest('id')
            ->limit(6)
            ->get()
            ->map(fn (BotEscalation $e) => [
                'id' => $e->id,
                'conversation_uuid' => $e->conversation?->uuid ?? '',
                'user_identifier' => $e->user_identifier ?? 'Pengunjung',
                'type' => $e->type,
                'title' => $e->title,
                'message' => $e->message,
                'is_read' => (bool) $e->is_read,
                'created_at' => $e->created_at?->diffForHumans() ?? 'Baru saja',
                'created_at_time' => $e->created_at?->format('H:i') ?? '',
            ]);

        $recentConversations = (clone $appQuery)
            ->with([
                'messages' => fn ($q) => $q->orderBy('created_at', 'desc')->limit(1),
                'takenOverBy:id,name',
            ])
            ->latest('last_activity_at')
            ->limit(8)
            ->get()
            ->map(fn (Conversation $c) => [
                'id' => $c->id,
                'uuid' => $c->uuid,
                'user_identifier' => $c->user_identifier,
                'is_waiting_admin' => (bool) $c->is_waiting_admin,
                'is_taken_over' => (bool) $c->is_taken_over,
                'taken_over_by_name' => $c->takenOverBy?->name,
                'latest_message' => $c->messages->first()?->content ?? '(Sesi baru)',
                'last_activity_at' => $c->last_activity_at?->diffForHumans() ?? 'Baru saja',
                'last_activity_time' => $c->last_activity_at?->format('H:i') ?? '',
            ]);

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'recentEscalations' => $recentEscalations,
            'recentConversations' => $recentConversations,
            'activeApp' => $currentApp ? [
                'id' => $currentApp->id,
                'app_id' => $currentApp->app_id,
                'name' => $currentApp->name,
                'model' => $currentApp->model,
                'is_active' => (bool) $currentApp->is_active,
            ] : null,
        ]);
    }
}
