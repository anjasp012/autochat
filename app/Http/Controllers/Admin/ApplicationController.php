<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreApplicationRequest;
use App\Http\Requests\UpdateApplicationRequest;
use App\Models\Application;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationController extends Controller
{
    /**
     * Display a listing of applications.
     */
    public function index(): RedirectResponse
    {
        return redirect()->route('dashboard');
    }

    /**
     * Display settings for currently selected application.
     */
    public function settings(Request $request): Response
    {
        $sessionAppId = $request->session()->get('current_app_id');
        $application = null;

        $user = $request->user();
        abort_if(! $user, 403);

        if ($sessionAppId) {
            $application = Application::where('app_id', $sessionAppId)->first();
            if ($application && ! $user->canAccessApplication($application->id)) {
                $application = null;
            }
        }

        if (! $application) {
            $application = Application::query()
                ->when(! $user->isSuperAdmin(), fn ($q) => $q->whereIn('id', $user->assigned_application_ids ?? []))
                ->first();
            if ($application) {
                $request->session()->put('current_app_id', $application->app_id);
            }
        }

        if (! $application) {
            if (! $user->isSuperAdmin()) {
                abort(403, 'Belum ada aplikasi yang ditetapkan untuk akun Anda.');
            }

            abort(404, 'Belum ada aplikasi yang dibuat.');
        }

        $application->loadCount(['conversations', 'knowledgeSources', 'knowledgeChunks']);

        return Inertia::render('admin/settings/index', [
            'application' => $application,
        ]);
    }

    /**
     * Show the form for creating a new application.
     */
    public function create(Request $request): Response
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403, 'Hanya Admin Utama yang berhak membuat aplikasi baru.');

        $defaultModel = SystemSetting::get('ai_model') ?: config('ai.model', 'openai/gpt-oss-120b');

        return Inertia::render('admin/applications/create', [
            'defaults' => [
                'model' => $defaultModel,
                'temperature' => 0.70,
                'max_tokens' => 2048,
                'system_prompt' => 'Anda adalah asisten AI yang ramah, sopan, dan profesional. Jawablah setiap pertanyaan secara jelas dan ringkas berdasarkan informasi yang relevan.',
            ],
        ]);
    }

    /**
     * Store a newly created application in storage.
     */
    public function store(StoreApplicationRequest $request): RedirectResponse
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403, 'Hanya Admin Utama yang berhak membuat aplikasi baru.');

        $application = Application::create($request->validated());

        // Set as current app in session
        $request->session()->put('current_app_id', $application->app_id);

        return redirect()
            ->route('dashboard')
            ->with('success', "Aplikasi '{$application->name}' berhasil dibuat.");
    }

    /**
     * Show the form for editing the specified application.
     */
    public function edit(Request $request, Application $application): Response
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403, 'Hanya Admin Utama yang berhak mengakses pengaturan bot.');

        $application->loadCount(['conversations', 'knowledgeSources', 'knowledgeChunks']);

        return Inertia::render('admin/applications/edit', [
            'application' => $application,
        ]);
    }

    /**
     * Update the specified application in storage.
     */
    public function update(UpdateApplicationRequest $request, Application $application): RedirectResponse
    {
        $user = $request->user();
        abort_if(! $user || ! $user->canAccessApplication($application->id), 403, 'Anda tidak memiliki akses untuk memperbarui pengaturan bot.');

        if (! $user->isSuperAdmin()) {
            $cannedResponses = collect(data_get($request->validated(), 'chat_settings.canned_responses', []))
                ->map(fn (array $item): array => [
                    'id' => (string) ($item['id'] ?? 'cr-'.uniqid()),
                    'shortcut' => strtolower(ltrim(trim((string) $item['shortcut']), '# ')),
                    'content' => trim((string) $item['content']),
                    'scope' => ($item['scope'] ?? 'shared') === 'private' ? 'private' : 'shared',
                    'created_by' => (string) ($item['created_by'] ?? $user->name),
                    'updated_at' => (string) ($item['updated_at'] ?? now()->translatedFormat('d F Y')),
                ])
                ->values()
                ->all();

            $chatSettings = is_array($application->chat_settings) ? $application->chat_settings : [];
            $chatSettings['canned_responses'] = $cannedResponses;

            $application->update([
                'chat_settings' => $chatSettings,
            ]);

            return back()
                ->with('success', "Daftar automate untuk '{$application->name}' berhasil diperbarui.");
        }

        $application->update($request->validated());

        // Keep current session in sync with updated app_id
        $request->session()->put('current_app_id', $application->app_id);

        return back()
            ->with('success', "Pengaturan aplikasi '{$application->name}' berhasil diperbarui.");
    }

    /**
     * Remove the specified application from storage.
     */
    public function destroy(Request $request, Application $application): RedirectResponse
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403, 'Hanya Admin Utama yang berhak menghapus aplikasi.');

        $name = $application->name;
        $appId = $application->app_id;

        $application->delete();

        if ($request->session()->get('current_app_id') === $appId) {
            $nextAppId = Application::query()->value('app_id');
            $request->session()->put('current_app_id', $nextAppId);
        }

        return redirect()
            ->route('dashboard')
            ->with('success', "Aplikasi '{$name}' telah dihapus.");
    }

    /**
     * Toggle the active status of the application.
     */
    public function toggleStatus(Request $request, Application $application): RedirectResponse
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403, 'Hanya Admin Utama yang berhak mengubah status aplikasi.');

        $application->update(['is_active' => ! $application->is_active]);

        $status = $application->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return back()->with('success', "Aplikasi '{$application->name}' berhasil {$status}.");
    }

    /**
     * Switch the current active application in session.
     */
    public function switchCurrent(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'app_id' => ['required', 'string', 'exists:applications,app_id'],
        ]);

        $app = Application::where('app_id', $validated['app_id'])->first();
        if ($app && ! $request->user()?->canAccessApplication($app->id)) {
            abort(403, 'Anda tidak memiliki akses ke aplikasi ini.');
        }

        $request->session()->put('current_app_id', $validated['app_id']);

        return back()->with('success', 'Aplikasi aktif berhasil diganti.');
    }
}
