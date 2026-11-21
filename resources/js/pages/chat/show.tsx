import { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    ArrowUpRight,
    Bot,
    Clock,
    FileText,
    HelpCircle,
    Home as HomeIcon,
    MessageSquare,
    Plus,
    RotateCcw,
    Send,
    Sparkles,
    User as UserIcon,
    UserCheck,
    X,
} from 'lucide-react';
import ChatMarkdown from '@/components/chat-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { echo } from '@/echo';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at?: string;
}

interface ApplicationData {
    id: number;
    app_id: string;
    name: string;
    description?: string | null;
    welcome_message?: string | null;
    is_active: boolean;
}

interface Props {
    application: ApplicationData;
    sessionTimeoutMinutes?: number;
}

export default function ChatShow({
    application,
    sessionTimeoutMinutes = 10,
}: Props) {
    const storageKey = `autochat_session_${application.app_id}`;
    const formStorageKey = `autochat_form_${application.app_id}`;

    // Navigation tab: 'beranda' (Home) | 'pesan' (Messages) | 'bantuan' (Help)
    const [activeTab, setActiveTab] = useState<'beranda' | 'pesan' | 'bantuan'>('beranda');

    // Pre-chat form data
    const [userId, setUserId] = useState('');
    const [questionTopic, setQuestionTopic] = useState('');
    const [hasSubmittedForm, setHasSubmittedForm] = useState(false);

    const [sessionUuid, setSessionUuid] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTakenOver, setIsTakenOver] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, activeTab]);

    // Quick links on the Home view (Grid 2x2 seperti Screenshot 1)
    const homeQuickLinks = [
        {
            title: 'Prediksi Togel',
            query: 'Halo CS, bisa berikan bocoran prediksi togel dan pasaran hari ini?',
        },
        {
            title: 'Rtp Slot Gacor',
            query: 'Halo CS, apa saja daftar RTP slot yang lagi gacor hari ini?',
        },
        {
            title: 'Download APK',
            query: 'Bagaimana cara download dan instal aplikasi APK versi terbaru?',
        },
        {
            title: 'Promosi',
            query: 'Bisa jelaskan promo dan bonus deposit / new member terbaru yang sedang aktif?',
        },
    ];

    // Quick chips on the Active Chat view (Chips seperti Screenshot 3)
    const chatChips = [
        { label: 'Download APK', query: 'Saya mau link download APK resmi' },
        { label: 'Promo Kami', query: 'Info promo dan bonus yang tersedia' },
        { label: 'Whatsapp', query: 'Minta link WhatsApp CS resmi' },
        { label: 'Telegram Official', query: 'Minta channel Telegram official' },
    ];

    // Generate UUID v4
    const generateUuid = (): string => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };

    // Save session state to localStorage
    const persistSession = (uuid: string) => {
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    uuid,
                    lastActivity: Date.now(),
                })
            );
        } catch (e) {
            console.error('Failed to save session to localStorage', e);
        }
    };

    // Default welcome promo message if none set in CMS
    const defaultWelcomeMessage =
        application.welcome_message ||
        `Selamat Datang di ${application.name} Link ANTI NAWALA ${application.name}
️ [https://kiamkiam.site/cvtogel1](https://kiamkiam.site/cvtogel1) ️ [https://kiamkiam.site/cvtogel2](https://kiamkiam.site/cvtogel2) WHATSAPP ️ [https://kiamkiam.site/wacvtogel](https://kiamkiam.site/wacvtogel) TELEGRAM ️ [https://kiamkiam.site/telecvtogel](https://kiamkiam.site/telecvtogel) ( WAJIB DI SIMPAN )`;

    // Initialize or restore session
    useEffect(() => {
        try {
            const savedForm = localStorage.getItem(formStorageKey);
            if (savedForm) {
                const parsedForm = JSON.parse(savedForm);
                if (parsedForm.userId) {
                    setUserId(parsedForm.userId);
                    setQuestionTopic(parsedForm.questionTopic || '');
                    setHasSubmittedForm(true);
                }
            }

            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                const lastActivity = Number(parsed.lastActivity) || 0;
                const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
                const isExpired = Date.now() - lastActivity > timeoutMs;

                if (isExpired) {
                    setIsSessionExpired(true);
                    setSessionUuid(parsed.uuid || generateUuid());
                    return;
                }

                // Active session restored
                setSessionUuid(parsed.uuid);
                fetchSessionMessages(parsed.uuid);
                return;
            }
        } catch (e) {
            console.error('Error reading localStorage session', e);
        }

        // New visitor: create initial UUID
        const newUuid = generateUuid();
        setSessionUuid(newUuid);
        persistSession(newUuid);
    }, [application.app_id]);

    // Realtime WebSocket listener via Laravel Reverb
    useEffect(() => {
        if (!sessionUuid) return;

        const channel = echo.channel(`conversation.${sessionUuid}`);
        const handleIncoming = (event: any) => {
            if (event.is_taken_over !== undefined) {
                setIsTakenOver(Boolean(event.is_taken_over));
            }

            if (event.role !== 'user') {
                setHasSubmittedForm(true);
                setMessages((prev) => {
                    const alreadyExists = prev.some((m) => String(m.id) === String(event.id));
                    if (alreadyExists) return prev;
                    return [
                        ...prev,
                        {
                            id: String(event.id),
                            role: event.role,
                            content: event.content,
                            created_at: event.created_at,
                        },
                    ];
                });
            }
        };

        channel.listen('.MessageSent', handleIncoming);
        channel.listen('MessageSent', handleIncoming);

        return () => {
            channel.stopListening('.MessageSent');
            channel.stopListening('MessageSent');
        };
    }, [sessionUuid]);

    // Fetch existing messages from backend for current active session
    const fetchSessionMessages = async (uuid: string) => {
        try {
            const res = await fetch(`/chat/${application.app_id}/session/${uuid}`);
            if (res.ok) {
                const data = await res.json();
                if (data.is_taken_over !== undefined) {
                    setIsTakenOver(Boolean(data.is_taken_over));
                }
                if (data.expired) {
                    setIsSessionExpired(true);
                } else if (data.messages && data.messages.length > 0) {
                    setMessages(data.messages);
                    setHasSubmittedForm(true);
                }
            }
        } catch (e) {
            console.warn('Could not load prior session messages', e);
        }
    };

    // Start a completely new chat session with a fresh UUID v4
    const startNewChat = () => {
        const newUuid = generateUuid();
        setSessionUuid(newUuid);
        setMessages([]);
        setInput('');
        setIsSessionExpired(false);
        setErrorMessage(null);
        setHasSubmittedForm(false);
        persistSession(newUuid);
        setActiveTab('pesan');
    };

    const handleStartChatFromForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId.trim()) {
            setErrorMessage('Harap isi User ID Anda.');
            return;
        }

        const formData = {
            userId: userId.trim(),
            questionTopic: questionTopic || 'Lainnya',
        };

        try {
            localStorage.setItem(formStorageKey, JSON.stringify(formData));
        } catch (err) {
            console.error('Failed to save form data', err);
        }

        setHasSubmittedForm(true);
        setActiveTab('pesan');
        setErrorMessage(null);

        // Send initial inquiry if topic was chosen
        if (questionTopic && questionTopic !== 'Pilih...') {
            const initialText = `Halo CS, User ID saya: ${formData.userId}. Saya ingin bantuan terkait: ${formData.questionTopic}.`;
            handleSendMessage(initialText);
        }
    };

    const handleSendMessage = async (textToSend?: string) => {
        const text = (textToSend ?? input).trim();

        if (!text || isLoading) return;

        if (isSessionExpired) {
            setErrorMessage('Sesi telah kedaluwarsa. Silakan tekan tombol Mulai Chat Baru.');
            return;
        }

        if (!application.is_active) {
            setErrorMessage('Chatbot ini sedang dinonaktifkan.');
            return;
        }

        const nowFormatted = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });

        const tempUserMsg: ChatMessage = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: text,
            created_at: nowFormatted,
        };

        setMessages((prev) => [...prev, tempUserMsg]);
        setInput('');
        setIsLoading(true);
        setErrorMessage(null);
        persistSession(sessionUuid);

        try {
            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;

            const response = await fetch(`/chat/${application.app_id}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token || '',
                },
                body: JSON.stringify({
                    uuid: sessionUuid,
                    message: text,
                }),
            });

            const data = await response.json();

            if (response.status === 422 && data.expired) {
                setIsSessionExpired(true);
                setErrorMessage(data.error || 'Sesi telah kedaluwarsa.');
                setIsLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || 'Gagal mengirim pesan.');
            }

            if (data.assistant_message) {
                setMessages((prev) => [
                    ...prev.filter((m) => m.id !== tempUserMsg.id),
                    data.user_message || tempUserMsg,
                    data.assistant_message,
                ]);
            }

            persistSession(sessionUuid);
        } catch (err: unknown) {
            const errorText = err instanceof Error ? err.message : 'Terjadi kendala jaringan.';
            setErrorMessage(errorText);

            setMessages((prev) => [
                ...prev,
                {
                    id: `err-${Date.now()}`,
                    role: 'assistant',
                    content: 'Maaf, terjadi kendala saat menghubungi asisten. Silakan coba kembali sesaat lagi.',
                    created_at: nowFormatted,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#FFF9E6]">
            <Head title={`Livechat - ${application.name}`} />

            {/* ============================================================== */}
            {/* LEFT SPLIT COLUMN: BRAND WELCOME SPLASH (50% Layar Kiri) */}
            {/* ============================================================== */}
            <div className="hidden lg:flex lg:w-1/2 h-full flex-col justify-center items-center px-10 xl:px-20 relative select-none">
                <div className="w-full max-w-lg space-y-6">
                    {/* Brand Icon Circle */}
                    <div className="flex size-14 items-center justify-center rounded-full bg-[#FFD200] text-neutral-900 shadow-sm border border-amber-300">
                        <Sparkles className="size-7 fill-neutral-900 text-neutral-900" />
                    </div>

                    <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-neutral-600">
                            CHAT DENGAN TIM {application.name.toUpperCase()}
                        </span>
                        <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-neutral-900 leading-tight">
                            Selamat Datang di Livechat {application.name} <span className="inline-block">😊</span>
                        </h1>
                        <p className="text-base text-neutral-700 font-medium pt-1">
                            Ada yang Bisa Kami Bantu, Bosku?
                        </p>
                    </div>

                    <p className="text-xs text-neutral-500 leading-relaxed max-w-md pt-2">
                        {application.description ||
                            'Layanan customer support resmi dan interaktif 24 jam nonstop untuk membantu semua kebutuhan dan kendala Anda.'}
                    </p>
                </div>
            </div>

            {/* ============================================================== */}
            {/* RIGHT COLUMN: INTERACTIVE LIVE CHAT WIDGET (50% Layar Kanan) */}
            {/* ============================================================== */}
            <div className="flex flex-col w-full lg:w-1/2 h-full bg-white border-l border-amber-200/80 shadow-2xl overflow-hidden">
                {/* TOP HEADER BAR (Kuning Emas Khas Screenshot) */}
                <div className="bg-[#FFD200] text-neutral-900 px-5 py-4 shrink-0 shadow-sm border-b border-amber-300">
                    <div className="flex items-center justify-between">
                        {/* App Title & Brand */}
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded-full bg-neutral-900 text-[#FFD200]">
                                <Bot className="size-4" />
                            </div>
                            <span className="font-extrabold text-sm tracking-wide text-neutral-950 uppercase">
                                {application.name}
                            </span>
                            {isTakenOver && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-950/10 px-2 py-0.5 text-[10px] font-bold text-neutral-950 border border-neutral-950/15">
                                    <UserCheck className="size-3 text-amber-800" />
                                    Admin CS
                                </span>
                            )}
                        </div>

                        {/* Customer Service Agent Avatars (Overlapping circle photos) */}
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2 overflow-hidden">
                                <img
                                    className="inline-block size-7 rounded-full ring-2 ring-white object-cover"
                                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                                    alt="CS Agent 1"
                                />
                                <img
                                    className="inline-block size-7 rounded-full ring-2 ring-white object-cover"
                                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80"
                                    alt="CS Agent 2"
                                />
                                <img
                                    className="inline-block size-7 rounded-full ring-2 ring-white object-cover"
                                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                                    alt="CS Agent 3"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={startNewChat}
                                title="Reset & Chat Baru"
                                className="size-7 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer text-neutral-800 ml-1"
                            >
                                <RotateCcw className="size-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Subtitle in Header */}
                    <div className="mt-3">
                        <p className="text-[11px] font-medium text-neutral-800">
                            Selamat Datang di Livechat {application.name} 😊
                        </p>
                        <h2 className="text-sm font-bold text-neutral-950">
                            Ada yang Bisa Kami Bantu, Bosku?
                        </h2>
                    </div>
                </div>

                {/* Expired Session Alert */}
                {isSessionExpired && (
                    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2">
                        <div className="flex items-center justify-between gap-2 text-xs text-amber-900">
                            <div className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-amber-600 shrink-0" />
                                <span>Sesi kedaluwarsa setelah {sessionTimeoutMinutes} menit.</span>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={startNewChat}
                                className="h-6 px-2 text-[11px] font-bold border-amber-600/40 hover:bg-amber-100 cursor-pointer"
                            >
                                Mulai Baru
                            </Button>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {errorMessage && !isSessionExpired && (
                    <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertCircle className="size-3.5 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* BODY VIEW SWITCHER: BERANDA / PRE-CHAT FORM / ACTIVE CHAT */}
                {/* ============================================================== */}
                <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 space-y-4">
                    {/* TAB 1: BERANDA (HOME VIEW - Screenshot 1) */}
                    {activeTab === 'beranda' && (
                        <div className="space-y-4">
                            {/* Big Promo Banner Card (Golden / Gaming Dark Banner) */}
                            <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-neutral-950 via-neutral-900 to-amber-950 p-6 text-white shadow-md border border-amber-500/40 text-center">
                                <div className="absolute -right-8 -top-8 size-28 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
                                <div className="absolute -left-8 -bottom-8 size-28 rounded-full bg-yellow-500/10 blur-xl pointer-events-none" />

                                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-300 border border-amber-500/30 mb-2">
                                    <Sparkles className="size-3" /> OFFICIAL 24/7 SUPPORT
                                </div>

                                <h3 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-sm uppercase">
                                    {application.name}
                                </h3>

                                <p className="text-xs text-neutral-300 mt-2 line-clamp-3 leading-relaxed">
                                    {application.description ||
                                        'Pusat Bantuan Resmi & Layanan Member 24 Jam Nonstop. Proses Deposit & WD Tercepat, Promo & Event Menarik!'}
                                </p>
                            </div>

                            {/* Quick Links Grid (2 Columns, seperti Screenshot 1) */}
                            <div className="grid grid-cols-2 gap-2.5">
                                {homeQuickLinks.map((item, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setActiveTab('pesan');
                                            if (hasSubmittedForm) {
                                                handleSendMessage(item.query);
                                            }
                                        }}
                                        className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5 text-left shadow-2xs hover:border-amber-400 hover:bg-amber-50/50 transition-all cursor-pointer group"
                                    >
                                        <span className="text-xs font-semibold text-neutral-800 group-hover:text-amber-950">
                                            {item.title}
                                        </span>
                                        <ArrowUpRight className="size-3.5 text-neutral-400 group-hover:text-amber-600 transition-colors" />
                                    </button>
                                ))}
                            </div>

                            {/* Tombol Kuning: Kirim Pesan -> */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('pesan')}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FFD200] hover:bg-[#F5C700] text-neutral-950 font-bold py-3 text-xs sm:text-sm shadow-sm transition-transform active:scale-[0.99] cursor-pointer"
                                >
                                    <span>Kirim Pesan</span>
                                    <ArrowRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PESAN (MESSAGES) */}
                    {activeTab === 'pesan' && (
                        <>
                            {/* IF HAS NOT SUBMITTED PRE-CHAT FORM: SHOW FORM VIEW (Screenshot 2) */}
                            {!hasSubmittedForm && messages.length === 0 ? (
                                <div className="space-y-4">
                                    {/* Welcome & Promotional Card */}
                                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs space-y-3 text-xs leading-relaxed text-neutral-800">
                                        <div className="flex items-center gap-2 font-bold text-neutral-900 border-b border-neutral-100 pb-2">
                                            <Sparkles className="size-4 text-amber-500" />
                                            <span>Selamat Datang di {application.name}</span>
                                        </div>
                                        <ChatMarkdown content={defaultWelcomeMessage} />
                                    </div>

                                    {/* Pre-Chat Formulir Card (Persis Screenshot 2) */}
                                    <form
                                        onSubmit={handleStartChatFromForm}
                                        className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs space-y-3.5"
                                    >
                                        <p className="text-xs font-semibold text-neutral-700">
                                            Harap di isi dengan username yang benar !!!
                                        </p>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-neutral-700">
                                                USER ID : <span className="text-destructive">*</span>
                                            </label>
                                            <Input
                                                value={userId}
                                                onChange={(e) => setUserId(e.target.value)}
                                                placeholder="Masukkan User ID / Username..."
                                                required
                                                className="h-10 text-xs rounded-xl bg-slate-50 border-neutral-200"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-neutral-700">
                                                Pilih Pertanyaan yang bisa kami bantu bosku ?{' '}
                                                <span className="text-destructive">*</span>
                                            </label>
                                            <select
                                                value={questionTopic}
                                                onChange={(e) => setQuestionTopic(e.target.value)}
                                                className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 border border-neutral-200 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                            >
                                                <option value="">Pilih...</option>
                                                <option value="Deposit & Withdraw">Deposit & Withdraw</option>
                                                <option value="Klaim Bonus & Promo">Klaim Bonus & Promo</option>
                                                <option value="Kendala Login & Password">Kendala Login & Password</option>
                                                <option value="Prediksi & Pasaran Togel">Prediksi & Pasaran Togel</option>
                                                <option value="Bocoran Slot Gacor">Bocoran Slot Gacor</option>
                                                <option value="Lainnya">Lainnya</option>
                                            </select>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full mt-2 flex items-center justify-center rounded-xl bg-[#FFD200] hover:bg-[#F5C700] text-neutral-950 font-bold py-2.5 text-xs shadow-xs transition-transform active:scale-[0.99] cursor-pointer"
                                        >
                                            Mulai chat
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                /* IF ACTIVE CHAT: SHOW CHAT STREAM (Screenshot 3) */
                                <div className="space-y-4">
                                    {/* Welcome Announcement Card */}
                                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs space-y-2 text-xs leading-relaxed text-neutral-800">
                                        <div className="flex items-center gap-2 font-bold text-neutral-900 border-b border-neutral-100 pb-2">
                                            <Sparkles className="size-4 text-amber-500" />
                                            <span>Informasi Resmi & Link Alternatif</span>
                                        </div>
                                        <ChatMarkdown content={defaultWelcomeMessage} />
                                    </div>

                                    {/* Formulir Card (Persis Screenshot 3) */}
                                    {userId && (
                                        <div className="rounded-2xl border border-amber-300 bg-white shadow-2xs overflow-hidden">
                                            <div className="bg-[#FFD200] px-3.5 py-1.5 flex items-center gap-1.5 text-neutral-950 text-xs font-bold">
                                                <FileText className="size-3.5" />
                                                <span>Formulir</span>
                                            </div>
                                            <div className="p-3 text-[11px] space-y-1 text-neutral-700 bg-amber-50/20">
                                                <p>
                                                    <span className="font-semibold text-neutral-900">USER ID : </span>
                                                    {userId}
                                                </p>
                                                <p>
                                                    <span className="font-semibold text-neutral-900">
                                                        Pilih Pertanyaan yang bisa kami bantu bosku ? :{' '}
                                                    </span>
                                                    {questionTopic || 'Lainnya'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Initial Greeting Bot Message */}
                                    <div className="flex items-start gap-2.5">
                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFD200] text-neutral-950 font-bold text-xs shadow-2xs">
                                            <Bot className="size-4" />
                                        </div>
                                        <div className="space-y-2 max-w-[85%]">
                                            <span className="text-[10px] font-bold text-neutral-600 block">
                                                {application.name}
                                            </span>
                                            <div className="rounded-2xl rounded-tl-xs bg-white border border-neutral-200/90 p-3 text-xs text-neutral-900 shadow-2xs leading-relaxed">
                                                Hallo bosku 👋 Selamat datang di layanan kami, ada yang bisa dibantu,
                                                Bosku?
                                            </div>

                                            {/* Quick Action Chips (Screenshot 3) */}
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {chatChips.map((chip, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        disabled={isLoading || isSessionExpired || !application.is_active}
                                                        onClick={() => handleSendMessage(chip.query)}
                                                        className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-medium text-neutral-700 hover:border-amber-400 hover:bg-amber-50 transition-colors shadow-2xs cursor-pointer"
                                                    >
                                                        {chip.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Message History Stream */}
                                    {messages.map((message) => {
                                        // Takeover / System message as clean center badge (muncul sebagai badge di sisi user)
                                        const isSystemBadge =
                                            message.role === 'system' ||
                                            message.content.includes('Percakapan telah diambil alih') ||
                                            message.content.includes('Percakapan telah dikembalikan');

                                        if (isSystemBadge) {
                                            return (
                                                <div key={message.id} className="flex justify-center my-3.5 w-full">
                                                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 px-4 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs text-center leading-normal">
                                                        <UserCheck className="size-3.5 text-amber-600 shrink-0" />
                                                        <span>{message.content}</span>
                                                    </span>
                                                </div>
                                            );
                                        }

                                        const isUser = message.role === 'user';

                                        return (
                                            <div
                                                key={message.id}
                                                className={`flex items-start gap-2.5 ${
                                                    isUser ? 'flex-row-reverse' : 'flex-row'
                                                }`}
                                            >
                                                <div
                                                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs ${
                                                        isUser
                                                            ? 'bg-neutral-800 text-white'
                                                            : 'bg-[#FFD200] text-neutral-950'
                                                    }`}
                                                >
                                                    {isUser ? (
                                                        <UserIcon className="size-3.5" />
                                                    ) : (
                                                        <Bot className="size-3.5" />
                                                    )}
                                                </div>

                                                <div
                                                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                                                        isUser
                                                            ? 'rounded-tr-xs bg-neutral-900 text-white'
                                                            : 'rounded-tl-xs border border-neutral-200/90 bg-white text-neutral-900'
                                                    }`}
                                                >
                                                    {isUser ? (
                                                        <div className="whitespace-pre-wrap select-text">
                                                            {message.content}
                                                        </div>
                                                    ) : (
                                                        <ChatMarkdown content={message.content} />
                                                    )}

                                                    {message.created_at && (
                                                        <div
                                                            className={`mt-1 text-[9px] text-right font-mono ${
                                                                isUser ? 'text-white/60' : 'text-neutral-400'
                                                            }`}
                                                        >
                                                            {message.created_at}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Typing Indicator */}
                                    {isLoading && (
                                        <div className="flex items-start gap-2.5">
                                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFD200] text-neutral-950 font-bold shadow-2xs">
                                                <Bot className="size-3.5" />
                                            </div>
                                            <div className="rounded-2xl rounded-tl-xs border border-neutral-200 bg-white px-3 py-2 shadow-2xs">
                                                <div className="flex items-center gap-1">
                                                    <span className="size-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="size-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="size-1.5 rounded-full bg-amber-500 animate-bounce" />
                                                    <span className="text-[11px] text-neutral-500 ml-1.5">
                                                        Sedang mengetik...
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </>
                    )}

                    {/* TAB 3: BANTUAN (HELP / FAQ VIEW) */}
                    {activeTab === 'bantuan' && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs space-y-3">
                                <div className="flex items-center gap-2 font-bold text-neutral-900 border-b border-neutral-100 pb-2">
                                    <HelpCircle className="size-4 text-amber-500" />
                                    <span>Pusat Bantuan & FAQ</span>
                                </div>
                                <p className="text-xs text-neutral-600">
                                    Temukan jawaban cepat untuk pertanyaan umum seputar akun, deposit, dan promosi:
                                </p>

                                <div className="space-y-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveTab('pesan');
                                            handleSendMessage('Bagaimana cara deposit dengan Virtual Account dan QRIS?');
                                        }}
                                        className="w-full text-left p-3 rounded-xl border border-neutral-100 bg-slate-50 hover:bg-amber-50 text-xs font-semibold text-neutral-800 transition-colors"
                                    >
                                        💳 Cara Deposit via VA & QRIS
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveTab('pesan');
                                            handleSendMessage('Berapa minimal withdraw dan berapa lama prosesnya?');
                                        }}
                                        className="w-full text-left p-3 rounded-xl border border-neutral-100 bg-slate-50 hover:bg-amber-50 text-xs font-semibold text-neutral-800 transition-colors"
                                    >
                                        ⏱️ Waktu & Limit Withdraw
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveTab('pesan');
                                            handleSendMessage('Bagaimana cara reset password jika lupa sandi?');
                                        }}
                                        className="w-full text-left p-3 rounded-xl border border-neutral-100 bg-slate-50 hover:bg-amber-50 text-xs font-semibold text-neutral-800 transition-colors"
                                    >
                                        🔑 Lupa Password / Akun Terkunci
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ============================================================== */}
                {/* BOTTOM CHAT INPUT BAR (Persis Screenshot 3) */}
                {/* Hanya muncul jika sedang di Tab Pesan dan sudah mulai chat */}
                {/* ============================================================== */}
                {activeTab === 'pesan' && (hasSubmittedForm || messages.length > 0) && (
                    <div className="border-t border-neutral-200 bg-white p-3 shrink-0">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                            className="flex items-center gap-2"
                        >
                            <button
                                type="button"
                                onClick={() => textareaRef.current?.focus()}
                                className="flex size-9 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-neutral-600 transition-colors cursor-pointer shrink-0"
                                title="Lampiran / Pilihan Cepat"
                            >
                                <Plus className="size-4" />
                            </button>

                            <input
                                ref={textareaRef as any}
                                value={input}
                                disabled={isSessionExpired || isLoading || !application.is_active}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={
                                    isSessionExpired
                                        ? 'Sesi berakhir. Mulai chat baru...'
                                        : !application.is_active
                                          ? 'Chatbot sedang offline...'
                                          : 'Tulis pesan...'
                                }
                                className="flex-1 h-9 px-3.5 text-xs rounded-full bg-slate-100 border-none text-neutral-900 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-neutral-400"
                            />

                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading || !application.is_active}
                                className="flex size-9 items-center justify-center rounded-full bg-[#FFD200] hover:bg-[#F5C700] text-neutral-950 font-bold disabled:opacity-40 transition-colors cursor-pointer shrink-0 shadow-2xs"
                            >
                                <Send className="size-3.5" />
                            </button>
                        </form>
                    </div>
                )}

                {/* ============================================================== */}
                {/* BOTTOM NAVIGATION TABS (Persis Screenshot 2 & 3: Beranda, Pesan, Bantuan) */}
                {/* ============================================================== */}
                <div className="border-t border-neutral-200 bg-white px-6 py-2.5 shrink-0 flex flex-col items-center gap-1.5 select-none">
                    <div className="w-full flex items-center justify-around">
                        <button
                            type="button"
                            onClick={() => setActiveTab('beranda')}
                            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                                activeTab === 'beranda'
                                    ? 'text-[#E0A800] font-bold'
                                    : 'text-neutral-400 hover:text-neutral-600'
                            }`}
                        >
                            <HomeIcon className="size-4.5" />
                            <span>Beranda</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('pesan')}
                            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer relative ${
                                activeTab === 'pesan'
                                    ? 'text-[#E0A800] font-bold'
                                    : 'text-neutral-400 hover:text-neutral-600'
                            }`}
                        >
                            <MessageSquare className="size-4.5" />
                            <span>Pesan</span>
                            {activeTab === 'pesan' && (
                                <span className="absolute -top-1 right-2 size-2 rounded-full bg-amber-500 animate-pulse" />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('bantuan')}
                            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                                activeTab === 'bantuan'
                                    ? 'text-[#E0A800] font-bold'
                                    : 'text-neutral-400 hover:text-neutral-600'
                            }`}
                        >
                            <HelpCircle className="size-4.5" />
                            <span>Bantuan</span>
                        </button>
                    </div>

                    <div className="text-[10px] text-neutral-400 font-medium">
                        Powered by <span className="font-bold text-neutral-600">AutoChat</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
