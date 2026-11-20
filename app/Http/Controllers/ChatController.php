<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Models\Application;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\AI\LLMService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function __construct(
        protected LLMService $llmService
    ) {}

    /**
     * Display the public chat interface for the application.
     */
    public function show(Application $application): Response
    {
        return Inertia::render('chat/show', [
            'application' => [
                'id' => $application->id,
                'app_id' => $application->app_id,
                'name' => $application->name,
                'description' => $application->description,
                'welcome_message' => $application->welcome_message,
                'is_active' => (bool) $application->is_active,
            ],
            'sessionTimeoutMinutes' => (int) config('ai.session_timeout', 10),
        ]);
    }

    /**
     * Get active messages for an existing conversation session.
     */
    public function getSessionMessages(Application $application, string $uuid): JsonResponse
    {
        $conversation = Conversation::where('application_id', $application->id)
            ->where('uuid', $uuid)
            ->first();

        if (! $conversation) {
            return response()->json([
                'exists' => false,
                'expired' => false,
                'messages' => [],
            ]);
        }

        $timeoutMinutes = (int) config('ai.session_timeout', 10);
        $isExpired = Carbon::parse($conversation->last_activity_at)->addMinutes($timeoutMinutes)->isPast();

        if ($isExpired) {
            return response()->json([
                'exists' => true,
                'expired' => true,
                'messages' => [],
            ]);
        }

        $messages = $conversation->messages()
            ->orderBy('created_at', 'asc')
            ->get(['id', 'role', 'content', 'created_at'])
            ->map(fn (Message $m) => [
                'id' => (string) $m->id,
                'role' => $m->role,
                'content' => $m->content,
                'created_at' => $m->created_at?->format('H:i') ?? '',
            ]);

        return response()->json([
            'exists' => true,
            'expired' => false,
            'messages' => $messages,
        ]);
    }

    /**
     * Send message from user to chatbot and receive AI response.
     */
    public function sendMessage(Request $request, Application $application): JsonResponse
    {
        if (! $application->is_active) {
            return response()->json([
                'error' => 'Chatbot ini saat ini sedang dinonaktifkan oleh administrator.',
            ], 403);
        }

        $validated = $request->validate([
            'uuid' => ['required', 'string', 'uuid'],
            'message' => ['required', 'string', 'max:4000'],
        ]);

        $uuid = $validated['uuid'];
        $userText = trim($validated['message']);
        $timeoutMinutes = (int) config('ai.session_timeout', 10);

        // Find or create conversation
        $conversation = Conversation::where('application_id', $application->id)
            ->where('uuid', $uuid)
            ->first();

        if ($conversation) {
            $isExpired = Carbon::parse($conversation->last_activity_at)->addMinutes($timeoutMinutes)->isPast();

            if ($isExpired) {
                return response()->json([
                    'expired' => true,
                    'error' => 'Sesi percakapan telah kedaluwarsa setelah 10 menit tanpa aktivitas. Silakan klik Chat Baru untuk memulai sesi baru.',
                ], 422);
            }

            $conversation->update(['last_activity_at' => now()]);
        } else {
            $conversation = Conversation::create([
                'uuid' => $uuid,
                'application_id' => $application->id,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
                'last_activity_at' => now(),
            ]);
        }

        // Save user message to database
        $userMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $userText,
            'tokens_used' => 0,
        ]);

        MessageSent::safeDispatch($userMessage);

        // If conversation is taken over by admin, do not invoke AI
        if ($conversation->is_taken_over) {
            return response()->json([
                'conversation_uuid' => $conversation->uuid,
                'is_taken_over' => true,
                'user_message' => [
                    'id' => (string) $userMessage->id,
                    'role' => 'user',
                    'content' => $userMessage->content,
                    'created_at' => $userMessage->created_at?->format('H:i') ?? '',
                ],
                'assistant_message' => null,
            ]);
        }

        // Load recent conversation history (last 10 messages in chronological order, user & assistant only)
        $history = $conversation->messages()
            ->whereIn('role', ['user', 'assistant'])
            ->latest('id')
            ->take(10)
            ->get(['role', 'content'])
            ->reverse()
            ->values()
            ->map(fn (Message $m) => [
                'role' => $m->role,
                'content' => $m->content,
            ])
            ->toArray();

        // Query LLM Service
        $llmResult = $this->llmService->chat(
            messages: $history,
            systemPrompt: $application->system_prompt,
            model: $application->model,
            temperature: $application->temperature,
            maxTokens: $application->max_tokens
        );

        if (! $llmResult->successful) {
            $fallbackReply = 'Maaf, server AI sedang mengalami kendala atau sedang memproses antrean. Silakan coba kembali sesaat lagi.';

            $assistantMessage = Message::create([
                'conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => $fallbackReply,
                'tokens_used' => 0,
            ]);

            MessageSent::safeDispatch($assistantMessage);

            return response()->json([
                'conversation_uuid' => $conversation->uuid,
                'user_message' => [
                    'id' => (string) $userMessage->id,
                    'role' => 'user',
                    'content' => $userMessage->content,
                    'created_at' => $userMessage->created_at?->format('H:i') ?? '',
                ],
                'assistant_message' => [
                    'id' => (string) $assistantMessage->id,
                    'role' => 'assistant',
                    'content' => $assistantMessage->content,
                    'created_at' => $assistantMessage->created_at?->format('H:i') ?? '',
                ],
                'warning' => $llmResult->error,
            ]);
        }

        // Save assistant response
        $assistantMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $llmResult->content,
            'tokens_used' => $llmResult->totalTokens,
        ]);

        MessageSent::safeDispatch($assistantMessage);

        return response()->json([
            'conversation_uuid' => $conversation->uuid,
            'user_message' => [
                'id' => (string) $userMessage->id,
                'role' => 'user',
                'content' => $userMessage->content,
                'created_at' => $userMessage->created_at?->format('H:i') ?? '',
            ],
            'assistant_message' => [
                'id' => (string) $assistantMessage->id,
                'role' => 'assistant',
                'content' => $assistantMessage->content,
                'created_at' => $assistantMessage->created_at?->format('H:i') ?? '',
            ],
        ]);
    }
}
