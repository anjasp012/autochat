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
     * Show the form for creating a new application.
     */
    public function create(): Response
    {
        $defaultModel = SystemSetting::get('ai_model', 'Qwen3 1.7B Q4 GGUF');

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
    public function edit(Application $application): Response
    {
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
        $application->update($request->validated());

        return back()
            ->with('success', "Pengaturan aplikasi '{$application->name}' berhasil diperbarui.");
    }

    /**
     * Remove the specified application from storage.
     */
    public function destroy(Request $request, Application $application): RedirectResponse
    {
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
    public function toggleStatus(Application $application): RedirectResponse
    {
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

        $request->session()->put('current_app_id', $validated['app_id']);

        return back()->with('success', 'Aplikasi aktif berhasil diganti.');
    }
}
