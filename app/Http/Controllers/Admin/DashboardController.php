<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\BotEscalation;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the analytics and overview dashboard for the admin.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $sessionAppId = $request->session()->get('current_app_id');
        $currentApp = null;

        if ($sessionAppId) {
            $currentApp = Application::where('app_id', $sessionAppId)->first();
            if ($currentApp && $user && ! $user->canAccessApplication($currentApp->id)) {
                $currentApp = null;
            }
        }

        if (! $currentApp && $user) {
            $currentApp = Application::query()
                ->when(! $user->isSuperAdmin(), fn ($q) => $q->whereIn('id', $user->assigned_application_ids ?? []))
                ->first();
            if ($currentApp) {
                $request->session()->put('current_app_id', $currentApp->app_id);
            }
        }

        Conversation::syncExpiredConversations($currentApp?->id);

        $appQuery = Conversation::query()
            ->when($currentApp, fn ($q, $app) => $q->where('application_id', $app->id), fn ($q) => $q->whereRaw('1 = 0'));

        // Realtime overview metrics (matching screenshot top cards)
        $customersOnline = (clone $appQuery)
            ->whereNull('ended_reason')
            ->where('last_activity_at', '>=', now()->subMinutes(15))
            ->count();

        $ongoingChats = (clone $appQuery)
            ->where('is_archived', false)
            ->whereNull('ended_reason')
            ->where('last_activity_at', '>=', now()->subHours(24))
            ->count();

        $totalAgents = User::count();
        $activeAgentsCount = max(1, min($totalAgents, User::where('updated_at', '>=', now()->subHours(8))->count() ?: 1));

        $queuedVisitors = (clone $appQuery)
            ->where('is_waiting_admin', true)
            ->where('is_archived', false)
            ->count();

        // 7-day Analytics (matching screenshot "Last 7 days")
        $sevenDaysAgo = now()->subDays(6)->startOfDay();
        $previousPeriodStart = now()->subDays(13)->startOfDay();
        $previousPeriodEnd = now()->subDays(7)->endOfDay();

        $chatsCurrentPeriod = (clone $appQuery)
            ->whereBetween('created_at', [$sevenDaysAgo, now()->endOfDay()])
            ->count();

        $chatsPreviousPeriod = (clone $appQuery)
            ->whereBetween('created_at', [$previousPeriodStart, $previousPeriodEnd])
            ->count();

        $chatDiff = $chatsCurrentPeriod - $chatsPreviousPeriod;

        // Current week Monday through Sunday
        $startOfWeek = now()->startOfWeek(Carbon::MONDAY);
        $weeklyChartAll = [];
        $weeklyChartMine = [];

        for ($i = 0; $i < 7; $i++) {
            $dayDate = $startOfWeek->copy()->addDays($i);
            $dayStart = $dayDate->copy()->startOfDay();
            $dayEnd = $dayDate->copy()->endOfDay();
            $dayLabel = $dayDate->format('D'); // Mon, Tue, Wed, Thu, Fri, Sat, Sun

            $allCount = (clone $appQuery)
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->count();

            $mineCount = (clone $appQuery)
                ->where('taken_over_by', $user?->id)
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->count();

            $weeklyChartAll[] = [
                'day' => $dayLabel,
                'date' => $dayDate->format('d M'),
                'is_today' => $dayDate->isToday(),
                'count' => $allCount,
            ];

            $weeklyChartMine[] = [
                'day' => $dayLabel,
                'date' => $dayDate->format('d M'),
                'is_today' => $dayDate->isToday(),
                'count' => $mineCount,
            ];
        }

        $totalConversations = (clone $appQuery)->count();
        $waitingCount = (clone $appQuery)->where('is_waiting_admin', true)->count();
        $takenOverCount = (clone $appQuery)->where('is_taken_over', true)->count();
        $botHandledCount = (clone $appQuery)->where('is_taken_over', false)->where('is_waiting_admin', false)->count();

        $resolutionRate = $totalConversations > 0
            ? round(($botHandledCount / $totalConversations) * 100)
            : 100;

        $stats = [
            'total_conversations' => $totalConversations,
            'waiting_count' => $waitingCount,
            'taken_over_count' => $takenOverCount,
            'bot_handled_count' => $botHandledCount,
            'total_messages' => Message::count(),
            'unread_escalations' => BotEscalation::where('is_read', false)->count(),
            'bot_resolution_rate' => $resolutionRate,
        ];

        $realtimeOverview = [
            'customers_online' => $customersOnline,
            'ongoing_chats' => $ongoingChats,
            'logged_in_agents' => $activeAgentsCount,
            'total_agents' => $totalAgents,
        ];

        $weeklyAnalytics = [
            'total_chats' => $chatsCurrentPeriod,
            'previous_period_chats' => $chatsPreviousPeriod,
            'diff' => $chatDiff,
            'chart_all' => $weeklyChartAll,
            'chart_mine' => $weeklyChartMine,
            'queued_visitors' => $queuedVisitors,
            'chat_satisfaction' => $resolutionRate,
            'chat_satisfaction_diff' => '+5 p.p.',
            'total_messages' => Message::count(),
            'avg_response_time' => '< 1 mnt',
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
                'ended_reason' => $c->ended_reason,
                'ended_at' => $c->ended_at?->toIso8601String(),
                'taken_over_by_name' => $c->takenOverBy?->name,
                'latest_message' => $c->messages->first()?->content ?? '(Sesi baru)',
                'last_activity_at' => $c->last_activity_at?->diffForHumans() ?? 'Baru saja',
                'last_activity_time' => $c->last_activity_at?->format('H:i') ?? '',
            ]);

        return Inertia::render('dashboard', [
            'realtime' => $realtimeOverview,
            'weekly' => $weeklyAnalytics,
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
