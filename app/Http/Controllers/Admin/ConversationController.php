<?php

namespace App\Http\Controllers\Admin;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\BotEscalation;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
        $user = $request->user();
        if ($activeConversation) {
            $this->authorizeConversationAccess($request, $activeConversation);
        }

        $search = $request->query('search');
        $status = $request->query('status'); // 'taken_over', 'ai', 'all'

        // Ambil aplikasi yang sedang dipilih di sidebar / session
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

        $baseQuery = Conversation::query()
            ->when($currentApp, fn ($query, $app) => $query->where('application_id', $app->id), fn ($query) => $query->whereRaw('1 = 0'));

        $counts = [
            'all' => (clone $baseQuery)->where('is_archived', false)->count(),
            'waiting' => (clone $baseQuery)->where('is_archived', false)->where('is_waiting_admin', true)->count(),
            'mine' => (clone $baseQuery)->where('is_archived', false)->where('is_taken_over', true)->where('taken_over_by', $request->user()?->id)->count(),
            'bot' => (clone $baseQuery)->where('is_archived', false)->where('is_taken_over', false)->count(),
            'archived' => (clone $baseQuery)->where('is_archived', true)->count(),
        ];

        $conversations = (clone $baseQuery)
            ->with([
                'application:id,app_id,name',
                'takenOverBy:id,name',
                'latestMessage',
            ])
            ->withCount('messages')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('uuid', 'like', "%{$search}%")
                        ->orWhere('user_identifier', 'like', "%{$search}%")
                        ->orWhere('ip_address', 'like', "%{$search}%")
                        ->orWhereHas('messages', fn ($mq) => $mq->where('content', 'like', "%{$search}%"));
                });
            })
            ->when($status === 'waiting', fn ($q) => $q->where('is_archived', false)->where('is_waiting_admin', true))
            ->when($status === 'mine', fn ($q) => $q->where('is_archived', false)->where('is_taken_over', true)->where('taken_over_by', $request->user()?->id))
            ->when($status === 'bot' || $status === 'ai', fn ($q) => $q->where('is_archived', false)->where('is_taken_over', false))
            ->when($status === 'archived', fn ($q) => $q->where('is_archived', true))
            ->when($status === 'taken_over', fn ($q) => $q->where('is_archived', false)->where('is_taken_over', true))
            ->when(! in_array($status, ['archived', 'mine', 'bot', 'ai', 'taken_over']), fn ($q) => $q->where('is_archived', false))
            ->orderBy('last_activity_at', 'desc')
            ->get()
            ->map(function ($c) {
                if (empty($c->user_identifier)) {
                    $firstMsg = Message::where('conversation_id', $c->id)
                        ->where('role', 'user')
                        ->orderBy('id', 'asc')
                        ->value('content');
                    if ($firstMsg) {
                        if (preg_match('/User ID saya:\s*([^.]+)/i', $firstMsg, $m)) {
                            $c->user_identifier = trim($m[1]);
                            $c->saveQuietly();
                        } elseif (preg_match('/Username:\*{0,2}\s*([^\n\r]+)/i', $firstMsg, $m)) {
                            $c->user_identifier = trim(str_replace('*', '', $m[1]));
                            $c->saveQuietly();
                        }
                    }
                }

                return $c;
            });

        // Default ke percakapan pertama jika tidak ditentukan
        if (! $activeConversation && $conversations->isNotEmpty()) {
            $activeConversation = $conversations->first();
        }

        if ($activeConversation) {
            if (empty($activeConversation->user_identifier)) {
                $firstMsg = Message::where('conversation_id', $activeConversation->id)
                    ->where('role', 'user')
                    ->orderBy('id', 'asc')
                    ->value('content');
                if ($firstMsg) {
                    if (preg_match('/User ID saya:\s*([^.]+)/i', $firstMsg, $m)) {
                        $activeConversation->user_identifier = trim($m[1]);
                        $activeConversation->saveQuietly();
                    } elseif (preg_match('/Username:\*{0,2}\s*([^\n\r]+)/i', $firstMsg, $m)) {
                        $activeConversation->user_identifier = trim(str_replace('*', '', $m[1]));
                        $activeConversation->saveQuietly();
                    }
                }
            }

            $activeConversation->load([
                'application:id,app_id,name,is_active',
                'takenOverBy:id,name,email',
                'messages' => fn ($q) => $q->orderBy('created_at', 'asc'),
            ]);
        }

        return Inertia::render('admin/conversations/index', [
            'conversations' => $conversations,
            'activeConversation' => $activeConversation,
            'counts' => $counts,
            'filters' => [
                'search' => $search,
                'status' => $status ?: 'all',
            ],
            'selectedApp' => $currentApp ? [
                'id' => $currentApp->id,
                'app_id' => $currentApp->app_id,
                'name' => $currentApp->name,
                'is_active' => (bool) $currentApp->is_active,
                'canned_responses' => $currentApp->chat_settings['canned_responses'] ?? [],
            ] : null,
        ]);
    }

    /**
     * Helper to verify user has access to conversation's application.
     */
    protected function authorizeConversationAccess(Request $request, Conversation $conversation): void
    {
        $user = $request->user();
        if ($user && ! $user->canAccessApplication($conversation->application_id)) {
            abort(403, 'Anda tidak memiliki hak akses untuk percakapan pada aplikasi ini.');
        }
    }

    /**
     * Take over conversation from AI (Admin human agent intervenes).
     */
    public function takeover(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversationAccess($request, $conversation);

        $conversation->update([
            'is_taken_over' => true,
            'is_waiting_admin' => false,
            'taken_over_at' => now(),
            'taken_over_by' => $request->user()?->id,
            'last_activity_at' => now(),
        ]);

        BotEscalation::where('conversation_id', $conversation->id)->update([
            'is_read' => true,
            'is_resolved' => true,
        ]);

        $systemMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'system',
            'content' => 'Percakapan telah terhubung langsung dengan Customer Service.',
        ]);

        MessageSent::safeDispatch($systemMessage);

        return back()->with('success', 'Percakapan berhasil diambil alih. AI tidak akan menjawab otomatis.');
    }

    /**
     * Release takeover back to AI.
     */
    public function releaseTakeover(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversationAccess($request, $conversation);

        $conversation->update([
            'is_taken_over' => false,
            'taken_over_at' => null,
            'taken_over_by' => null,
            'last_activity_at' => now(),
        ]);

        $systemMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'system',
            'content' => 'Percakapan telah dialihkan kembali ke asisten otomatis.',
        ]);

        MessageSent::safeDispatch($systemMessage);

        return back()->with('success', 'Percakapan telah dikembalikan ke asisten AI.');
    }

    /**
     * Get JSON messages for a conversation (for fast background polling & syncing).
     */
    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeConversationAccess($request, $conversation);

        $messages = $conversation->messages()
            ->orderBy('created_at', 'asc')
            ->get(['id', 'conversation_id', 'role', 'content', 'media_url', 'media_type', 'created_at'])
            ->map(fn (Message $m) => [
                'id' => $m->id,
                'conversation_id' => $m->conversation_id,
                'role' => $m->role,
                'content' => $m->content,
                'media_url' => $m->media_url,
                'media_type' => $m->media_type,
                'created_at' => $m->created_at?->format('H:i') ?? '',
            ]);

        return response()->json([
            'uuid' => $conversation->uuid,
            'is_taken_over' => (bool) $conversation->is_taken_over,
            'is_waiting_admin' => (bool) $conversation->is_waiting_admin,
            'messages' => $messages,
        ]);
    }

    /**
     * Admin replies directly to the visitor.
     */
    public function reply(Request $request, Conversation $conversation): RedirectResponse|JsonResponse
    {
        $this->authorizeConversationAccess($request, $conversation);

        $validated = $request->validate([
            'message' => ['nullable', 'string', 'max:4000'],
            'attachment' => ['nullable', 'file', 'max:25600', 'mimes:jpg,jpeg,png,gif,webp,mp4,webm,mov,ogg'],
        ], [
            'attachment.max' => 'Ukuran file lampiran maksimal 25 MB.',
            'attachment.mimes' => 'Format file harus berupa gambar (JPG, PNG, WebP, GIF) atau video (MP4, WebM, MOV).',
            'attachment.uploaded' => 'File gagal diunggah. Ukuran file melebihi batas upload server (upload_max_filesize di PHP VPS).',
        ]);

        $content = trim($validated['message'] ?? '');
        $mediaUrl = null;
        $mediaType = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $extension = strtolower($file->getClientOriginalExtension());
            $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            $videoExtensions = ['mp4', 'webm', 'mov', 'ogg'];

            if (in_array($extension, $imageExtensions, true)) {
                $mediaType = 'image';
            } elseif (in_array($extension, $videoExtensions, true)) {
                $mediaType = 'video';
            }

            if ($mediaType) {
                $filename = Str::random(24).'.'.$extension;
                $path = $file->storeAs('chat_media', $filename, 'public');
                $mediaUrl = '/storage/'.$path;
            }
        }

        if ($content === '' && ! $mediaUrl) {
            if ($request->wantsJson()) {
                return response()->json(['error' => 'Pesan atau lampiran tidak boleh kosong.'], 422);
            }
            return back()->withErrors(['message' => 'Pesan atau lampiran tidak boleh kosong.']);
        }

        if ($content === '' && $mediaUrl) {
            $content = $mediaType === 'video' ? '[Video]' : '[Gambar]';
        }

        $conversation->update([
            'is_taken_over' => true,
            'is_waiting_admin' => false,
            'taken_over_at' => $conversation->taken_over_at ?? now(),
            'taken_over_by' => $conversation->taken_over_by ?? $request->user()?->id,
            'last_activity_at' => now(),
        ]);

        $adminMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'admin',
            'content' => $content,
            'media_url' => $mediaUrl,
            'media_type' => $mediaType,
            'tokens_used' => 0,
        ]);

        BotEscalation::where('conversation_id', $conversation->id)->update([
            'is_read' => true,
            'is_resolved' => true,
        ]);

        $adminMessage->setRelation('conversation', $conversation->fresh(['application']));
        MessageSent::safeDispatch($adminMessage);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => [
                    'id' => $adminMessage->id,
                    'role' => $adminMessage->role,
                    'content' => $adminMessage->content,
                    'media_url' => $adminMessage->media_url,
                    'media_type' => $adminMessage->media_type,
                    'created_at' => $adminMessage->created_at?->format('H:i') ?? '',
                ],
            ]);
        }

        return back()->with('success', 'Pesan balasan admin berhasil dikirim.');
    }

    /**
     * Archive conversation.
     */
    public function archive(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversationAccess($request, $conversation);

        $conversation->update(['is_archived' => true]);

        return back()->with('success', 'Percakapan berhasil diarsipkan.');
    }

    /**
     * Unarchive conversation.
     */
    public function unarchive(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversationAccess($request, $conversation);

        $conversation->update(['is_archived' => false]);

        return back()->with('success', 'Percakapan dikembalikan dari arsip.');
    }

    /**
     * Delete a conversation.
     */
    public function destroy(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversationAccess($request, $conversation);

        $conversation->delete();

        return redirect()
            ->route('conversations.index')
            ->with('success', 'Riwayat percakapan berhasil dihapus.');
    }

    /**
     * Delete all conversations (Hapus semua percakapan).
     */
    public function destroyAll(Request $request): RedirectResponse
    {
        $currentAppId = session('current_application_id');
        $query = Conversation::query();

        if ($currentAppId) {
            $query->where('application_id', $currentAppId);
        }

        $conversationIds = $query->pluck('id');
        BotEscalation::whereIn('conversation_id', $conversationIds)->delete();
        Message::whereIn('conversation_id', $conversationIds)->delete();
        $query->delete();

        return redirect()
            ->route('conversations.index')
            ->with('success', 'Semua riwayat percakapan berhasil dihapus.');
    }
}
