<?php

namespace App\Http\Controllers\Admin;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConversationController extends Controller
{
    /**
     * Display a listing of conversations (WhatsApp-style live console).
     */
    public function index(Request $request): Response
    {
        return $this->renderConsole($request, null);
    }

    /**
     * Display a specific conversation in the live console.
     */
    public function show(Request $request, Conversation $conversation): Response
    {
        return $this->renderConsole($request, $conversation);
    }

    /**
     * Helper to render the WhatsApp-style 2-column live console.
     */
    protected function renderConsole(Request $request, ?Conversation $activeConversation): Response
    {
        $search = $request->query('search');
        $status = $request->query('status'); // 'taken_over', 'ai', 'all'

        // Ambil aplikasi yang sedang dipilih di sidebar / session
        $sessionAppId = $request->session()->get('current_app_id');
        $currentApp = null;

        if ($sessionAppId) {
            $currentApp = Application::where('app_id', $sessionAppId)->first();
        }

        if (! $currentApp) {
            $currentApp = Application::where('is_active', true)->first() ?? Application::first();
            if ($currentApp) {
                $request->session()->put('current_app_id', $currentApp->app_id);
            }
        }

        $conversations = Conversation::query()
            ->with([
                'application:id,app_id,name',
                'takenOverBy:id,name',
                'messages' => fn ($q) => $q->orderBy('created_at', 'desc')->limit(1),
            ])
            ->withCount('messages')
            ->when($currentApp, function ($query, $app) {
                $query->where('application_id', $app->id);
            }, function ($query) {
                $query->whereRaw('1 = 0');
            })
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('uuid', 'like', "%{$search}%")
                        ->orWhere('ip_address', 'like', "%{$search}%")
                        ->orWhereHas('messages', fn ($mq) => $mq->where('content', 'like', "%{$search}%"));
                });
            })
            ->when($status === 'taken_over', fn ($q) => $q->where('is_taken_over', true))
            ->when($status === 'ai', fn ($q) => $q->where('is_taken_over', false))
            ->orderBy('last_activity_at', 'desc')
            ->get();

        // Default ke percakapan pertama jika tidak ditentukan
        if (! $activeConversation && $conversations->isNotEmpty()) {
            $activeConversation = $conversations->first();
        }

        if ($activeConversation) {
            $activeConversation->load([
                'application:id,app_id,name,is_active',
                'takenOverBy:id,name,email',
                'messages' => fn ($q) => $q->orderBy('created_at', 'asc'),
            ]);
        }

        return Inertia::render('admin/conversations/index', [
            'conversations' => $conversations,
            'activeConversation' => $activeConversation,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'selectedApp' => $currentApp ? [
                'id' => $currentApp->id,
                'app_id' => $currentApp->app_id,
                'name' => $currentApp->name,
                'is_active' => (bool) $currentApp->is_active,
            ] : null,
        ]);
    }

    /**
     * Take over conversation from AI (Admin human agent intervenes).
     */
    public function takeover(Request $request, Conversation $conversation): RedirectResponse
    {
        $conversation->update([
            'is_taken_over' => true,
            'taken_over_at' => now(),
            'taken_over_by' => $request->user()?->id,
            'last_activity_at' => now(),
        ]);

        $systemMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'system',
            'content' => 'Percakapan telah diambil alih oleh administrator. AI dihentikan sementara.',
        ]);

        MessageSent::dispatch($systemMessage);

        return back()->with('success', 'Percakapan berhasil diambil alih. AI tidak akan menjawab otomatis.');
    }

    /**
     * Release takeover back to AI.
     */
    public function releaseTakeover(Conversation $conversation): RedirectResponse
    {
        $conversation->update([
            'is_taken_over' => false,
            'taken_over_at' => null,
            'taken_over_by' => null,
            'last_activity_at' => now(),
        ]);

        $systemMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'system',
            'content' => 'Percakapan telah dikembalikan ke asisten AI.',
        ]);

        MessageSent::dispatch($systemMessage);

        return back()->with('success', 'Percakapan telah dikembalikan ke asisten AI.');
    }

    /**
     * Admin replies directly to the visitor.
     */
    public function reply(Request $request, Conversation $conversation): RedirectResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
        ]);

        $adminMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => trim($validated['message']),
            'tokens_used' => 0,
        ]);

        $conversation->update(['last_activity_at' => now()]);

        MessageSent::dispatch($adminMessage);

        return back()->with('success', 'Pesan balasan admin berhasil dikirim.');
    }

    /**
     * Delete a conversation.
     */
    public function destroy(Conversation $conversation): RedirectResponse
    {
        $conversation->delete();

        return redirect()
            ->route('conversations.index')
            ->with('success', 'Riwayat percakapan berhasil dihapus.');
    }
}

