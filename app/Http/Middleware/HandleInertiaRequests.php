<?php

namespace App\Http\Middleware;

use App\Models\Application;
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
            'allApplications' => fn () => $request->user()
                ? Application::query()
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
                    ])
                : [],
            'applications' => fn () => $request->user()
                ? Application::query()
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
                    ])
                : [],
            'currentAppId' => fn () => $request->session()->get('current_app_id')
                ?? Application::query()->where('is_active', true)->value('app_id')
                ?? Application::query()->value('app_id'),
        ];
    }
}
