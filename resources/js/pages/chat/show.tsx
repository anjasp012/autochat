import { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    ArrowUpRight,
    Bot,
    Clock,
    ExternalLink,
    FileText,
    HelpCircle,
    Home as HomeIcon,
    MessageSquare,
    RotateCcw,
    Send,
    Shield,
    Sparkles,
    User as UserIcon,
    UserCheck,
    X,
} from 'lucide-react';
import ChatMarkdown from '@/components/chat-markdown';
import InChatForm from '@/components/in-chat-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { echo } from '@/echo';
import {
    DEFAULT_CHAT_TEMPLATES,
    PRESET_AVATARS,
    type ChatTemplate,
} from '@/types/chat-template';

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
    chat_settings?: Record<string, any> | null;
    is_active: boolean;
}

interface Props {
    application: ApplicationData;
    sessionTimeoutMinutes?: number;
}

interface QuickButton {
    id?: string;
    title: string;
    type: 'query' | 'link';
    value: string;
}

export default function ChatShow({
    application,
    sessionTimeoutMinutes = 10,
}: Props) {
    const storageKey = `autochat_session_${application.app_id}`;
    const formStorageKey = `autochat_form_${application.app_id}`;

    // Ambil kustomisasi chat yang diatur dari CMS
    const cs = application.chat_settings || {};

    const bgColor = cs.bg_color || '#FFF9E6';
    const textColor = cs.text_color || '#171717';
    const headerColor = cs.header_color || '#FFD200';
    const headerTextColor = cs.header_text_color || '#0a0a0a';
    const customIconUrl = cs.custom_icon_url || '';
    const faviconUrl = cs.favicon_url || cs.custom_icon_url || '';
    const splashTitle = cs.splash_title || `Selamat Datang di Livechat ${application.name} 😊`;
    const splashSubtitle = cs.splash_subtitle || `CHAT DENGAN TIM ${application.name.toUpperCase()}`;
    const splashDescription = cs.splash_description || 'Ada yang Bisa Kami Bantu, Bosku?';
    const headerTitle = cs.header_title || application.name;

    // 4 CS Avatars: Rahma, Nindy, Rosa, Intan
    const defaultAvatars = [
        '/images/avatars/cs-1.png',
        '/images/avatars/cs-2.png',
        '/images/avatars/cs-3.png',
        '/images/avatars/cs-4.png',
    ];

    const activeAvatars: string[] =
        Array.isArray(cs.selected_avatars) && cs.selected_avatars.length > 0
            ? cs.selected_avatars
                .filter((url: string) => typeof url === 'string' && !url.includes('unsplash.com'))
                .slice(0, 3)
            : [];

    if (activeAvatars.length === 0) {
        activeAvatars.push(defaultAvatars[0], defaultAvatars[1], defaultAvatars[2]);
    }

    // CS Aktif diacak per percakapan baru dan dikunci untuk seluruh percakapan tersebut
    const [assignedCs, setAssignedCs] = useState<PresetAvatar>(() => {
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem(storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.assignedCs && parsed.assignedCs.name && parsed.assignedCs.url) {
                        return parsed.assignedCs;
                    }
                }
            } catch (e) { }
        }
        return PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
    });

    const csAgentName = assignedCs.name;
    const csAvatarUrl = assignedCs.url;

    // Template Chat & Topik Formulir Awal dari CMS Admin
    const chatTemplates: ChatTemplate[] =
        Array.isArray(cs.chat_templates) && cs.chat_templates.length > 0
            ? cs.chat_templates
            : DEFAULT_CHAT_TEMPLATES;

    const bannerBadge = cs.banner_badge || 'OFFICIAL 24/7 SUPPORT';
    const bannerTitle = cs.banner_title || application.name;
    const bannerDesc =
        cs.banner_description ||
        'Pusat Bantuan Resmi & Layanan Member 24 Jam Nonstop. Proses Deposit & WD Tercepat, Promo & Event Menarik!';
    const bannerImageUrl = cs.banner_image_url || '';
    const isPhotoBanner =
        (cs.banner_type === 'image' || (!cs.banner_type && Boolean(bannerImageUrl))) &&
        Boolean(bannerImageUrl);

    // Tombol Cepat Dinamis (Bisa 1, 2, atau berapapun, tipe pertanyaan atau link URL)
    const quickButtons: QuickButton[] =
        Array.isArray(cs.quick_buttons) && cs.quick_buttons.length > 0
            ? cs.quick_buttons
            : [
                {
                    title: cs.btn_1_title || 'Prediksi Togel',
                    type: 'query',
                    value:
                        cs.btn_1_query ||
                        'Halo CS, bisa berikan bocoran prediksi togel dan pasaran hari ini?',
                },
                {
                    title: cs.btn_2_title || 'Rtp Slot Gacor',
                    type: 'query',
                    value:
                        cs.btn_2_query ||
                        'Halo CS, apa saja daftar RTP slot yang lagi gacor hari ini?',
                },
                {
                    title: cs.btn_3_title || 'Download APK',
                    type: 'link',
                    value: cs.btn_3_query || 'https://kiamkiam.site/cvtogel1',
                },
                {
                    title: cs.btn_4_title || 'Promosi',
                    type: 'query',
                    value:
                        cs.btn_4_query ||
                        'Bisa jelaskan promo dan bonus deposit / new member terbaru yang sedang aktif?',
                },
            ];

    // Default welcome promo message if none set in CMS
    const appCleanName = application.name.replace(/^CS\s+/i, '');
    const defaultWelcomeMessage =
        cs.welcome_opening ||
        application.welcome_message ||
        `Selamat Datang di ${appCleanName} Link ANTI NAWALA ${appCleanName}\n⭐ https://kiamkiam.site/cvtogel1\n⭐ https://kiamkiam.site/cvtogel2\n\nWHATSAPP\n⭐ https://kiamkiam.site/wacvtogel\nTELEGRAM\n⭐ https://kiamkiam.site/telecvtogel ( WAJIB DI SIMPAN )`;

    // Navigation tab: 'beranda' (Home) | 'pesan' (Messages) | 'bantuan' (Help)
    const [activeTab, setActiveTab] = useState<'beranda' | 'pesan' | 'bantuan'>('beranda');

    // Pre-chat form data
    const [userId, setUserId] = useState('');
    const [questionTopic, setQuestionTopic] = useState('');
    const [hasSubmittedForm, setHasSubmittedForm] = useState(false);

    const [sessionUuid, setSessionUuid] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTakenOver, setIsTakenOver] = useState(false);
    const [isWaitingAdmin, setIsWaitingAdmin] = useState(false);
    const isEmbed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1';
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Modal konfirmasi tutup percakapan
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // Hover state untuk tombol dan chip
    const [hoveredBtn, setHoveredBtn] = useState<number | null>(null);
    const [hoveredChip, setHoveredChip] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, activeTab]);

    // Jaga fokus agar selalu aktif di input chat, tidak perlu klik manual berulang kali
    useEffect(() => {
        if (activeTab === 'pesan' && hasSubmittedForm && application.is_active) {
            const timer = setTimeout(() => {
                textareaRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [activeTab, hasSubmittedForm, isLoading, messages.length, application.is_active]);

    // Set browser title bersih tanpa '- AutoChat'
    useEffect(() => {
        const cleanTitle = headerTitle || application.name;
        if (cleanTitle) {
            document.title = cleanTitle;
            const interval = setInterval(() => {
                if (document.title !== cleanTitle) {
                    document.title = cleanTitle;
                }
            }, 250);
            return () => clearInterval(interval);
        }
    }, [headerTitle, application.name]);

    // Dynamically update browser tab favicon for this specific application
    useEffect(() => {
        const activeFavicon = faviconUrl || '/favicon.png';
        const oldLinks = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
        oldLinks.forEach((el) => el.parentNode?.removeChild(el));

        const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
        rels.forEach((rel) => {
            const link = document.createElement('link');
            link.rel = rel;
            link.href = activeFavicon;
            document.head.appendChild(link);
        });
    }, [faviconUrl]);

    // UUID Generator
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

    const persistSession = (uuid: string, csToSave?: PresetAvatar) => {
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    uuid,
                    lastActivity: Date.now(),
                    assignedCs: csToSave || assignedCs,
                })
            );
        } catch (e) {
            console.error('Error persisting session to localStorage', e);
        }
    };

    // Helper to start fresh chat session
    const handleStartNewChat = () => {
        try {
            localStorage.removeItem(storageKey);
            localStorage.removeItem(formStorageKey);
        } catch (e) {
            console.error('Error removing session key', e);
        }
        const newUuid = generateUuid();
        const nextCs = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
        setAssignedCs(nextCs);
        setSessionUuid(newUuid);
        persistSession(newUuid, nextCs);
        setIsSessionExpired(false);
        setMessages([]);
        setHasSubmittedForm(false);
        setUserId('');
        setQuestionTopic('');
        setErrorMessage(null);
    };

    // Tutup percakapan dan kembali ke Beranda (mulai baru)
    const handleConfirmClose = () => {
        setShowCloseConfirm(false);
        handleStartNewChat();
        setActiveTab('beranda');
    };

    // Initialize or restore session
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.assignedCs && parsed.assignedCs.name && parsed.assignedCs.url) {
                    setAssignedCs(parsed.assignedCs);
                }
                const lastActivity = Number(parsed.lastActivity) || 0;
                const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
                const isExpired = Date.now() - lastActivity > timeoutMs;

                if (isExpired) {
                    setIsSessionExpired(true);
                    setSessionUuid(parsed.uuid || generateUuid());

                    // Prefill form values without locking user into submitted state
                    const savedForm = localStorage.getItem(formStorageKey);
                    if (savedForm) {
                        try {
                            const parsedForm = JSON.parse(savedForm);
                            if (parsedForm.userId) {
                                setUserId(parsedForm.userId);
                                setQuestionTopic(parsedForm.questionTopic || '');
                            }
                        } catch (e) { }
                    }
                    return;
                }

                // Active session restored
                setSessionUuid(parsed.uuid);
                fetchSessionMessages(parsed.uuid);

                const savedForm = localStorage.getItem(formStorageKey);
                if (savedForm) {
                    try {
                        const parsedForm = JSON.parse(savedForm);
                        if (parsedForm.userId) {
                            setUserId(parsedForm.userId);
                            setQuestionTopic(parsedForm.questionTopic || '');
                            setHasSubmittedForm(true);
                        }
                    } catch (e) { }
                }
                return;
            }
        } catch (e) {
            console.error('Error reading localStorage session', e);
        }

        // New visitor: create initial UUID
        const newUuid = generateUuid();
        const nextCs = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
        setAssignedCs(nextCs);
        setSessionUuid(newUuid);
        persistSession(newUuid, nextCs);
    }, [application.app_id]);

    // Realtime WebSocket listener via Laravel Reverb
    useEffect(() => {
        if (!sessionUuid) return;

        const channel = echo.channel(`conversation.${sessionUuid}`);
        const handleIncoming = (event: any) => {
            if (event.is_taken_over !== undefined) {
                setIsTakenOver(Boolean(event.is_taken_over));
                if (event.is_taken_over) {
                    setIsWaitingAdmin(false);
                }
            }
            if (event.is_waiting_admin !== undefined) {
                setIsWaitingAdmin(Boolean(event.is_waiting_admin));
            }

            if (event.role !== 'user') {
                setHasSubmittedForm(true);
                // If an admin or assistant reply arrives, clear waiting state
                if (event.role === 'assistant' && event.is_taken_over) {
                    setIsWaitingAdmin(false);
                }
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
                if (data.is_waiting_admin !== undefined) {
                    setIsWaitingAdmin(Boolean(data.is_waiting_admin));
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

    const handleStartChatFromForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId.trim()) {
            setErrorMessage('Harap isi User ID Anda.');
            return;
        }

        // Jika sesi sebelumnya expired, bangkitkan UUID baru
        let activeUuid = sessionUuid;
        if (isSessionExpired || !activeUuid) {
            activeUuid = generateUuid();
            setSessionUuid(activeUuid);
            persistSession(activeUuid);
            setIsSessionExpired(false);
            setMessages([]);
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

        // Kirim topik pertanyaan dari formulir ke AI agar jawaban pertama langsung menjawab topik formulir
        const initialText = `Halo CS, User ID saya: ${formData.userId}. Saya ingin bantuan terkait: ${formData.questionTopic}.`;
        handleSendMessage(initialText, true);
    };

    const handleSendMessage = async (textToSend?: string, isFormInquiry: boolean = false) => {
        const text = (textToSend ?? input).trim();

        if (!text || isLoading) return;

        if (isSessionExpired) {
            setErrorMessage('Sesi telah kedaluwarsa. Silakan klik Mulai Chat Baru.');
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

        // Jika bukan formulir awal, render bubble chat user secara normal
        if (!isFormInquiry) {
            const tempUserMsg: ChatMessage = {
                id: `temp-${Date.now()}`,
                role: 'user',
                content: text,
                created_at: nowFormatted,
            };
            setMessages((prev) => [...prev, tempUserMsg]);
        }

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
                    is_initial_form: isFormInquiry,
                    user_id: userId,
                    topic: isFormInquiry ? questionTopic : null,
                }),
            });

            const data = await response.json();

            if (data.is_waiting_admin !== undefined) {
                setIsWaitingAdmin(Boolean(data.is_waiting_admin));
            }

            if (response.status === 422 && data.expired) {
                setIsSessionExpired(true);
                setErrorMessage(data.error || 'Sesi telah kedaluwarsa.');
                setIsLoading(false);
                return;
            }

            if (response.status === 422 && data.is_waiting_admin) {
                setErrorMessage(data.error || 'Percakapan sedang menunggu respon Admin CS.');
                setIsLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || 'Gagal mengirim pesan.');
            }

            if (data.assistant_message) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: String(data.assistant_message.id),
                        role: data.assistant_message.role,
                        content: data.assistant_message.content,
                        created_at: data.assistant_message.created_at,
                    },
                ]);
            }
        } catch (err: any) {
            console.error('Send message error:', err);
            setMessages((prev) => [
                ...prev,
                {
                    id: `err-${Date.now()}`,
                    role: 'assistant',
                    content: 'Maaf, terjadi kendala saat memproses pesan Anda. Silakan coba kembali sebentar lagi.',
                },
            ]);
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 60);
        }
    };

    // Kondisi apakah sedang di halaman Beranda awal (belum mulai chat sama sekali)
    const isFirstTimeLanding =
        !isSessionExpired && activeTab === 'beranda' && !hasSubmittedForm && messages.length === 0;

    return (
        <div
            className="flex h-screen w-full overflow-hidden transition-colors"
            style={{ backgroundColor: bgColor }}
        >
            <Head>
                <title>{headerTitle || application.name}</title>
                {faviconUrl && <link rel="icon" href={faviconUrl} />}
            </Head>

            {/* ============================================================== */}
            {/* LEFT SPLIT COLUMN: BRAND WELCOME SPLASH (PERSIS 50% LAYAR KIRI) */}
            {/* ============================================================== */}
            {!isEmbed && (
                <div
                    className="hidden md:flex md:w-1/2 h-full flex-col justify-center items-center px-8 lg:px-16 xl:px-24 relative select-none transition-colors"
                    style={{ color: textColor }}
                >
                    <div className="w-full max-w-lg space-y-6">
                        {/* Brand Logo / Icon (Tanpa background & tanpa border rounded) */}
                        <div className="flex items-center">
                            {customIconUrl ? (
                                <img
                                    src={customIconUrl}
                                    alt="Logo"
                                    className="h-16 w-auto max-w-[240px] object-contain drop-shadow-xs"
                                />
                            ) : (
                                <Sparkles className="size-10" style={{ color: headerColor }} />
                            )}
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest opacity-80 block">
                                {splashSubtitle}
                            </span>
                            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight">
                                {splashTitle}
                            </h1>
                            <p className="text-base font-medium pt-1 opacity-90">
                                {splashDescription}
                            </p>
                        </div>

                        <p className="text-xs leading-relaxed max-w-md pt-2 opacity-75">
                            {application.description ||
                                'Layanan customer support resmi dan interaktif 24 jam nonstop untuk membantu semua kebutuhan dan kendala Anda.'}
                        </p>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* RIGHT COLUMN: INTERACTIVE LIVE CHAT WIDGET (PERSIS 50% LAYAR KANAN) */}
            {/* ============================================================== */}
            <div className={`flex flex-col w-full ${isEmbed ? 'h-full' : 'md:w-1/2 h-full'} bg-white border-l border-amber-200/80 shadow-2xl overflow-hidden`}>
                {/* TOP HEADER BAR */}
                <div
                    className="px-5 py-4 shrink-0 shadow-sm border-b border-black/10 transition-colors"
                    style={{ backgroundColor: headerColor, color: headerTextColor }}
                >
                    <div className="flex items-center justify-between">
                        {/* App Title & Brand (Tanpa background & tanpa border rounded) */}
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex items-center shrink-0">
                                {customIconUrl ? (
                                    <img
                                        src={customIconUrl}
                                        alt="Logo"
                                        className="h-7 w-auto max-w-[120px] object-contain"
                                    />
                                ) : (
                                    <Sparkles className="size-5 shrink-0" />
                                )}
                            </div>
                            <span
                                className="font-extrabold text-sm tracking-wide uppercase truncate"
                                style={{ color: headerTextColor }}
                            >
                                {headerTitle}
                            </span>
                            {isTakenOver && (
                                <span
                                    className="inline-flex items-center gap-1 rounded-full bg-black/10 dark:bg-white/15 px-2 py-0.5 text-[10px] font-bold border border-black/15 shrink-0"
                                    style={{ color: headerTextColor }}
                                >
                                    <UserCheck className="size-3" />
                                    Admin CS
                                </span>
                            )}
                        </div>

                        {/* KANAN ATAS: DI TAB CHAT UBAH JADI TOMBOL CLOSE, DI TAB BERANDA TETAP 3 PP ORANG */}
                        {activeTab === 'pesan' ? (
                            <button
                                type="button"
                                onClick={() => setShowCloseConfirm(true)}
                                className="flex size-8 items-center justify-center rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/15 dark:hover:bg-white/25 transition-all cursor-pointer shrink-0 active:scale-95"
                                style={{ color: headerTextColor }}
                                title="Tutup Percakapan"
                            >
                                <X className="size-4.5 stroke-2.5" />
                            </button>
                        ) : (
                            /* Customer Service Agent Avatars (3 Foto Profil Terpilih dari Galeri - TAMPIL DI BERANDA) */
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center -space-x-2.5 overflow-visible pl-1 py-0.5">
                                    {activeAvatars.slice(0, 3).map((url, idx) => (
                                        <div
                                            key={idx}
                                            className="relative size-8 rounded-full ring-2 ring-white/95 shadow-xs overflow-hidden shrink-0 bg-neutral-200 transition-transform hover:scale-110 hover:z-20 cursor-default"
                                            style={{ zIndex: 10 - idx }}
                                        >
                                            <img
                                                src={url}
                                                alt={`CS Agent ${idx + 1}`}
                                                className="size-full object-cover"
                                                onError={(e) => {
                                                    (e.target as any).src = '/images/avatars/cs-1.png';
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {/* CS Online Status Indicator Dot */}
                                <span className="relative flex size-2.5 shrink-0" title="CS Online 24/7">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500 ring-1.5 ring-white" />
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Subtitle in Header (HANYA TAMPIL DI TAB BERANDA / HILANG DI TAB CHAT) */}
                    {activeTab !== 'pesan' && (
                        <div className="mt-3">
                            <p
                                className="text-[11px] font-medium line-clamp-1 opacity-80"
                                style={{ color: headerTextColor }}
                            >
                                {splashTitle}
                            </p>
                            <h2
                                className="text-sm font-bold line-clamp-1"
                                style={{ color: headerTextColor }}
                            >
                                {splashDescription}
                            </h2>
                        </div>
                    )}
                </div>

                {/* Expired Session Alert with Button */}
                {isSessionExpired && (
                    <div className="border-b border-amber-500/20 bg-amber-500/15 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2 text-xs text-amber-950 font-medium">
                            <Clock className="size-4 text-amber-700 shrink-0" />
                            <span>Sesi kedaluwarsa setelah {sessionTimeoutMinutes} menit tanpa aktivitas.</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleStartNewChat}
                            className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                            style={{ backgroundColor: headerColor, color: headerTextColor }}
                        >
                            <RotateCcw className="size-3" />
                            <span>Mulai Chat Baru</span>
                        </button>
                    </div>
                )}

                {/* Error Banner */}
                {errorMessage && !isSessionExpired && (
                    <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-1.5 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertCircle className="size-3.5 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* BODY VIEW SWITCHER: BERANDA / PRE-CHAT FORM / ACTIVE CHAT */}
                {/* ============================================================== */}
                <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 space-y-4">
                    {/* TAB 1: BERANDA (HOME VIEW - Persis Screenshot 1) */}
                    {activeTab === 'beranda' && (
                        <div className="space-y-4">
                            {/* Banner Beranda: Foto Penuh atau Kartu Teks Promosi */}
                            {isPhotoBanner ? (
                                <div className="relative overflow-hidden rounded-2xl shadow-sm w-full">
                                    <img
                                        src={bannerImageUrl}
                                        alt={bannerTitle || 'Banner'}
                                        className="w-full h-auto rounded-2xl block"
                                    />
                                </div>
                            ) : (
                                <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-neutral-950 via-neutral-900 to-amber-950 p-6 text-white shadow-md border border-amber-500/40 text-center">
                                    <div className="absolute -right-8 -top-8 size-28 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
                                    <div className="absolute -left-8 -bottom-8 size-28 rounded-full bg-yellow-500/10 blur-xl pointer-events-none" />

                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-300 border border-amber-500/30 mb-2">
                                        <Sparkles className="size-3" /> {bannerBadge}
                                    </div>

                                    <h3 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-sm uppercase">
                                        {bannerTitle}
                                    </h3>

                                    <p className="text-xs text-neutral-300 mt-2 line-clamp-3 leading-relaxed">
                                        {bannerDesc}
                                    </p>
                                </div>
                            )}

                            {/* Tombol Cepat Dinamis (Bisa 1, 2, atau berapapun tombol sesuai CMS) */}
                            {quickButtons.length > 0 && (
                                <div
                                    className={`grid gap-2.5 ${quickButtons.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                                        }`}
                                >
                                    {quickButtons.map((item, idx) => {
                                        const isHovered = hoveredBtn === idx;
                                        const hoverStyle = isHovered
                                            ? {
                                                borderColor: headerColor,
                                                backgroundColor: `${headerColor}1f`,
                                            }
                                            : {};

                                        if (item.type === 'link') {
                                            return (
                                                <a
                                                    key={idx}
                                                    href={item.value || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onMouseEnter={() => setHoveredBtn(idx)}
                                                    onMouseLeave={() => setHoveredBtn(null)}
                                                    style={hoverStyle}
                                                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5 text-left shadow-2xs transition-all cursor-pointer group"
                                                >
                                                    <span className="text-xs font-semibold text-neutral-800 truncate">
                                                        {item.title || `Tombol ${idx + 1}`}
                                                    </span>
                                                    <ExternalLink
                                                        className="size-3.5 text-neutral-400 transition-colors shrink-0"
                                                        style={isHovered ? { color: headerColor } : {}}
                                                    />
                                                </a>
                                            );
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onMouseEnter={() => setHoveredBtn(idx)}
                                                onMouseLeave={() => setHoveredBtn(null)}
                                                style={hoverStyle}
                                                onClick={() => {
                                                    if (isSessionExpired) {
                                                        handleStartNewChat();
                                                    } else {
                                                        setActiveTab('pesan');
                                                        if (hasSubmittedForm) {
                                                            handleSendMessage(item.value);
                                                        }
                                                    }
                                                }}
                                                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5 text-left shadow-2xs transition-all cursor-pointer group"
                                            >
                                                <span className="text-xs font-semibold text-neutral-800 truncate">
                                                    {item.title || `Tombol ${idx + 1}`}
                                                </span>
                                                <ArrowUpRight
                                                    className="size-3.5 text-neutral-400 transition-colors shrink-0"
                                                    style={isHovered ? { color: headerColor } : {}}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: PESAN (MESSAGES) */}
                    {activeTab === 'pesan' && (
                        <>
                            {/* IF HAS NOT SUBMITTED PRE-CHAT FORM: SHOW FORM VIEW */}
                            {!hasSubmittedForm && messages.length === 0 ? (
                                <div className="space-y-4">
                                    {/* Welcome & Promotional Card (Tanpa Header Judul Ganda) */}
                                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs text-xs leading-relaxed text-neutral-800">
                                        <ChatMarkdown content={defaultWelcomeMessage} />
                                    </div>

                                    {/* Pre-Chat Formulir Card */}
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
                                                className="h-10 text-xs rounded-xl bg-slate-50 border-neutral-200 text-neutral-900 font-medium placeholder:text-neutral-400 focus:bg-white"
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
                                                required
                                                className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 border border-neutral-200 text-neutral-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-400 focus:bg-white cursor-pointer"
                                            >
                                                <option value="">Pilih...</option>
                                                {chatTemplates
                                                    .filter((t) => t.show_in_select !== false)
                                                    .map((t) => (
                                                        <option key={t.id || t.topic} value={t.topic}>
                                                            {t.topic}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full mt-2 flex items-center justify-center rounded-xl font-bold py-2.5 text-xs shadow-xs transition-transform active:scale-[0.99] cursor-pointer"
                                            style={{ backgroundColor: headerColor, color: headerTextColor }}
                                        >
                                            Mulai chat
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                /* IF ACTIVE CHAT: SHOW CHAT STREAM */
                                <div className="space-y-4">
                                    {/* Welcome Announcement Card (Tanpa Header Judul Ganda) */}
                                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs text-xs leading-relaxed text-neutral-800">
                                        <ChatMarkdown content={defaultWelcomeMessage} />
                                    </div>

                                    {/* Formulir Card Ringkasan */}
                                    {userId && (
                                        <div className="rounded-2xl border border-amber-300 bg-white shadow-2xs overflow-hidden">
                                            <div
                                                className="px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-bold"
                                                style={{ backgroundColor: headerColor, color: headerTextColor }}
                                            >
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

                                    {/* Render Messages */}
                                    {messages
                                        .filter(
                                            (msg) =>
                                                !(
                                                    msg.role === 'user' &&
                                                    (msg.content.startsWith('Halo CS, User ID saya:') ||
                                                        msg.content.startsWith('Formulir Bantuan:'))
                                                )
                                        )
                                        .map((msg) => {
                                            if (msg.role === 'system') {
                                                const isTakeover = msg.content.includes('diambil alih');
                                                return (
                                                    <div key={msg.id} className="flex justify-center my-3">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border shadow-2xs text-center max-w-sm ${
                                                                isTakeover
                                                                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                                                                    : 'bg-slate-100 border-slate-200 text-slate-700'
                                                            }`}
                                                        >
                                                            {isTakeover ? (
                                                                <UserCheck className="size-3.5 text-amber-700 shrink-0" />
                                                            ) : (
                                                                <Bot className="size-3.5 text-slate-600 shrink-0" />
                                                            )}
                                                            <span>{msg.content}</span>
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            const isUser = msg.role === 'user';
                                            const formMatch =
                                                !isUser &&
                                                msg.content.match(/\[FORM:(deposit_status|withdraw_status)\]/i);
                                            const formType = formMatch ? formMatch[1].toLowerCase() : null;
                                            const cleanContent = formMatch
                                                ? msg.content
                                                    .replace(/\[FORM:(deposit_status|withdraw_status)\]\s*/gi, '')
                                                    .trim()
                                                : msg.content;

                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'
                                                        }`}
                                                >
                                                    {/* Avatar Icon */}
                                                    {isUser ? (
                                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs bg-neutral-900 text-white">
                                                            <UserIcon className="size-3.5" />
                                                        </div>
                                                    ) : (
                                                        <div className="relative size-8 shrink-0 rounded-full overflow-hidden border border-neutral-200 shadow-2xs bg-amber-100 flex items-center justify-center">
                                                            <img
                                                                src={csAvatarUrl}
                                                                alt={csAgentName}
                                                                className="size-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as any).src = '/images/avatars/cs-1.png';
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Chat Bubble & In-Chat Form */}
                                                    <div
                                                        className={`flex flex-col space-y-1.5 max-w-[85%] ${isUser ? 'items-end' : 'items-start'
                                                            }`}
                                                    >
                                                        <span className="text-[11px] font-bold text-neutral-600 px-1">
                                                            {isUser
                                                                ? 'Anda'
                                                                : isTakenOver
                                                                    ? 'Admin CS'
                                                                    : csAgentName}
                                                        </span>

                                                        {formType && (
                                                            <InChatForm
                                                                type={formType}
                                                                headerColor={headerColor}
                                                                headerTextColor={headerTextColor}
                                                                defaultUsername={userId}
                                                                onSubmit={(summaryText) => handleSendMessage(summaryText)}
                                                            />
                                                        )}

                                                        {(!formType || cleanContent) && (
                                                            <div
                                                                className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed ${isUser
                                                                    ? 'rounded-tr-xs bg-neutral-900 text-white'
                                                                    : 'rounded-tl-xs bg-white border border-neutral-200/90 text-neutral-900'
                                                                    }`}
                                                            >
                                                                {isUser ? (
                                                                    <div className="text-white [&_*]:text-white">
                                                                        <ChatMarkdown content={msg.content} />
                                                                    </div>
                                                                ) : (
                                                                    <ChatMarkdown content={cleanContent} />
                                                                )}
                                                            </div>
                                                        )}

                                                        {msg.created_at && (
                                                            <span className="text-[9px] text-neutral-400 px-1">
                                                                {msg.created_at}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                    {/* Loading / Typing indicator */}
                                    {isLoading && (
                                        <div className="flex items-start gap-2.5">
                                            <div
                                                className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs"
                                                style={{ backgroundColor: headerColor, color: headerTextColor }}
                                            >
                                                <Bot className="size-4" />
                                            </div>
                                            <div className="rounded-2xl rounded-tl-xs bg-white border border-neutral-200/90 px-4 py-3 shadow-2xs">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="size-1.5 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.3s]" />
                                                    <span className="size-1.5 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.15s]" />
                                                    <span className="size-1.5 animate-bounce rounded-full bg-amber-500" />
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
                {/* BOTTOM CHAT INPUT BAR (TANPA TOMBOL +) */}
                {/* ============================================================== */}
                {!isSessionExpired && activeTab === 'pesan' && (hasSubmittedForm || messages.length > 0) && (
                    isWaitingAdmin ? (
                        <div className="border-t border-neutral-200 bg-amber-50/60 p-3 shrink-0">
                            <div className="flex items-center gap-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3 text-amber-950 shadow-2xs">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700">
                                    <Clock className="size-4 animate-spin-slow" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-amber-950">Menunggu Respon Admin CS</p>
                                    <p className="text-[11px] text-amber-800 leading-snug">
                                        Percakapan Anda telah dialihkan ke Customer Service. Mohon menunggu sebentar ya Bosku 🙏
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="border-t border-neutral-200 bg-white p-3 shrink-0">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="flex items-center gap-2"
                            >
                                <input
                                    ref={textareaRef}
                                    value={input}
                                    disabled={!application.is_active}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder={
                                        !application.is_active
                                            ? 'Chatbot sedang offline...'
                                            : 'Tulis pesan...'
                                    }
                                    className="flex-1 h-9 px-3.5 text-xs rounded-full bg-slate-100 border-none text-neutral-900 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-neutral-400"
                                />

                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading || !application.is_active}
                                    className="flex size-9 items-center justify-center rounded-full font-bold disabled:opacity-40 transition-colors cursor-pointer shrink-0 shadow-2xs"
                                    style={{ backgroundColor: headerColor, color: headerTextColor }}
                                >
                                    <Send className="size-3.5" />
                                </button>
                            </form>
                        </div>
                    )
                )}

                {/* ============================================================== */}
                {/* BOTTOM FOOTER SECTION */}
                {/* ============================================================== */}
                {isSessionExpired ? (
                    /* JIKA SESI KEDALUWARSA: TAMPILKAN TOMBOL MULAI CHAT BARU DI PALING BAWAH */
                    <div className="border-t border-neutral-200 bg-white p-3 sm:p-4 shrink-0">
                        <button
                            type="button"
                            onClick={handleStartNewChat}
                            className="w-full flex items-center justify-center gap-2 rounded-xl font-bold py-3.5 text-xs sm:text-sm shadow-sm transition-transform active:scale-[0.99] cursor-pointer"
                            style={{ backgroundColor: headerColor, color: headerTextColor }}
                        >
                            <RotateCcw className="size-4" />
                            <span>Mulai Chat Baru</span>
                        </button>
                    </div>
                ) : isFirstTimeLanding ? (
                    /* JIKA PERTAMA KALI (BERANDA AWAL): TOMBOL KIRIM PESAN DI PALING BAWAH MENGGANTIKAN 3 TAB (Persis Screenshot 1) */
                    <div className="border-t border-neutral-200 bg-white p-3 sm:p-4 shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (isSessionExpired) {
                                    handleStartNewChat();
                                } else {
                                    setActiveTab('pesan');
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-xl font-bold py-3.5 text-xs sm:text-sm shadow-sm transition-transform active:scale-[0.99] cursor-pointer"
                            style={{ backgroundColor: headerColor, color: headerTextColor }}
                        >
                            <span>Kirim Pesan</span>
                            <ArrowRight className="size-4" />
                        </button>
                    </div>
                ) : (
                    /* JIKA SUDAH MULAI CHAT: MUNCULKAN 3 TAB (Beranda, Pesan, Bantuan) */
                    <div className="border-t border-neutral-200 bg-white px-6 py-2.5 shrink-0 flex flex-col items-center gap-1.5 select-none">
                        <div className="w-full flex items-center justify-around">
                            <button
                                type="button"
                                onClick={() => setActiveTab('beranda')}
                                className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${activeTab === 'beranda'
                                    ? 'text-amber-600 font-bold'
                                    : 'text-neutral-400 hover:text-neutral-600'
                                    }`}
                            >
                                <HomeIcon className="size-4.5" />
                                <span>Beranda</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('pesan')}
                                className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer relative ${activeTab === 'pesan'
                                    ? 'text-amber-600 font-bold'
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
                                className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${activeTab === 'bantuan'
                                    ? 'text-amber-600 font-bold'
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
                )}
            </div>

            {/* MODAL KONFIRMASI TUTUP PERCAKAPAN */}
            {showCloseConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4 border border-neutral-100">
                        <div className="flex items-center gap-3">
                            <div
                                className="flex size-10 items-center justify-center rounded-full shrink-0 transition-colors"
                                style={{ backgroundColor: `${headerColor}25`, color: headerColor }}
                            >
                                <RotateCcw className="size-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-neutral-900">Tutup Percakapan?</h3>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                    Sesi chat saat ini akan diakhiri. Anda harus memulai chat baru jika ingin bertanya lagi.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                            <button
                                type="button"
                                onClick={() => setShowCloseConfirm(false)}
                                className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmClose}
                                className="px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs hover:opacity-90 active:scale-95"
                                style={{ backgroundColor: headerColor, color: headerTextColor }}
                            >
                                Ya, Tutup Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
