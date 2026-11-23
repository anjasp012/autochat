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
            return response()->json([
                'exists' => true,
                'expired' => true,
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
                return response()->json([
                    'expired' => true,
                    'error' => 'Sesi percakapan telah kedaluwarsa setelah 10 menit tanpa aktivitas. Silakan klik Chat Baru untuk memulai sesi baru.',
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

        // Prepare system prompt with interactive form capabilities
        $systemPrompt = $userContextBlock.($application->system_prompt ? $application->system_prompt."\n\n" : '').<<<'PROMPT'
PANDUAN PEMAHAMAN TOPIK & PREDIKSI (MUTLAK):
1. PELAJARI MAKSUD & PERTANYAAN PENGGUNA DENGAN TELITI:
   - Jika pengguna meminta prediksi atau bocoran angka untuk pasaran tertentu (contoh: Toto Macau, Macau, Hongkong, HK, Sydney, SDY, Singapore, SGP, Cambodia, Taiwan, dll), BERIKAN PREDIKSI SESUAI PASARAN YANG DIMINTA!
   - DILARANG KERAS menukar pasaran (misalnya pengguna minta Toto Macau, jangan pernah membalas dengan pasaran Hongkong)!
   - Format prediksi pasaran harus lengkap dan menarik: BBFS, 4D, 2D, Colok Bebas, serta selalu ingatkan prinsip UPS (Utamakan Prediksi Sendiri).
2. IKUTI SELURUH PANDUAN SYSTEM PROMPT APLIKASI:
   - Baca dan prioritaskan persona, aturan, dan pengetahuan yang telah diatur oleh admin di atas.
   - Sampaikan jawaban dengan gaya Customer Service yang ramah, hangat, dan komunikatif (panggilan "Bosku").

PANDUAN PEMAHAMAN KONTEKS & PENGALIHAN ADMIN (MUTLAK):
1. BACA & PAHAMI RIWAYAT PERCAKAPAN SEBELUMNYA DENGAN CERMAT:
   - Ingat dan hubungkan apa yang baru saja dibicarakan oleh pengguna.
   - Jika pengguna membalas singkat (contoh: "iya", "lupa pas", "rekening mana?", "udah min", "yang tadi"), pahami bahwa itu adalah KELANJUTAN dari percakapan sebelumnya! JANGAN menganggapnya topik baru atau mengulang pertanyaan dari awal.
   - Jika admin CS sebelumnya sudah memberikan informasi di dalam riwayat chat, lanjutkan konteks tersebut dengan selaras.
2. JANGAN PERNAH menyuruh atau mengalihkan pengguna ke Admin CS jika pertanyaannya masih dapat kamu jawab, jelaskan, atau pandu (seperti: cara deposit, nomor rekening tujuan, klaim bonus, cara reset/ganti password, link login resmi, jadwal pasaran, bocoran game, dll). Jawablah secara mandiri, lengkap, ramah, dan solutif!

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

        // Injeksi Automate / Canned Responses ke Prompt AI Bot dengan Deteksi Kata Kunci
        $configuredCanned = $application->chat_settings['canned_responses'] ?? [];
        $cannedResponses = (is_array($configuredCanned) && count($configuredCanned) > 0)
            ? $configuredCanned
            : [
                [
                    'id' => 'cr-1',
                    'shortcut' => 'marketing',
                    'content' => "Untuk Segala bentuk penawaran IKLAN / YOUTUBE / FB UNTUK SITUS CV TOGEL\nSilakan add WA marketing kami di bawah ini :\nWA : +62 819-7426-404\n\nTerima kasih.",
                ],
                [
                    'id' => 'cr-2',
                    'shortcut' => 'telegram',
                    'content' => "Informasi kepada seluruh Membersetia CVTOGEL\n📢 TELEGRAM RESMI CS CVTOGEL\nhttps://kiamkiam.site/telecvtogel\n\nTerima kasih atas perhatian dan kepercayaannya.",
                ],
                [
                    'id' => 'cr-3',
                    'shortcut' => 'rekening',
                    'content' => 'Halo Bosku, untuk tujuan rekening deposit aktif silakan selalu cek di menu Deposit pada website resmi sebelum melakukan transfer ya Bosku. Terima kasih.',
                ],
                [
                    'id' => 'cr-4',
                    'shortcut' => 'deposit-kendala',
                    'content' => 'Mohon maaf atas ketidaknyamanannya Bosku. Boleh dibantu kirimkan bukti transfer yang jelas (struk/mutasi) agar segera kami bantu koordinasikan dengan bagian keuangan kami ya Bosku.',
                ],
                [
                    'id' => 'cr-5',
                    'shortcut' => 'terima-kasih',
                    'content' => 'Sama-sama Bosku. Senang bisa membantu Bosku hari ini. Jika ada hal lain yang ingin ditanyakan, jangan ragu untuk menghubungi kami kembali ya. Semoga beruntung dan salam jackpot selalu! 🍀',
                ],
                [
                    'id' => 'cr-6',
                    'shortcut' => 'akunlimit',
                    'content' => 'Halo Bosku, terkait kendala akun limit, silakan infokan User ID Bosku terlebih dahulu ya. Batas limit taruhan atau limit akun dapat ditinjau kembali oleh tim terkait setelah pengecekan data akun. Mohon ditunggu sebentar ya Bosku 🙏',
                ],
            ];

        $userLower = strtolower($userText);
        $scoredAutomates = [];
        $crLines = [];

        foreach ($cannedResponses as $cr) {
            $rawShortcut = $cr['shortcut'] ?? '';
            $shortcut = strtolower(ltrim(trim($rawShortcut), '#'));
            $content = trim($cr['content'] ?? '');
            if (! $shortcut || ! $content) {
                continue;
            }

            $crLines[] = "- Tag #{$shortcut}:\n\"{$content}\"";

            $score = $this->scoreCannedResponse($userText, $shortcut, $content);
            if ($score > 0) {
                $scoredAutomates[] = [
                    'shortcut' => $shortcut,
                    'content' => $content,
                    'score' => $score,
                ];
            }
        }

        // Urutkan berdasarkan skor relevansi tertinggi
        usort($scoredAutomates, fn ($a, $b) => $b['score'] <=> $a['score']);
        $matchedAutomates = array_slice($scoredAutomates, 0, 2);

        // Jika ditemukan Automate yang cocok langsung dengan pertanyaan user, pasang sebagai PRIORITAS UTAMA
        if (count($matchedAutomates) > 0) {
            $matchHighlights = [];
            foreach ($matchedAutomates as $ma) {
                $matchHighlights[] = "TAG / SHORTCUT TERPILIH: #{$ma['shortcut']}\nINFORMASI RESMI DARI SISTEM AUTOMATE:\n\"{$ma['content']}\"";
            }
            $priorityBlock = "======================================================================\n".
                "🚨 PRIORITAS UTAMA: DITEMUKAN PANDUAN AUTOMATE RESMI UNTUK PERTANYAAN USER! 🚨\n".
                "Pertanyaan pengguna terdeteksi cocok dengan topik Automate berikut:\n\n".
                implode("\n\n", $matchHighlights)."\n\n".
                "INSTRUKSI MUTLAK & WAJIB DIPATUHI:\n".
                "1. Kamu WAJIB mengambil dan menggunakan fakta, arahan, atau isi dari Automate resmi di atas (#{$matchedAutomates[0]['shortcut']}) sebagai dasar utama jawabanmu!\n".
                "2. PENTING: Jika pengguna menanyakan kata sandi / password (\"lupa pas\", \"lupa password\", \"lupa sandi\", \"reset sandi\"), arahkan HANYA ke panduan reset password (#reset), JANGAN PERNAH menyuruh mengecek user ID!\n".
                "3. Rangkai jawabanmu dengan bahasa Customer Service yang ramah, santun, dan komunikatif kepada pengguna.\n".
                "======================================================================\n\n";

            $systemPrompt = $priorityBlock.$systemPrompt;
        }

        if (count($crLines) > 0) {
            $systemPrompt .= "\n\n======================================================================\n".
                "🧠 PANDUAN SEMANTIK AUTOMATE / SHORTCUT RESMI (PELAJARI DENGAN TELITI) 🧠\n".
                "Setiap tag/shortcut diawali tanda pagar (#) berisi panduan resmi untuk topik tertentu.\n".
                "Kamu WAJIB memahami MAKSUD dan TUJUAN pengguna secara cerdas dan mendalam:\n\n".
                "ATURAN PEMILIHAN AUTOMATE YANG TEPAT:\n".
                "1. PENGELOMPOKAN KELUHAN LUPA (PENTING! JANGAN TERTUKAR):\n".
                "   - Jika pengguna menulis \"lupa pas\", \"lupa password\", \"lupa sandi\", \"reset sandi\", \"ganti password\", \"lupa pw\", \"lupa pass\" -> Masalahnya adalah KATA SANDI / PASSWORD! Kamu WAJIB merujuk pada panduan #reset (atau tag reset password), BUKAN tag lupa user ID!\n".
                "   - Jika pengguna menulis \"lupa id\", \"lupa user\", \"lupa username\", \"lupa akun\" -> Masalahnya adalah USER ID! Kamu WAJIB merujuk pada panduan #lupa (atau tag lupa ID).\n".
                "   - Jangan pernah memberikan solusi User ID kepada pengguna yang minta reset password, dan sebaliknya!\n".
                "2. DAFTAR SINGKATAN UMUM MEMBER:\n".
                "   - \"pas\" / \"pw\" / \"pass\" = Password / Kata Sandi.\n".
                "   - \"id\" / \"user\" = User ID / Username.\n".
                "   - \"depo\" / \"dp\" = Deposit.\n".
                "   - \"wd\" = Withdraw / Tarik Dana.\n".
                "   - \"rek\" = Rekening.\n".
                "   - \"mutasi\" = Bukti transaksi / Mutasi bank.\n".
                "3. KONSISTENSI JAWABAN:\n".
                "   - Gunakan isi dan langkah-langkah dari Automate resmi sebagai panduan jawabanmu.\n".
                "   - Sampaikan dengan tutur kata Customer Service yang ramah, hangat, dan profesional.\n\n".
                "Daftar Lengkap Automate Resmi:\n".
                implode("\n\n", $crLines)."\n".
                "======================================================================\n";
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
            // 1. Jika terdeteksi kata kunci Automate, langsung berikan panduan Automate resmi tanpa error!
            if (! empty($matchedAutomates)) {
                $fallbackReply = $matchedAutomates[0]['content'];
            } else {
                // 2. Jika tidak ada tag Automate, berikan balasan langsung yang solutif & cerdas sesuai topik pertanyaan
                $userLower = strtolower($userText);
                $csName = $application->chat_settings['cs_agent_name'] ?? 'Rahma';

                if (str_contains($userLower, 'prediksi') || str_contains($userLower, 'hongkong') || str_contains($userLower, 'hk') || str_contains($userLower, 'singapore') || str_contains($userLower, 'sgp') || str_contains($userLower, 'sydney') || str_contains($userLower, 'sdy') || str_contains($userLower, 'macau') || str_contains($userLower, 'cambodia') || str_contains($userLower, 'taiwan') || str_contains($userLower, 'togel') || str_contains($userLower, 'pasaran')) {
                    $market = 'Pasaran Pilihan';
                    if (str_contains($userLower, 'macau')) {
                        $market = 'Toto Macau';
                    } elseif (str_contains($userLower, 'sydney') || str_contains($userLower, 'sdy')) {
                        $market = 'Sydney';
                    } elseif (str_contains($userLower, 'singapore') || str_contains($userLower, 'sgp')) {
                        $market = 'Singapore';
                    } elseif (str_contains($userLower, 'hongkong') || str_contains($userLower, 'hk')) {
                        $market = 'Hongkong';
                    } elseif (str_contains($userLower, 'cambodia')) {
                        $market = 'Cambodia';
                    } elseif (str_contains($userLower, 'taiwan')) {
                        $market = 'Taiwan';
                    }

                    $seed = abs((int) crc32(now()->format('Y-m-d').$market));
                    $d1 = $seed % 10;
                    $d2 = ($seed * 3 + 7) % 10;
                    $d3 = ($seed * 7 + 3) % 10;
                    $d4 = ($seed * 9 + 1) % 10;
                    $d5 = ($seed * 2 + 5) % 10;
                    $bbfs = "{$d1}{$d2}{$d3}{$d4}{$d5}";
                    $p4d = "{$d1}{$d2}{$d3}{$d4}";
                    $p2d = "{$d1}{$d2}, {$d3}{$d4}, {$d2}{$d5}, {$d4}{$d1}";

                    $fallbackReply = "Halo Bosku! Untuk pasaran {$market} hari ini, berikut angka rekomendasi prediksi kami:\n• BBFS: {$bbfs}\n• 4D: {$p4d}\n• 2D: {$p2d}\n• Colok Bebas: {$d2} / {$d4}\n\nTetap utamakan prediksi sendiri (UPS) ya Bosku. Semoga tembus jackpot hari ini! 🍀";
                } elseif (str_contains($userLower, 'slot') || str_contains($userLower, 'gacor') || str_contains($userLower, 'pola') || str_contains($userLower, 'rtp') || str_contains($userLower, 'maxwin')) {
                    $fallbackReply = "Halo Bosku! Untuk bocoran slot gacor hari ini dengan winrate tertinggi:\n1. Gates of Olympus (Pragmatic) - RTP 98.4%\n2. Starlight Princess (Pragmatic) - RTP 97.9%\n3. Mahjong Ways 2 (PG Soft) - RTP 98.6%\n\nPola gacor: Spin Manual 10x, DC On, lalu Auto Spin 30x. Semoga maxwin ya Bosku! 🍀";
                } elseif (str_contains($userLower, 'depo') || str_contains($userLower, 'rekening') || str_contains($userLower, 'rek') || str_contains($userLower, 'tujuan')) {
                    $fallbackReply = 'Halo Bosku, untuk tujuan rekening deposit aktif silakan selalu cek di menu Deposit pada website resmi sebelum melakukan transfer ya Bosku. Jika butuh panduan lebih lanjut, silakan tanyakan kepada kami. Terima kasih 🙏';
                } elseif (str_contains($userLower, 'bonus') || str_contains($userLower, 'promo') || str_contains($userLower, 'klaim')) {
                    $fallbackReply = 'Halo Bosku! Tersedia berbagai promo menarik seperti Bonus New Member, Bonus Deposit Harian, dan Rollingan Mingguan. Untuk syarat dan klaim bonus, silakan cek menu Promosi di website resmi ya Bosku 🎁';
                } elseif (str_contains($userLower, 'halo') || str_contains($userLower, 'pagi') || str_contains($userLower, 'siang') || str_contains($userLower, 'malam') || str_contains($userLower, 'tes') || str_contains($userLower, 'p')) {
                    $fallbackReply = "Halo Bosku! Selamat datang di layanan live chat resmi kami. Ada yang bisa {$csName} bantu terkait akun, permainan, atau transaksi hari ini? Silakan infokan ya Bosku 🙏";
                } else {
                    $fallbackReply = "Halo Bosku! Terkait pertanyaan Bosku, ada yang bisa {$csName} bantu jelaskan lebih lanjut mengenai akun atau permainannya? Silakan infokan detailnya ya Bosku 🙏";
                }

                $conversation->update([
                    'last_activity_at' => now(),
                ]);
            }

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
     * Extract searchable keywords from a shortcut tag.
     * E.g. "akunlimit" -> ["akun", "limit"]
     *      "deposit-kendala" -> ["deposit", "kendala"]
     *
     * @return array<int, string>
     */
    protected function extractShortcutKeywords(string $shortcut): array
    {
        $clean = strtolower(ltrim(trim($shortcut), '#'));
        $words = preg_split('/[\s\-_.]+/', $clean, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if (count($words) === 1) {
            $single = $words[0];
            $knownParts = [
                'akun', 'limit', 'depo', 'deposit', 'wd', 'withdraw',
                'slot', 'gacor', 'togel', 'pasaran', 'rekening',
                'tele', 'telegram', 'marketing', 'promo', 'bonus',
                'daftar', 'login', 'kendala', 'saldo', 'mutasi',
            ];

            foreach ($knownParts as $part) {
                if (str_contains($single, $part) && $single !== $part) {
                    $other = str_replace($part, '', $single);
                    $words[] = $part;
                    if (strlen($other) >= 3) {
                        $words[] = $other;
                    }
                }
            }
        }

        return array_values(array_unique(array_filter($words, fn ($w) => strlen($w) >= 3)));
    }

    /**
     * Score a canned response based on user question, shortcut, and intent.
     */
    protected function scoreCannedResponse(string $userText, string $shortcut, string $content): int
    {
        $user = strtolower($userText);
        $shortcut = strtolower(ltrim(trim($shortcut), '#'));
        $contentLower = strtolower($content);

        // Check intents for member slang & abbreviations
        // "pas", "pass", "pw", "sandi" -> password
        // "id", "user", "username" -> user ID
        $hasPasswordIntent = (bool) preg_match('/\b(pas|pass|pw|password|sandi|katasandi|pin)\b/i', $user);
        $hasUserIdIntent = (bool) preg_match('/\b(id|user|username|userid|akun)\b/i', $user);
        $hasForgotIntent = (bool) preg_match('/\b(lupa|hilang|tidak ingat|gagal login|reset)\b/i', $user);

        $score = 0;

        // 1. Exact match with tag
        if (str_contains($user, '#'.$shortcut)) {
            $score += 100;
        } elseif (preg_match('/\b'.preg_quote($shortcut, '/').'\b/i', $user)) {
            $score += 50;
        }

        // 2. Specific intent handling: LUPA PASSWORD / RESET PASSWORD
        if ($hasPasswordIntent || ($hasForgotIntent && (str_contains($user, 'pas') || str_contains($user, 'pw')))) {
            if (in_array($shortcut, ['reset', 'password', 'pass', 'pw', 'lupapassword', 'lupa-password', 'gantipassword', 'sandi', 'resetpass'], true)) {
                $score += 85;
            } elseif (str_contains($contentLower, 'password') || str_contains($contentLower, 'sandi') || str_contains($contentLower, 'reset')) {
                $score += 65;
            }

            // Penalty for generic #lupa or user-id tag when user specifically mentioned password/sandi
            if (in_array($shortcut, ['lupa', 'lupaid', 'lupa-id', 'username', 'id'], true) && ! str_contains($shortcut, 'pass') && ! str_contains($shortcut, 'pw') && ! str_contains($shortcut, 'sandi')) {
                $score -= 60;
            }
        }

        // 3. Specific intent handling: LUPA USER ID / USERNAME
        if ($hasForgotIntent && $hasUserIdIntent && ! $hasPasswordIntent) {
            if (in_array($shortcut, ['lupa', 'lupaid', 'lupa-id', 'username', 'id'], true)) {
                $score += 85;
            } elseif (str_contains($contentLower, 'user id') || str_contains($contentLower, 'username')) {
                $score += 65;
            }
        }

        // 4. Keyword tokens match
        $words = preg_split('/[\s,?.!-]+/', $user, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        foreach ($words as $w) {
            if (strlen($w) < 3) {
                continue;
            }
            if (str_contains($shortcut, $w)) {
                $score += 15;
            }
            if (str_contains($contentLower, $w)) {
                $score += 5;
            }
        }

        return max(0, $score);
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
