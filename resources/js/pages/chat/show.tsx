import { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    Bot,
    Clock,
    Plus,
    RotateCcw,
    Send,
    Sparkles,
    User as UserIcon,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
        channel.listen('MessageSent', (event: any) => {
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
        });

        return () => {
            channel.stopListening('MessageSent');
        };
    }, [sessionUuid]);

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

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = input.trim();

        if (!trimmed || isLoading) return;

        if (isSessionExpired) {
            setErrorMessage('Sesi telah kedaluwarsa. Silakan tekan tombol Chat Baru untuk memulai percakapan baru.');
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
            content: trimmed,
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
                    message: trimmed,
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
                    content: 'Maaf, terjadi kendala saat menghubungi chatbot. Silakan coba kembali atau mulai Chat Baru.',
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
            <Head title={`Chat - ${application.name}`} />

            <div className="flex h-full flex-col">
                {/* Expired Session Notice */}
                {isSessionExpired && (
                    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 sm:px-6">
                        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
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
                                Chat Baru
                            </Button>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {errorMessage && !isSessionExpired && (
                    <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2 sm:px-6">
                        <div className="mx-auto flex max-w-3xl items-center gap-2 text-xs text-destructive">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {/* Scrollable Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                    <div className="mx-auto max-w-3xl space-y-6">
                        {messages.length === 0 ? (
                            <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                                    <Bot className="size-7" />
                                </div>
                                <h2 className="mt-4 text-xl font-semibold tracking-tight">
                                    {application.name}
                                </h2>
                                <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                                    {application.description ||
                                        'Selamat datang! Tanyakan apa saja dan chatbot AI siap membantu Anda.'}
                                </p>

                                <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg">
                                    {[
                                        'Halo! Apa saja yang bisa Anda bantu?',
                                        'Bisa jelaskan informasi tentang layanan ini?',
                                        'Bagaimana cara menghubungi tim support?',
                                    ].map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            disabled={isSessionExpired || !application.is_active}
                                            onClick={() => {
                                                setInput(prompt);
                                                textareaRef.current?.focus();
                                            }}
                                            className="rounded-xl border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground cursor-pointer shadow-2xs text-left"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex items-start gap-3 ${
                                        message.role === 'user'
                                            ? 'flex-row-reverse'
                                            : 'flex-row'
                                    }`}
                                >
                                    {/* Avatar */}
                                    <div
                                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-medium shadow-2xs ${
                                            message.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'border border-border bg-card text-primary'
                                        }`}
                                    >
                                        {message.role === 'user' ? (
                                            <UserIcon className="size-4" />
                                        ) : (
                                            <Bot className="size-4.5" />
                                        )}
                                    </div>

                                    {/* Message Bubble */}
                                    <div
                                        className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
                                            message.role === 'user'
                                                ? 'rounded-br-xs bg-primary text-primary-foreground'
                                                : 'rounded-bl-xs border border-border/70 bg-card text-card-foreground shadow-xs'
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap select-text">
                                            {message.content}
                                        </div>
                                        {message.created_at && (
                                            <div
                                                className={`mt-1.5 text-[10px] text-right ${
                                                    message.role === 'user'
                                                        ? 'text-primary-foreground/70'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                {message.created_at}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Thinking / Processing Indicator */}
                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-2xs">
                                    <Bot className="size-4.5" />
                                </div>
                                <div className="rounded-2xl rounded-bl-xs border border-border/70 bg-card px-4 py-3 shadow-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
                                        <span className="size-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
                                        <span className="size-2 rounded-full bg-primary/70 animate-bounce" />
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
                        onSubmit={handleSendMessage}
                        className="mx-auto flex max-w-3xl items-end gap-2"
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
                                        ? 'Sesi telah kedaluwarsa. Klik Chat Baru di atas untuk mulai lagi...'
                                        : !application.is_active
                                          ? 'Chatbot sedang dinonaktifkan...'
                                          : 'Ketik pesan Anda... (Shift + Enter untuk baris baru)'
                                }
                                rows={1}
                                className="min-h-[46px] max-h-32 resize-none rounded-xl py-3 pr-4 text-sm focus-visible:ring-1"
                            />
                        </div>

                        {isSessionExpired ? (
                            <Button
                                type="button"
                                onClick={startNewChat}
                                className="size-11.5 shrink-0 rounded-xl cursor-pointer shadow-xs gap-1"
                            >
                                <RotateCcw className="size-4" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isLoading || !application.is_active}
                                className="size-11.5 shrink-0 rounded-xl cursor-pointer shadow-xs"
                            >
                                <Send className="size-4" />
                            </Button>
                        )}
                    </form>

                    <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                        <Sparkles className="size-3 text-primary/70" />
                        <span>AI dapat melakukan kesalahan. Pastikan memeriksa informasi penting.</span>
                    </div>
                </div>
            </div>
        </PublicChatLayout>
    );
}
