<?php

namespace App\Http\Middleware;

use App\Models\Application;
use App\Models\BotEscalation;
use App\Models\Conversation;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'allApplications' => function () use ($request) {
                $user = $request->user();
                if (! $user) {
                    return [];
                }

                return Application::query()
                    ->when(! $user->isSuperAdmin(), fn ($q) => $q->whereIn('id', $user->assigned_application_ids ?? []))
                    ->select(['id', 'app_id', 'name', 'is_active', 'model'])
                    ->selectRaw("JSON_UNQUOTE(JSON_EXTRACT(chat_settings, '$.custom_icon_url')) as custom_icon_url")
                    ->orderBy('id', 'desc')
                    ->get()
                    ->map(fn ($app) => [
                        'id' => $app->id,
                        'app_id' => $app->app_id,
                        'name' => $app->name,
                        'is_active' => (bool) $app->is_active,
                        'model' => $app->model,
                        'chat_settings' => [
                            'custom_icon_url' => $app->custom_icon_url && $app->custom_icon_url !== 'null' ? $app->custom_icon_url : null,
                        ],
                    ]);
            },
            'applications' => function () use ($request) {
                $user = $request->user();
                if (! $user) {
                    return [];
                }

                return Application::query()
                    ->when(! $user->isSuperAdmin(), fn ($q) => $q->whereIn('id', $user->assigned_application_ids ?? []))
                    ->select(['id', 'app_id', 'name', 'is_active', 'model'])
                    ->selectRaw("JSON_UNQUOTE(JSON_EXTRACT(chat_settings, '$.custom_icon_url')) as custom_icon_url")
                    ->orderBy('id', 'desc')
                    ->get()
                    ->map(fn ($app) => [
                        'id' => $app->id,
                        'app_id' => $app->app_id,
                        'name' => $app->name,
                        'is_active' => (bool) $app->is_active,
                        'model' => $app->model,
                        'chat_settings' => [
                            'custom_icon_url' => $app->custom_icon_url && $app->custom_icon_url !== 'null' ? $app->custom_icon_url : null,
                        ],
                    ]);
            },
            'currentAppId' => function () use ($request) {
                $user = $request->user();
                if (! $user) {
                    return null;
                }

                $sessionAppId = $request->session()->get('current_app_id');
                if ($sessionAppId) {
                    $app = Application::where('app_id', $sessionAppId)->first();
                    if ($app && $user->canAccessApplication($app->id)) {
                        return $sessionAppId;
                    }
                }

                $firstAccessible = Application::query()
                    ->when(! $user->isSuperAdmin(), fn ($q) => $q->whereIn('id', $user->assigned_application_ids ?? []))
                    ->first();

                if ($firstAccessible) {
                    $request->session()->put('current_app_id', $firstAccessible->app_id);

                    return $firstAccessible->app_id;
                }

                return null;
            },
            'escalations' => fn () => $request->user() ? [
                'unread_count' => BotEscalation::where('is_read', false)->count(),
                'recent' => BotEscalation::with('application:id,name,app_id')
                    ->latest()
                    ->take(10)
                    ->get()
                    ->map(fn ($e) => [
                        'id' => $e->id,
                        'application_name' => $e->application?->name ?? 'Chatbot',
                        'application_app_id' => $e->application?->app_id ?? '',
                        'conversation_uuid' => $e->conversation_id ? Conversation::where('id', $e->conversation_id)->value('uuid') : '',
                        'user_identifier' => $e->user_identifier ?? 'Pengunjung',
                        'type' => $e->type,
                        'title' => $e->title,
                        'message' => $e->message,
                        'is_read' => (bool) $e->is_read,
                        'is_resolved' => (bool) $e->is_resolved,
                        'created_at' => $e->created_at?->diffForHumans() ?? 'Baru saja',
                        'created_at_time' => $e->created_at?->format('H:i') ?? '',
                    ]),
            ] : null,
        ];
    }
}
