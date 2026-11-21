<?php

namespace App\Http\Controllers;

use App\Events\BotEscalationCreated;
use App\Events\MessageSent;
use App\Models\Application;
use App\Models\BotEscalation;
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
                'chat_settings' => $application->chat_settings,
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

        // Jika sudah diambil alih admin lalu dibalas admin, dan pengunjung tidak kunjung membalas (> 3 menit), kembalikan ke bot AI
        if ($conversation->is_taken_over) {
            $lastMsg = $conversation->messages()->latest('id')->first();
            if ($lastMsg && $lastMsg->role === 'admin' && Carbon::parse($lastMsg->created_at)->diffInMinutes(now()) >= 3) {
                $conversation->update([
                    'is_taken_over' => false,
                    'taken_over_by' => null,
                    'is_waiting_admin' => false,
                ]);

                $systemMsg = Message::create([
                    'conversation_id' => $conversation->id,
                    'role' => 'system',
                    'content' => 'Percakapan telah dikembalikan ke asisten AI.',
                    'tokens_used' => 0,
                ]);

                MessageSent::safeDispatch($systemMsg);
            }
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
            'is_taken_over' => (bool) $conversation->is_taken_over,
            'is_waiting_admin' => (bool) $conversation->is_waiting_admin,
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

            if ($conversation->is_waiting_admin) {
                return response()->json([
                    'conversation_uuid' => $conversation->uuid,
                    'is_waiting_admin' => true,
                    'error' => 'Percakapan Anda sedang menunggu respon dari Admin CS. Mohon ditunggu sebentar ya Bosku 🙏',
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
            'tokens_used' => 0,
        ]);

        MessageSent::safeDispatch($userMessage);

        // Cek apakah pesan adalah formulir deposit/withdraw atau pengecekan mutasi/saldo depo & wd
        $isDepoWdForm = (bool) preg_match('/Formulir\s+(Deposit|Withdraw)\s+Status/i', $userText)
            || (preg_match('/(deposit|depo|withdraw|wd)/i', $userText) && preg_match('/(username|tanggal|mutasi|saldo)/i', $userText));

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

        // Cek jika pengguna eksplisit meminta dihubungkan ke admin/CS manusia
        $isHumanCsRequest = (bool) preg_match('/(bicara|chat|hubungkan|alihkan|panggil|tanya|oper)\s+(ke\s+)?(admin|cs\s+manusia|operator|manusia)/i', $userText);
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

        // If conversation is taken over by admin:
        if ($conversation->is_taken_over) {
            $lastPriorMsg = $conversation->messages()
                ->where('id', '!=', $userMessage->id)
                ->latest('id')
                ->first();

            // Jika pesan sebelumnya berasal dari admin (admin sudah sempat membalas),
            // dan user baru membalas lagi, kembalikan percakapan otomatis ke asisten AI!
            if ($lastPriorMsg && $lastPriorMsg->role === 'admin') {
                $conversation->update([
                    'is_taken_over' => false,
                    'taken_over_by' => null,
                    'is_waiting_admin' => false,
                ]);

                $systemMsg = Message::create([
                    'conversation_id' => $conversation->id,
                    'role' => 'system',
                    'content' => 'Percakapan telah dikembalikan ke asisten AI.',
                    'tokens_used' => 0,
                ]);

                MessageSent::safeDispatch($systemMsg);
                // Lanjutkan eksekusi ke pemrosesan AI di bawah!
            } else {
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

        // Prepare system prompt with interactive form capabilities
        $systemPrompt = ($application->system_prompt ? $application->system_prompt."\n\n" : '').<<<'PROMPT'
PANDUAN FORMULIR INTERAKTIF:
Kamu memiliki kemampuan untuk memunculkan formulir interaktif di layar livechat jika pengguna membutuhkan pengecekan deposit atau withdraw:
1. Jika pengguna bertanya tentang status deposit, ingin cek deposit, komplain deposit belum masuk, atau butuh bantuan terkait depositnya:
Sertakan tag [FORM:deposit_status] di awal balasanmu, lalu berikan balasan ramah:
"Silakan isi data di form yang muncul ya Bosku, biar saya cek status depositnya."

2. Jika pengguna bertanya tentang status withdraw, ingin cek penarikan dana/withdraw, komplain withdraw belum masuk, atau butuh bantuan terkait withdraw-nya:
Sertakan tag [FORM:withdraw_status] di awal balasanmu, lalu berikan balasan ramah:
"Silakan isi data di form yang muncul ya Bosku, biar saya cek status withdraw-nya."

3. Jika pengguna SUDAH mengirimkan data formulir (ada Username dan Tanggal) atau pertanyaannya TIDAK membutuhkan formulir status (misalnya tanya cara deposit, nomor rekening, bonus, prediksi togel, atau slot gacor):
JANGAN sertakan tag [FORM:...], jawablah langsung secara informatif, sopan, dan ramah seperti Customer Service profesional.
PROMPT;

        // Injeksi Template Pesan (FAQ / Auto-Trigger seperti ucapan terimakasih dll)
        $configuredTemplates = $application->chat_settings['chat_templates'] ?? [];
        if (is_array($configuredTemplates) && count($configuredTemplates) > 0) {
            $tplLines = [];
            foreach ($configuredTemplates as $tpl) {
                $topic = $tpl['topic'] ?? '';
                $keywords = $tpl['trigger_keywords'] ?? '';
                $rawReply = $tpl['bot_reply'] ?? '';
                if ($rawReply) {
                    $hour = (int) now()->format('H');
                    $timeGreeting = $hour >= 4 && $hour < 11 ? 'Selamat Pagi' : ($hour < 15 ? 'Selamat Siang' : ($hour < 18 ? 'Selamat Sore' : 'Selamat Malam'));
                    $cleanReply = str_replace(
                        ['{app_name}', '{waktu}', '{nama_cs}'],
                        [$application->name, $timeGreeting, $application->chat_settings['cs_agent_name'] ?? 'Rahma'],
                        $rawReply
                    );

                    $desc = "- Topik: \"{$topic}\"";
                    if ($keywords) {
                        $desc .= " (Kata Kunci Pemicu: {$keywords})";
                    }
                    $desc .= " => Rekomendasi Jawaban: \"{$cleanReply}\"";
                    $tplLines[] = $desc;
                }
            }

            if (count($tplLines) > 0) {
                $systemPrompt .= "\n\nPANDUAN TEMPLATE BALASAN:\nBerikut adalah template respon yang telah disiapkan admin. Evaluasilah apakah pesan pengguna cocok dengan template berikut (misal ucapan terima kasih, pertanyaan bonus, dll). Jika cocok, utamakan menjawab menggunakan isi template tersebut atau adaptasikan secara ramah dan sopan:\n".implode("\n", $tplLines);
            }
        }

        // Query LLM Service
        $llmResult = $this->llmService->chat(
            messages: $history,
            systemPrompt: $systemPrompt,
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
