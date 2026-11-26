<?php

namespace App\Http\Controllers;

use App\Events\BotEscalationCreated;
use App\Events\MessageSent;
use App\Models\Application;
use App\Models\BotEscalation;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\AI\LLMResponse;
use App\Services\AI\LLMService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Stevebauman\Location\Facades\Location;

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
                'chat_settings' => $application->chat_settings,
                'is_active' => (bool) $application->is_active,
            ],
            'sessionTimeoutMinutes' => (int) config('ai.session_timeout', 10),
        ]);
    }

    /**
     * Get public widget config (colors, brand icon) for embedded widget launcher.
     */
    public function getWidgetConfig(Application $application): JsonResponse
    {
        $cs = $application->chat_settings ?? [];
        $bgColor = $cs['bg_color'] ?? '#FFF9E6';
        $headerColor = $cs['header_color'] ?? '#FFD200';
        $customIcon = $cs['custom_icon_url'] ?? $cs['favicon_url'] ?? null;

        return response()->json([
            'app_id' => $application->app_id,
            'name' => $application->name,
            'bg_color' => $bgColor,
            'header_color' => $headerColor,
            'icon_url' => $customIcon,
            'is_active' => (bool) $application->is_active,
        ])->header('Access-Control-Allow-Origin', '*');
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
            $conversation->syncTimeoutStatus($timeoutMinutes);

            return response()->json([
                'exists' => true,
                'expired' => true,
                'ended_reason' => $conversation->ended_reason ?? 'timeout',
                'messages' => [],
            ]);
        }

        if ($conversation->ended_reason !== null) {
            return response()->json([
                'exists' => true,
                'expired' => true,
                'ended_reason' => $conversation->ended_reason,
                'messages' => [],
            ]);
        }

        $messages = $conversation->messages()
            ->orderBy('created_at', 'asc')
            ->get(['id', 'role', 'content', 'media_url', 'media_type', 'created_at'])
            ->map(fn (Message $m) => [
                'id' => (string) $m->id,
                'role' => $m->role,
                'content' => $m->content,
                'media_url' => $m->media_url,
                'media_type' => $m->media_type,
                'created_at' => $m->created_at?->format('H:i') ?? '',
            ]);

        return response()->json([
            'exists' => true,
            'expired' => false,
            'is_taken_over' => (bool) $conversation->is_taken_over,
            'is_waiting_admin' => (bool) $conversation->is_waiting_admin,
            'messages' => $messages,
        ]);
    }

    /**
     * End active visitor chat session explicitly when visitor closes/ends chat.
     */
    public function endSession(Request $request, Application $application): JsonResponse
    {
        $validated = $request->validate([
            'uuid' => ['required', 'string', 'uuid'],
        ]);

        $conversation = Conversation::where('application_id', $application->id)
            ->where('uuid', $validated['uuid'])
            ->first();

        if (! $conversation) {
            return response()->json(['ended' => false, 'exists' => false]);
        }

        $timeoutMinutes = (int) config('ai.session_timeout', 10);
        if (! $conversation->syncTimeoutStatus($timeoutMinutes)) {
            $conversation->markAsEnded('user', now(), $timeoutMinutes);
        }

        return response()->json([
            'ended' => true,
            'ended_reason' => $conversation->ended_reason,
            'ended_at' => $conversation->ended_at?->toIso8601String(),
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
            'message' => ['nullable', 'string', 'max:4000'],
            'attachment' => ['nullable', 'file', 'max:25600', 'mimes:jpg,jpeg,png,gif,webp,mp4,webm,mov,ogg'],
        ], [
            'attachment.max' => 'Ukuran file lampiran maksimal 25 MB.',
            'attachment.mimes' => 'Format file harus berupa gambar (JPG, PNG, WebP, GIF) atau video (MP4, WebM, MOV).',
            'attachment.uploaded' => 'File gagal diunggah. Ukuran file melebihi batas upload server (upload_max_filesize di PHP VPS).',
        ]);

        $uuid = $validated['uuid'];
        $userText = trim($validated['message'] ?? '');
        $mediaUrl = null;
        $mediaType = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $mime = (string) $file->getMimeType();
            $mediaType = str_starts_with($mime, 'video/') ? 'video' : 'image';
            $filename = Str::random(24).'.'.$file->getClientOriginalExtension();
            $path = $file->storeAs('chat_media', $filename, 'public');
            $mediaUrl = '/storage/'.$path;
        }

        if ($userText === '' && ! $mediaUrl) {
            return response()->json([
                'error' => 'Pesan atau lampiran tidak boleh kosong.',
            ], 422);
        }

        if ($userText === '' && $mediaUrl) {
            $userText = $mediaType === 'video' ? '[Video]' : '[Gambar]';
        }

        $timeoutMinutes = (int) config('ai.session_timeout', 10);

        // Find or create conversation
        $conversation = Conversation::where('application_id', $application->id)
            ->where('uuid', $uuid)
            ->first();

        if ($conversation) {
            $isExpired = Carbon::parse($conversation->last_activity_at)->addMinutes($timeoutMinutes)->isPast();

            if ($isExpired) {
                $conversation->syncTimeoutStatus($timeoutMinutes);

                return response()->json([
                    'expired' => true,
                    'ended_reason' => $conversation->ended_reason ?? 'timeout',
                    'error' => "Sesi percakapan telah kedaluwarsa setelah {$timeoutMinutes} menit tanpa aktivitas. Silakan klik Chat Baru untuk memulai sesi baru.",
                ], 422);
            }

            if ($conversation->ended_reason !== null) {
                return response()->json([
                    'expired' => true,
                    'ended_reason' => $conversation->ended_reason,
                    'error' => 'Sesi percakapan telah diakhiri. Silakan klik Mulai Chat Baru untuk memulai sesi baru.',
                ], 422);
            }

            $clientIp = self::getClientIp($request);
            $conversation->update(['last_activity_at' => now()]);

            if (empty($conversation->city) || empty($conversation->ip_address)) {
                $city = $request->header('cf-ipcity') ?: self::resolveCityFromIp($conversation->ip_address ?: $clientIp);
                $conversation->update([
                    'ip_address' => $conversation->ip_address ?: $clientIp,
                    'city' => $conversation->city ?: $city,
                ]);
            }
        } else {
            $clientIp = self::getClientIp($request);
            $city = $request->header('cf-ipcity') ?: self::resolveCityFromIp($clientIp);

            $conversation = Conversation::create([
                'uuid' => $uuid,
                'application_id' => $application->id,
                'ip_address' => $clientIp,
                'city' => $city,
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
                'last_activity_at' => now(),
            ]);
        }

        // Auto-extract and persist user_identifier if found in message
        $extractedUserId = null;
        if (preg_match('/User ID saya:\s*([^.\n]+)/i', $userText, $m)) {
            $extractedUserId = trim($m[1]);
        } elseif (preg_match('/Username:\*{0,2}\s*([^\n\r*]+)/i', $userText, $m)) {
            $extractedUserId = trim(str_replace('*', '', $m[1]));
        } elseif ($request->filled('user_id')) {
            $extractedUserId = trim((string) $request->input('user_id'));
        }

        if ($extractedUserId && (empty($conversation->user_identifier) || $conversation->user_identifier === $conversation->uuid)) {
            $conversation->user_identifier = $extractedUserId;
            $conversation->saveQuietly();
        }

        // Save user message to database
        $userMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $userText,
            'media_url' => $mediaUrl,
            'media_type' => $mediaType,
            'tokens_used' => 0,
        ]);

        MessageSent::safeDispatch($userMessage);

        // Cek apakah pesan adalah formulir deposit/withdraw terstruktur resmi
        $isDepoWdForm = (bool) preg_match('/(?:📋\s*\*{0,2})?Formulir\s+(Pengecekan\s+)?(Deposit|Withdraw)/i', $userText)
            || (str_contains($userText, '• **Username:**') && str_contains($userText, '• **Tanggal:**'));

        if ($isDepoWdForm) {
            $isWithdraw = (bool) preg_match('/withdraw/i', $userText);
            $type = $isWithdraw ? 'withdraw_check' : 'deposit_check';
            $transTitle = $isWithdraw ? 'withdraw' : 'deposit';

            $username = '';
            if (preg_match('/Username:\*{0,2}\s*([^\n\r]+)/i', $userText, $matches)) {
                $username = trim(str_replace('*', '', $matches[1]));
            } elseif ($request->filled('user_id')) {
                $username = trim((string) $request->input('user_id'));
            }

            $conversation->update([
                'is_waiting_admin' => true,
                'last_activity_at' => now(),
            ]);

            $escalation = BotEscalation::create([
                'application_id' => $application->id,
                'conversation_id' => $conversation->id,
                'user_identifier' => $username ?: ($conversation->uuid),
                'type' => $type,
                'title' => $isWithdraw ? "Pengecekan Withdraw ({$username})" : "Pengecekan Deposit ({$username})",
                'message' => $userText,
                'is_read' => false,
                'is_resolved' => false,
            ]);

            BotEscalationCreated::safeDispatch($escalation);

            $replyText = $username !== ''
                ? "Baik Bosku, data pengecekan {$transTitle} atas nama username **{$username}** telah kami terima. Percakapan ini sedang kami alihkan ke Admin Customer Service kami untuk pengecekan mutasi rekening & saldo. Mohon ditunggu sebentar ya Bosku 🙏"
                : "Baik Bosku, data pengecekan {$transTitle} telah kami terima. Percakapan ini sedang kami alihkan ke Admin Customer Service kami untuk pengecekan mutasi rekening & saldo. Mohon ditunggu sebentar ya Bosku 🙏";

            $assistantMessage = Message::create([
                'conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => $replyText,
                'tokens_used' => 0,
            ]);

            MessageSent::safeDispatch($assistantMessage);

            return response()->json([
                'conversation_uuid' => $conversation->uuid,
                'is_waiting_admin' => true,
                'user_message' => [
                    'id' => (string) $userMessage->id,
                    'role' => 'user',
                    'content' => $userMessage->content,
                    'media_url' => $userMessage->media_url,
                    'media_type' => $userMessage->media_type,
                    'created_at' => $userMessage->created_at?->format('H:i') ?? '',
                ],
                'assistant_message' => [
                    'id' => (string) $assistantMessage->id,
                    'role' => 'assistant',
                    'content' => $assistantMessage->content,
                    'media_url' => $assistantMessage->media_url,
                    'media_type' => $assistantMessage->media_type,
                    'created_at' => $assistantMessage->created_at?->format('H:i') ?? '',
                ],
            ]);
        }

        // Cek jika pengguna eksplisit meminta dihubungkan langsung ke admin/CS manusia
        $isHumanCsRequest = (bool) preg_match('/\b(bicara\s+(dengan|sama)\s+admin|hubungkan\s+ke\s+admin|sambungkan\s+ke\s+admin|minta\s+admin\s+manusia|mau\s+cs\s+manusia|panggil\s+admin\s+manusia|ngomong\s+sama\s+admin|chat\s+dengan\s+manusia)\b/i', $userText);
        if ($isHumanCsRequest) {
            $conversation->update([
                'is_waiting_admin' => true,
                'last_activity_at' => now(),
            ]);

            $escalation = BotEscalation::create([
                'application_id' => $application->id,
                'conversation_id' => $conversation->id,
                'user_identifier' => (string) ($request->input('user_id') ?: $conversation->uuid),
                'type' => 'human_cs_request',
                'title' => 'Permintaan Chat CS / Admin',
                'message' => $userText,
                'is_read' => false,
                'is_resolved' => false,
            ]);

            BotEscalationCreated::safeDispatch($escalation);

            $assistantMessage = Message::create([
                'conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => 'Baik Bosku, percakapan Anda sedang kami hubungkan ke Admin Customer Service kami. Mohon ditunggu sebentar ya Bosku 🙏',
                'tokens_used' => 0,
            ]);

            MessageSent::safeDispatch($assistantMessage);

            return response()->json([
                'conversation_uuid' => $conversation->uuid,
                'is_waiting_admin' => true,
                'user_message' => [
                    'id' => (string) $userMessage->id,
                    'role' => 'user',
                    'content' => $userMessage->content,
                    'media_url' => $userMessage->media_url,
                    'media_type' => $userMessage->media_type,
                    'created_at' => $userMessage->created_at?->format('H:i') ?? '',
                ],
                'assistant_message' => [
                    'id' => (string) $assistantMessage->id,
                    'role' => 'assistant',
                    'content' => $assistantMessage->content,
                    'media_url' => $assistantMessage->media_url,
                    'media_type' => $assistantMessage->media_type,
                    'created_at' => $assistantMessage->created_at?->format('H:i') ?? '',
                ],
            ]);
        }

        // Jika pesan berasal dari pengiriman formulir awal, kirim balasan template dari CMS (bukan AI)
        if ($request->boolean('is_initial_form')) {
            $nowHour = (int) now()->timezone('Asia/Jakarta')->format('H');
            $timeGreeting = match (true) {
                $nowHour >= 5 && $nowHour < 11 => 'Selamat Pagi',
                $nowHour >= 11 && $nowHour < 15 => 'Selamat Siang',
                $nowHour >= 15 && $nowHour < 18 => 'Selamat Sore',
                default => 'Selamat Malam',
            };

            $topicRaw = (string) $request->input('topic', 'Lainnya');
            $topicFormatted = match (strtolower(trim($topicRaw))) {
                'deposit & withdraw', 'deposit', 'withdraw' => 'depositnya',
                'klaim bonus & promo', 'klaim bonus', 'promo' => 'klaim bonusnya',
                'kendala login & password', 'login', 'password', 'kendala login & akun' => 'kendala loginnya',
                'prediksi & pasaran togel', 'togel' => 'prediksi togelnya',
                'bocoran slot gacor', 'slot' => 'bocoran slotnya',
                'lainnya' => 'pertanyaan bosku',
                default => strtolower(trim($topicRaw)),
            };

            $chatSettings = $application->chat_settings ?? [];
            $chatTemplates = (isset($chatSettings['chat_templates']) && is_array($chatSettings['chat_templates']) && count($chatSettings['chat_templates']) > 0)
                ? $chatSettings['chat_templates']
                : [
                    [
                        'id' => 'tpl-1',
                        'topic' => 'Deposit',
                        'bot_reply' => 'Silakan isi data di form yang muncul ya Bosku, biar saya cek status depositnya.',
                        'form_type' => 'deposit_status',
                    ],
                    [
                        'id' => 'tpl-2',
                        'topic' => 'Withdraw',
                        'bot_reply' => 'Silakan isi data di form yang muncul ya Bosku, biar saya cek status withdraw-nya.',
                        'form_type' => 'withdraw_status',
                    ],
                    [
                        'id' => 'tpl-3',
                        'topic' => 'Klaim Bonus & Promo',
                        'bot_reply' => 'Hallo bosku 👋 {waktu}, ada yang bisa dibantu terkait klaim bonus atau promonya, Bosku?',
                        'form_type' => 'none',
                    ],
                    [
                        'id' => 'tpl-4',
                        'topic' => 'Kendala Login & Akun',
                        'bot_reply' => 'Hallo bosku 👋 {waktu}, ada kendala saat login atau lupa password akunnya, Bosku? Mohon infokan kendalanya ya.',
                        'form_type' => 'none',
                    ],
                    [
                        'id' => 'tpl-5',
                        'topic' => 'Prediksi & Pasaran Togel',
                        'bot_reply' => 'Hallo bosku 👋 {waktu}, ingin info prediksi pasaran togel apa hari ini, Bosku?',
                        'form_type' => 'none',
                    ],
                    [
                        'id' => 'tpl-6',
                        'topic' => 'Bocoran Slot Gacor',
                        'bot_reply' => 'Hallo bosku 👋 {waktu}, sedang mencari bocoran slot gacor provider apa hari ini, Bosku?',
                        'form_type' => 'none',
                    ],
                    [
                        'id' => 'tpl-7',
                        'topic' => 'Lainnya',
                        'bot_reply' => 'Hallo bosku 👋 {waktu}, ada yang bisa kami bantu hari ini, Bosku?',
                        'form_type' => 'none',
                    ],
                ];

            $matchedTemplate = null;
            foreach ($chatTemplates as $tpl) {
                if (strtolower(trim($tpl['topic'] ?? '')) === strtolower(trim($topicRaw))) {
                    $matchedTemplate = $tpl;
                    break;
                }
            }

            if ($matchedTemplate) {
                $replyRaw = $matchedTemplate['bot_reply'] ?? '';
                $formType = $matchedTemplate['form_type'] ?? 'none';

                if ($formType === 'deposit_status' && ! str_contains($replyRaw, '[FORM:deposit_status]')) {
                    $replyRaw = "[FORM:deposit_status]\n".$replyRaw;
                } elseif ($formType === 'withdraw_status' && ! str_contains($replyRaw, '[FORM:withdraw_status]')) {
                    $replyRaw = "[FORM:withdraw_status]\n".$replyRaw;
                }

                $replyText = str_replace(
                    ['{waktu}', '{topik}', '{user_id}', '{app_name}'],
                    [$timeGreeting, $topicRaw, (string) $request->input('user_id', ''), $application->name],
                    $replyRaw
                );
            } else {
                $customTemplate = $chatSettings['first_reply_template'] ?? null;
                $isDeposit = in_array(strtolower(trim($topicRaw)), ['deposit & withdraw', 'deposit', 'withdraw']);
                $isWithdraw = in_array(strtolower(trim($topicRaw)), ['withdraw', 'penarikan']);

                if ($customTemplate) {
                    $replyText = str_replace(
                        ['{waktu}', '{topik}', '{user_id}', '{app_name}'],
                        [$timeGreeting, $topicFormatted, (string) $request->input('user_id', ''), $application->name],
                        $customTemplate
                    );
                } elseif ($isDeposit) {
                    $replyText = "[FORM:deposit_status]\nSilakan isi data di form yang muncul ya Bosku, biar saya cek status depositnya.";
                } elseif ($isWithdraw) {
                    $replyText = "[FORM:withdraw_status]\nSilakan isi data di form yang muncul ya Bosku, biar saya cek status withdraw-nya.";
                } else {
                    $replyText = "Hallo bosku 👋 {$timeGreeting}, ada yang bisa dibantu terkait {$topicFormatted}, Bosku?";
                }
            }

            $assistantMessage = Message::create([
                'conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => $replyText,
                'tokens_used' => 0,
            ]);

            MessageSent::safeDispatch($assistantMessage);

            return response()->json([
                'conversation_uuid' => $conversation->uuid,
                'user_message' => [
                    'id' => (string) $userMessage->id,
                    'role' => 'user',
                    'content' => $userMessage->content,
                    'media_url' => $userMessage->media_url,
                    'media_type' => $userMessage->media_type,
                    'created_at' => $userMessage->created_at?->format('H:i') ?? '',
                ],
                'assistant_message' => [
                    'id' => (string) $assistantMessage->id,
                    'role' => 'assistant',
                    'content' => $assistantMessage->content,
                    'media_url' => $assistantMessage->media_url,
                    'media_type' => $assistantMessage->media_type,
                    'created_at' => $assistantMessage->created_at?->format('H:i') ?? '',
                ],
            ]);
        }

        // If conversation is taken over by admin:
        if ($conversation->is_taken_over) {
            $conversation->update(['last_activity_at' => now()]);

            return response()->json([
                'conversation_uuid' => $conversation->uuid,
                'is_taken_over' => true,
                'user_message' => [
                    'id' => (string) $userMessage->id,
                    'role' => 'user',
                    'content' => $userMessage->content,
                    'media_url' => $userMessage->media_url,
                    'media_type' => $userMessage->media_type,
                    'created_at' => $userMessage->created_at?->format('H:i') ?? '',
                ],
                'assistant_message' => null,
            ]);
        }

        // Load recent conversation history (last 20 messages in chronological order, including admin responses)
        $history = $conversation->messages()
            ->whereIn('role', ['user', 'assistant', 'admin'])
            ->latest('id')
            ->take(20)
            ->get(['role', 'content', 'media_type', 'media_url'])
            ->reverse()
            ->values()
            ->map(function (Message $m) {
                $content = $m->content ?? '';
                if ($m->media_type === 'image' && (empty(trim($content)) || in_array($content, ['[Gambar]', '[Image]'], true))) {
                    $content = '[Pengguna melampirkan foto / bukti gambar]';
                } elseif ($m->media_type === 'video' && (empty(trim($content)) || in_array($content, ['[Video]'], true))) {
                    $content = '[Pengguna melampirkan video]';
                }

                return [
                    'role' => $m->role === 'admin' ? 'assistant' : $m->role,
                    'content' => $content,
                ];
            })
            ->toArray();

        $contextItems = [];
        if (! empty($conversation->user_identifier) && $conversation->user_identifier !== $conversation->uuid) {
            $contextItems[] = "- User ID / Username Pengguna: {$conversation->user_identifier}";
        }
        if (! empty($conversation->city)) {
            $contextItems[] = "- Lokasi Pengguna: {$conversation->city}";
        }

        $userContextBlock = '';
        if (! empty($contextItems)) {
            $userContextBlock = "======================================================================\n".
                "👤 KONTEKS PENGGUNA SAAT INI (SUDAH DIKETAHUI DARI PESAN SEBELUMNYA):\n".
                implode("\n", $contextItems)."\n".
                "ATURAN: Kamu SUDAH MENGETAHUI data di atas! DILARANG KERAS menanyakan ulang User ID atau data yang sudah tertera di atas. Gunakan informasi ini untuk langsung menjawab kebutuhan pengguna secara akurat!\n".
                "======================================================================\n\n";
        }

        // Prepare simple system prompt from application settings & user context
        $systemPrompt = $application->system_prompt ?? 'Kamu adalah customer service profesional yang ramah dan siap membantu pengguna.';

        if (! empty($contextItems)) {
            $userContextBlock = "INFORMASI PENGGUNA:\n".implode("\n", $contextItems)."\n\n";
            $systemPrompt = $userContextBlock.$systemPrompt;
        }

        // Query LLM Service dengan antrean teratur (queue lock) dan jeda optimal agar tidak terjadi limit / tabrakan antrean
        $queueLock = Cache::lock('llm_chat_request_queue', 25);
        $llmResult = null;

        try {
            // Tunggu giliran antrean hingga 15 detik jika ada pesan chat lain yang sedang diproses bersamaan
            $queueLock->block(15);

            // Jeda pacing optimal antar-request (minimal 700ms) untuk mencegah lonjakan rate-limit
            $lastCallTime = Cache::get('last_llm_call_timestamp');
            if ($lastCallTime) {
                $elapsedMs = (microtime(true) - (float) $lastCallTime) * 1000;
                if ($elapsedMs < 700) {
                    usleep((int) ((700 - $elapsedMs) * 1000));
                }
            }

            $llmResult = $this->llmService->chat(
                messages: $history,
                systemPrompt: $systemPrompt,
                model: $application->model,
                temperature: $application->temperature,
                maxTokens: $application->max_tokens
            );

            Cache::put('last_llm_call_timestamp', microtime(true), 15);
        } catch (\Throwable $e) {
            Log::warning('LLM queue/process exception: '.$e->getMessage());
            $llmResult = LLMResponse::failure($e->getMessage());
        } finally {
            optional($queueLock)->release();
        }

        if (! $llmResult->successful) {
            $fallbackReply = 'Mohon maaf Bosku, koneksi sistem kami sedang mengalami gangguan sejenak. Silakan kirimkan kembali pertanyaan Bosku ya 🙏';

            $conversation->update([
                'last_activity_at' => now(),
            ]);

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
                    'media_url' => $userMessage->media_url,
                    'media_type' => $userMessage->media_type,
                    'created_at' => $userMessage->created_at?->format('H:i') ?? '',
                ],
                'assistant_message' => [
                    'id' => (string) $assistantMessage->id,
                    'role' => 'assistant',
                    'content' => $assistantMessage->content,
                    'media_url' => $assistantMessage->media_url,
                    'media_type' => $assistantMessage->media_type,
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
                'media_url' => $userMessage->media_url,
                'media_type' => $userMessage->media_type,
                'created_at' => $userMessage->created_at?->format('H:i') ?? '',
            ],
            'assistant_message' => [
                'id' => (string) $assistantMessage->id,
                'role' => 'assistant',
                'content' => $assistantMessage->content,
                'media_url' => $assistantMessage->media_url,
                'media_type' => $assistantMessage->media_type,
                'created_at' => $assistantMessage->created_at?->format('H:i') ?? '',
            ],
        ]);
    }

    /**
     * Get real client IP address even when behind Cloudflare or reverse proxy.
     */
    public static function getClientIp(Request $request): string
    {
        foreach (['cf-connecting-ip', 'true-client-ip', 'x-real-ip'] as $header) {
            if ($val = $request->header($header)) {
                $ip = trim(explode(',', $val)[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        if ($forwarded = $request->header('x-forwarded-for')) {
            $ip = trim(explode(',', $forwarded)[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }

        return (string) $request->ip();
    }

    /**
     * Resolve city & location from IP address using Stevebauman Location package with multi-fallback and caching.
     */
    public static function resolveCityFromIp(?string $ip): ?string
    {
        if (empty($ip) || in_array($ip, ['127.0.0.1', '::1', 'localhost'], true)) {
            return 'Localhost';
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return 'Local / Private Network';
        }

        return Cache::remember("ip_location_v3_{$ip}", 86400 * 30, function () use ($ip) {
            // Driver 1: Stevebauman Location facade
            try {
                if (class_exists(Location::class)) {
                    $pos = Location::get($ip);
                    if ($pos) {
                        $city = trim((string) $pos->cityName);
                        $region = trim((string) $pos->regionName);
                        $country = trim((string) $pos->countryName);
                        $code = trim((string) $pos->countryCode);

                        if ($city) {
                            if ($country && strcasecmp($city, $country) === 0) {
                                return $code ? "{$city} ({$code})" : $city;
                            }
                            if ($region && strcasecmp($city, $region) !== 0) {
                                return "{$city}, {$region}".($country ? " ({$country})" : '');
                            }

                            return $country ? "{$city} ({$country})" : $city;
                        }

                        if ($region) {
                            return $country ? "{$region} ({$country})" : $region;
                        }

                        if ($country) {
                            return $country;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Fallback to HTTP APIs below
            }

            // Driver 2: ipwho.is (HTTPS, fast, accurate)
            try {
                $res = Http::timeout(3)->get("https://ipwho.is/{$ip}");
                if ($res->successful()) {
                    $data = $res->json();
                    if (($data['success'] ?? false) === true) {
                        $city = trim($data['city'] ?? '');
                        $region = trim($data['region'] ?? '');
                        $country = trim($data['country'] ?? '');
                        $code = trim($data['country_code'] ?? '');

                        if ($city) {
                            if ($country && strcasecmp($city, $country) === 0) {
                                return $code ? "{$city} ({$code})" : $city;
                            }
                            if ($region && strcasecmp($city, $region) !== 0) {
                                return "{$city}, {$region}".($country ? " ({$country})" : '');
                            }

                            return $country ? "{$city} ({$country})" : $city;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Ignore
            }

            // Driver 3: ip-api.com
            try {
                $res = Http::timeout(2)->get("http://ip-api.com/json/{$ip}?fields=status,city,regionName,country,countryCode");
                if ($res->successful()) {
                    $data = $res->json();
                    if (($data['status'] ?? '') === 'success') {
                        $city = trim($data['city'] ?? '');
                        $region = trim($data['regionName'] ?? '');
                        $country = trim($data['country'] ?? '');
                        $code = trim($data['countryCode'] ?? '');

                        if ($city) {
                            if ($country && strcasecmp($city, $country) === 0) {
                                return $code ? "{$city} ({$code})" : $city;
                            }
                            if ($region && strcasecmp($city, $region) !== 0) {
                                return "{$city}, {$region}".($country ? " ({$country})" : '');
                            }

                            return $country ? "{$city} ({$country})" : $city;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Ignore
            }

            return null;
        });
    }
}
