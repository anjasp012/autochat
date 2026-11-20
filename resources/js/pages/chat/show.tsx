import { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    Bot,
    Clock,
    CreditCard,
    Gift,
    Headphones,
    KeyRound,
    RotateCcw,
    Send,
    Sparkles,
    User as UserIcon,
    UserPlus,
} from 'lucide-react';
import ChatMarkdown from '@/components/chat-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { echo } from '@/echo';
import PublicChatLayout from '@/layouts/public-chat-layout';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
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

    const [sessionUuid, setSessionUuid] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
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
    }, [messages, isLoading]);

    // Quick Action Suggestions (Tombol Quick)
    const quickActions = [
        {
            icon: CreditCard,
            label: 'Info Deposit & Withdraw',
            query: 'Bagaimana cara melakukan deposit dan withdraw? Apa saja pilihan bank dan e-wallet yang tersedia?',
        },
        {
            icon: Gift,
            label: 'Promo & Bonus Terbaru',
            query: 'Apa saja promo, bonus deposit, atau reward terbaru yang sedang aktif saat ini?',
        },
        {
            icon: UserPlus,
            label: 'Cara Daftar Akun',
            query: 'Bagaimana langkah-langkah mudah untuk mendaftar akun baru?',
        },
        {
            icon: KeyRound,
            label: 'Kendala Akun & Password',
            query: 'Saya mengalami kendala saat login atau lupa password akun saya. Bagaimana cara reset atau solusinya?',
        },
        {
            icon: Headphones,
            label: 'Hubungi Customer Care',
            query: 'Bisa sambungkan saya dengan layanan Customer Service manusia untuk bantuan lebih lanjut?',
        },
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

    // Initialize or restore session
    useEffect(() => {
        try {
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

                // Session is still active, restore UUID and load conversation
                setSessionUuid(parsed.uuid);
                fetchSessionMessages(parsed.uuid);
                return;
            }
        } catch (e) {
            console.error('Error reading localStorage session', e);
        }

        // New visitor: create initial UUID
        startNewChat();
    }, [application.app_id]);

    // Realtime WebSocket listener via Laravel Reverb
    useEffect(() => {
        if (!sessionUuid) return;

        const channel = echo.channel(`conversation.${sessionUuid}`);
        const handleIncoming = (event: any) => {
            if (event.role !== 'user') {
                setMessages((prev) => {
                    const alreadyExists = prev.some((m) => m.id === String(event.id));
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

        // Fallback polling every 3 seconds so messages arrive even if WebSocket disconnects
        const pollInterval = setInterval(() => {
            if (!isSessionExpired) {
                fetchSessionMessages(sessionUuid);
            }
        }, 3000);

        return () => {
            channel.stopListening('.MessageSent');
            channel.stopListening('MessageSent');
            clearInterval(pollInterval);
        };
    }, [sessionUuid, isSessionExpired]);

    // Fetch existing messages from backend for current active session
    const fetchSessionMessages = async (uuid: string) => {
        try {
            const res = await fetch(`/chat/${application.app_id}/session/${uuid}`);
            if (res.ok) {
                const data = await res.json();
                if (data.expired) {
                    setIsSessionExpired(true);
                } else if (data.messages && data.messages.length > 0) {
                    setMessages(data.messages);
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
        persistSession(newUuid);
        textareaRef.current?.focus();
    };

    const handleSendMessage = async (textToSend?: string) => {
        const text = (textToSend ?? input).trim();

        if (!text || isLoading) return;

        if (isSessionExpired) {
            setErrorMessage('Sesi telah kedaluwarsa. Silakan tekan tombol Mulai Percakapan Baru.');
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
                    'Accept': 'application/json',
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

            // Update user message with confirmed server id and append assistant response
            if (data.assistant_message) {
                setMessages((prev) => [
                    ...prev.filter((m) => m.id !== tempUserMsg.id),
                    data.user_message || tempUserMsg,
                    data.assistant_message,
                ]);
            }

            // Refresh activity timestamp
            persistSession(sessionUuid);
        } catch (err: unknown) {
            const errorText = err instanceof Error ? err.message : 'Terjadi kendala jaringan.';
            setErrorMessage(errorText);

            // Add friendly fallback bubble
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
        <PublicChatLayout
            appName={application.name}
            appDescription={application.description ?? undefined}
            isActive={application.is_active}
            onNewChat={startNewChat}
            isNewChatLoading={isLoading}
        >
            <Head title={`Live Chat - ${application.name}`} />

            <div className="flex h-full flex-col bg-slate-50/50 dark:bg-background">
                {/* Expired Session Notice */}
                {isSessionExpired && (
                    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 sm:px-6">
                        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                            <div className="flex items-center gap-2">
                                <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>
                                    Sesi percakapan Anda telah kedaluwarsa setelah {sessionTimeoutMinutes} menit tanpa aktivitas.
                                </span>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={startNewChat}
                                className="h-7 cursor-pointer gap-1.5 border-amber-600/30 text-xs font-semibold hover:bg-amber-600/10"
                            >
                                <RotateCcw className="size-3" />
                                Mulai Chat Baru
                            </Button>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {errorMessage && !isSessionExpired && (
                    <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2 sm:px-6">
                        <div className="mx-auto flex max-w-2xl items-center gap-2 text-xs text-destructive">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {/* Scrollable Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                    <div className="mx-auto max-w-2xl space-y-6">
                        {/* BANNER HEADER & OPENING CARD (Tampilan Awal Persis Wig.chat) */}
                        <div className="rounded-3xl border border-border/80 bg-linear-to-b from-card via-card to-card/90 p-5 sm:p-6 shadow-sm space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
                                        <Bot className="size-6" />
                                        <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                                                {application.name}
                                            </h2>
                                            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                Online
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {application.description || 'Layanan bantuan cerdas dan interaktif 24/7'}
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={startNewChat}
                                    className="h-8 gap-1.5 text-xs font-semibold rounded-xl cursor-pointer shrink-0 shadow-2xs hover:bg-muted"
                                    title="Mulai Sesi Chat Baru"
                                >
                                    <RotateCcw className="size-3.5" />
                                    <span className="hidden sm:inline">Chat Baru</span>
                                </Button>
                            </div>

                            {/* Opening Message Intro */}
                            <div className="rounded-2xl bg-muted/40 p-4 border border-border/60 text-xs sm:text-sm text-foreground leading-relaxed">
                                <p className="font-medium text-foreground">
                                    Halo! Selamat datang di layanan kami 👋
                                </p>
                                <p className="text-muted-foreground mt-1">
                                    Ada yang bisa kami bantu hari ini? Anda dapat mengetik pertanyaan apa saja di bawah, atau klik salah satu topik cepat berikut:
                                </p>

                                {/* TOMBOL QUICK (Quick Reply Chips) */}
                                <div className="mt-3.5 flex flex-wrap gap-2">
                                    {quickActions.map((qa, idx) => {
                                        const Icon = qa.icon;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                disabled={isLoading || isSessionExpired || !application.is_active}
                                                onClick={() => handleSendMessage(qa.query)}
                                                className="group inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background hover:bg-emerald-50 hover:border-emerald-500/40 hover:text-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 px-3 py-2 text-xs font-medium text-foreground shadow-2xs transition-all cursor-pointer"
                                            >
                                                <Icon className="size-3.5 text-primary group-hover:text-emerald-600 transition-colors shrink-0" />
                                                <span>{qa.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* List of Messages */}
                        {messages.map((message) => {
                            const isUser = message.role === 'user';

                            return (
                                <div
                                    key={message.id}
                                    className={`flex items-start gap-3 ${
                                        isUser ? 'flex-row-reverse' : 'flex-row'
                                    }`}
                                >
                                    {/* Avatar */}
                                    <div
                                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-medium shadow-2xs ${
                                            isUser
                                                ? 'bg-emerald-600 text-white'
                                                : 'border border-border bg-card text-primary'
                                        }`}
                                    >
                                        {isUser ? (
                                            <UserIcon className="size-4" />
                                        ) : (
                                            <Bot className="size-4.5" />
                                        )}
                                    </div>

                                    {/* Message Bubble with ChatMarkdown for rich formatting & tables */}
                                    <div
                                        className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed sm:max-w-[78%] ${
                                            isUser
                                                ? 'rounded-br-xs bg-emerald-600 text-white shadow-xs'
                                                : 'rounded-bl-xs border border-border/80 bg-card text-card-foreground shadow-xs'
                                        }`}
                                    >
                                        {isUser ? (
                                            <div className="whitespace-pre-wrap select-text leading-relaxed">
                                                {message.content}
                                            </div>
                                        ) : (
                                            <ChatMarkdown content={message.content} />
                                        )}

                                        {message.created_at && (
                                            <div
                                                className={`mt-1.5 text-[10px] text-right font-mono ${
                                                    isUser
                                                        ? 'text-white/75'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                {message.created_at}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Thinking / Processing Indicator */}
                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-2xs">
                                    <Bot className="size-4.5" />
                                </div>
                                <div className="rounded-2xl rounded-bl-xs border border-border/80 bg-card px-4 py-3 shadow-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                                        <span className="size-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                                        <span className="size-2 rounded-full bg-emerald-500 animate-bounce" />
                                        <span className="text-xs text-muted-foreground ml-1.5">
                                            Sedang mengetik...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="border-t border-border/80 bg-background/95 p-4 backdrop-blur-md sm:px-6">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSendMessage();
                        }}
                        className="mx-auto flex max-w-2xl items-end gap-2"
                    >
                        <div className="relative flex-1">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                disabled={isSessionExpired || isLoading || !application.is_active}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={
                                    isSessionExpired
                                        ? 'Sesi telah kedaluwarsa. Mulai chat baru...'
                                        : !application.is_active
                                          ? 'Chatbot sedang offline...'
                                          : 'Ketik pesan Anda di sini... (Tekan Enter untuk kirim)'
                                }
                                rows={1}
                                className="min-h-[46px] max-h-32 resize-none rounded-2xl py-3 pr-4 text-xs sm:text-sm focus-visible:ring-1 bg-card shadow-2xs"
                            />
                        </div>

                        {isSessionExpired ? (
                            <Button
                                type="button"
                                onClick={startNewChat}
                                className="size-11.5 shrink-0 rounded-2xl cursor-pointer shadow-xs gap-1"
                            >
                                <RotateCcw className="size-4" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isLoading || !application.is_active}
                                className="size-11.5 shrink-0 rounded-2xl cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Send className="size-4" />
                            </Button>
                        )}
                    </form>

                    <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                        <Sparkles className="size-3 text-emerald-500" />
                        <span>Didukung oleh AutoChat AI • Respon Seketika 24/7</span>
                    </div>
                </div>
            </div>
        </PublicChatLayout>
    );
}
