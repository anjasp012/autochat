import { useEffect, useRef, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    Bot,
    Clock,
    HandMetal,
    Inbox,
    MessageSquare,
    RotateCcw,
    Search,
    Send,
    Trash2,
    User,
    UserCheck,
    UserX,
} from 'lucide-react';
import ChatMarkdown from '@/components/chat-markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { echo } from '@/echo';

interface Message {
    id: number;
    conversation_id?: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens_used?: number;
    created_at?: string;
}

interface ConversationItem {
    id: number;
    uuid: string;
    application_id: number;
    user_identifier?: string | null;
    ip_address: string | null;
    last_activity_at: string;
    is_taken_over: boolean;
    is_waiting_admin?: boolean;
    is_archived: boolean;
    taken_over_at: string | null;
    messages_count: number;
    messages?: {
        id: number;
        content: string;
        role: string;
        created_at: string;
    }[];
    application?: {
        id: number;
        app_id: string;
        name: string;
    };
    taken_over_by?: {
        id: number;
        name: string;
    } | null;
}

interface ConversationDetail extends ConversationItem {
    messages: Message[];
}

interface Counts {
    all: number;
    mine: number;
    unassigned: number;
    bot: number;
    archived: number;
}

interface Props {
    conversations?: ConversationItem[] | { data: ConversationItem[] };
    activeConversation?: ConversationDetail | null;
    counts?: Counts;
    filters?: {
        search?: string | null;
        status?: string | null;
    };
    selectedApp?: {
        id: number;
        app_id: string;
        name: string;
        is_active: boolean;
    } | null;
}

export default function ConversationsIndex({
    conversations = [],
    activeConversation,
    counts = { all: 0, mine: 0, unassigned: 0, bot: 0, archived: 0 },
    filters = {},
    selectedApp,
}: Props) {
    const rawConversations = conversations as any;
    const convList: ConversationItem[] = Array.isArray(rawConversations)
        ? rawConversations
        : Array.isArray(rawConversations?.data)
          ? rawConversations.data
          : [];

    const [search, setSearch] = useState(filters?.search || '');
    const [currentStatus, setCurrentStatus] = useState(filters?.status || 'all');
    const [convToDelete, setConvToDelete] = useState<ConversationItem | null>(null);

    const [localMessages, setLocalMessages] = useState<Message[]>(
        Array.isArray(activeConversation?.messages) ? activeConversation.messages : []
    );

    useEffect(() => {
        setLocalMessages(Array.isArray(activeConversation?.messages) ? activeConversation.messages : []);
    }, [activeConversation?.id, activeConversation?.uuid, activeConversation?.messages]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data, setData, post, processing, reset } = useForm({
        message: '',
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [localMessages.length, activeConversation?.uuid]);

    // WebSocket realtime listener via Laravel Reverb Echo (Application Level & Global)
    useEffect(() => {
        const handleUpdate = () => {
            router.reload({
                only: ['conversations', 'counts'],
                preserveScroll: true,
                preserveState: true,
            });
        };

        const channels: any[] = [];

        if (selectedApp?.app_id) {
            const appChannel = echo.channel(`conversations.${selectedApp.app_id}`);
            appChannel.listen('.MessageSent', handleUpdate);
            appChannel.listen('MessageSent', handleUpdate);
            channels.push(appChannel);
        }

        const globalChannel = echo.channel('conversations');
        globalChannel.listen('.MessageSent', handleUpdate);
        globalChannel.listen('MessageSent', handleUpdate);
        channels.push(globalChannel);

        return () => {
            channels.forEach((ch) => {
                ch.stopListening('.MessageSent');
                ch.stopListening('MessageSent');
            });
        };
    }, [selectedApp?.app_id]);

    // WebSocket realtime listener for Active Conversation (Instant Live Append)
    useEffect(() => {
        if (!activeConversation?.uuid) return;

        const roomChannel = echo.channel(`conversation.${activeConversation.uuid}`);
        const handleRoomUpdate = (event: any) => {
            // Instant local state append
            setLocalMessages((prev) => {
                const idStr = String(event.id);
                if (prev.some((m) => String(m.id) === idStr)) return prev;
                return [
                    ...prev,
                    {
                        id: Number(event.id) || Date.now(),
                        conversation_id: activeConversation.id,
                        role: event.role,
                        content: event.content,
                        tokens_used: 0,
                        created_at: event.created_at || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                ];
            });

            // Reload sidebar list to update last message preview and counts
            router.reload({
                only: ['conversations', 'counts'],
                preserveScroll: true,
                preserveState: true,
            });
        };

        roomChannel.listen('.MessageSent', handleRoomUpdate);
        roomChannel.listen('MessageSent', handleRoomUpdate);

        return () => {
            roomChannel.stopListening('.MessageSent');
            roomChannel.stopListening('MessageSent');
        };
    }, [activeConversation?.uuid, activeConversation?.id]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/conversations',
            {
                search: search || undefined,
                status: currentStatus !== 'all' ? currentStatus : undefined,
            },
            { preserveState: true }
        );
    };

    const handleSelectCategory = (cat: string) => {
        setCurrentStatus(cat);
        router.get(
            '/conversations',
            {
                search: search || undefined,
                status: cat !== 'all' ? cat : undefined,
            },
            { preserveState: true }
        );
    };

    const handleSelectConversation = (conv: ConversationItem) => {
        if (activeConversation?.uuid === conv.uuid) return;

        router.get(
            `/conversations/${conv.uuid}`,
            {
                status: currentStatus !== 'all' ? currentStatus : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['conversations', 'activeConversation'],
            }
        );
    };

    const handleToggleTakeover = (conv: ConversationItem) => {
        if (conv.is_taken_over) {
            router.post(`/conversations/${conv.uuid}/release-takeover`, {}, { preserveScroll: true });
        } else {
            router.post(`/conversations/${conv.uuid}/takeover`, {}, { preserveScroll: true });
        }
    };

    const handleToggleArchive = (conv: ConversationItem) => {
        if (conv.is_archived) {
            router.post(`/conversations/${conv.uuid}/unarchive`, {}, { preserveScroll: true });
        } else {
            router.post(`/conversations/${conv.uuid}/archive`, {}, { preserveScroll: true });
        }
    };

    const handleSendReply = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!activeConversation || !data.message.trim() || processing) return;

        post(`/conversations/${activeConversation.uuid}/reply`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
            },
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    const handleDeleteConfirm = () => {
        if (!convToDelete) return;
        router.delete(`/conversations/${convToDelete.uuid}`, {
            onSuccess: () => setConvToDelete(null),
        });
    };

    const categories = [
        {
            key: 'all',
            label: 'Semua',
            icon: Inbox,
            count: counts.all ?? 0,
        },
        {
            key: 'waiting',
            label: 'Menunggu CS',
            icon: Clock,
            count: counts.waiting ?? 0,
        },
        {
            key: 'mine',
            label: 'Milik saya',
            icon: User,
            count: counts.mine ?? 0,
        },
        {
            key: 'unassigned',
            label: 'Belum ditugaskan',
            icon: UserX,
            count: counts.unassigned ?? 0,
        },
        {
            key: 'bot',
            label: 'Ditangani Bot',
            icon: Bot,
            count: counts.bot ?? 0,
        },
        {
            key: 'archived',
            label: 'Arsip',
            icon: Archive,
            count: counts.archived ?? 0,
        },
    ];

    return (
        <>
            <Head title="Conversations - Admin" />

            <div className="flex h-full flex-1 overflow-hidden bg-background min-h-0">
                {/* PANEL 1: Kategori Percakapan (Sesuai Referensi Gambar User) */}
                <div className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-sidebar/30 p-3 space-y-4 overflow-y-auto min-h-0">
                    <div className="px-3 pt-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            PERCAKAPAN
                        </p>
                    </div>

                    <nav className="space-y-1">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const isActive = currentStatus === cat.key;

                            return (
                                <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => handleSelectCategory(cat.key)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                        isActive
                                            ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold shadow-2xs'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Icon className={`size-4 shrink-0 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                                        <span className="truncate">{cat.label}</span>
                                    </div>
                                    <span
                                        className={`text-xs tabular-nums ml-2 font-semibold ${
                                            isActive
                                                ? 'text-emerald-800 dark:text-emerald-300'
                                                : 'text-muted-foreground'
                                        }`}
                                    >
                                        {cat.count}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {selectedApp && (
                        <div className="mt-auto p-2.5 rounded-xl border border-border/60 bg-background/50 text-xs space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                Bot Aktif
                            </span>
                            <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                                <Bot className="size-3.5 text-primary shrink-0" />
                                <span className="truncate">{selectedApp.name}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* PANEL 2: Thread List Percakapan */}
                <div className="flex w-full sm:w-80 lg:w-96 shrink-0 flex-col border-r border-border bg-sidebar/10 h-full overflow-hidden min-h-0">
                    {/* Header Thread List */}
                    <div className="p-3 border-b border-border bg-sidebar/20 space-y-2.5 shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                                <span>
                                    {categories.find((c) => c.key === currentStatus)?.label || 'Daftar Chat'}
                                </span>
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold">
                                    {convList.length}
                                </Badge>
                            </h2>

                            {/* Mobile Category Dropdown / Selector */}
                            <div className="flex md:hidden items-center gap-1">
                                <select
                                    value={currentStatus}
                                    onChange={(e) => handleSelectCategory(e.target.value)}
                                    className="text-xs bg-background border border-border rounded-lg px-2 py-1"
                                >
                                    {categories.map((c) => (
                                        <option key={c.key} value={c.key}>
                                            {c.label} ({c.count})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Search Input */}
                        <form onSubmit={handleSearch} className="relative">
                            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari ID, pesan, atau IP..."
                                className="pl-8 h-8 text-xs bg-background/80 rounded-lg"
                            />
                        </form>
                    </div>

                    {/* Scrollable Conversation List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                        {convList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <MessageSquare className="size-8 opacity-30 mb-2" />
                                <p className="text-xs font-medium">Tidak ada percakapan</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {currentStatus === 'archived'
                                        ? 'Belum ada percakapan yang diarsipkan'
                                        : 'Belum ada percakapan pada kategori ini'}
                                </p>
                            </div>
                        ) : (
                            convList.map((conv) => {
                                const isSelected = activeConversation?.uuid === conv.uuid;
                                const latestMsg = conv.messages && conv.messages[0] ? conv.messages[0].content : '';

                                return (
                                    <div
                                        key={conv.uuid}
                                        onClick={() => handleSelectConversation(conv)}
                                        className={`flex items-start gap-3 p-3.5 cursor-pointer transition-all hover:bg-sidebar-accent/50 ${
                                            isSelected
                                                ? 'bg-sidebar-accent border-l-3 border-emerald-600 dark:border-emerald-500 shadow-2xs'
                                                : ''
                                        }`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-2xs">
                                            <User className="size-5" />
                                            {conv.is_taken_over ? (
                                                <span
                                                    className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-amber-500 border-2 border-background"
                                                    title="Diambil Alih oleh Admin"
                                                />
                                            ) : (
                                                <span
                                                    className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-background"
                                                    title="Aktif"
                                                />
                                            )}
                                        </div>

                                        {/* Content Preview */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <span className="text-xs font-bold truncate text-foreground">
                                                    {conv.user_identifier ? (
                                                        <span>{conv.user_identifier}</span>
                                                    ) : (
                                                        <span className="font-mono text-[11px] opacity-80">{conv.uuid.substring(0, 14)}...</span>
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                                    {(() => {
                                                        if (!conv.last_activity_at) return '';
                                                        try {
                                                            const d = new Date(conv.last_activity_at);
                                                            if (isNaN(d.getTime())) return conv.last_activity_at;
                                                            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                        } catch {
                                                            return conv.last_activity_at;
                                                        }
                                                    })()}
                                                </span>
                                            </div>

                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5 leading-snug">
                                                {latestMsg || '(Sesi percakapan baru)'}
                                            </p>

                                            <div className="flex items-center justify-between gap-1">
                                                {conv.is_archived ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.2 text-[10px] font-semibold text-muted-foreground">
                                                        <Archive className="size-2.5" />
                                                        Arsip
                                                    </span>
                                                ) : conv.is_waiting_admin ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300 animate-pulse">
                                                        <Clock className="size-2.5" />
                                                        Menunggu CS
                                                    </span>
                                                ) : conv.is_taken_over ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.2 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                                        <UserCheck className="size-2.5" />
                                                        {conv.taken_over_by?.name || 'Diambil Alih'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.2 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                                        <Bot className="size-2.5" />
                                                        Mode Bot
                                                    </span>
                                                )}

                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    {conv.messages_count} pesan
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* PANEL 3: Chat Thread Aktif */}
                <div className="hidden sm:flex flex-1 flex-col h-full bg-background overflow-hidden min-h-0">
                    {activeConversation ? (
                        <>
                            {/* Header Chat Thread */}
                            <div className="flex h-16 items-center justify-between border-b border-border bg-sidebar/20 px-6 shrink-0 shadow-2xs">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs">
                                        <User className="size-4.5" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold truncate text-foreground">
                                                {activeConversation.uuid}
                                            </span>
                                            {activeConversation.is_archived ? (
                                                <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4.5">
                                                    <Archive className="size-2.5" />
                                                    Diarsipkan
                                                </Badge>
                                            ) : activeConversation.is_taken_over ? (
                                                <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 px-1.5 py-0 h-4.5">
                                                    <UserCheck className="size-2.5" />
                                                    Diambil Alih ({activeConversation.taken_over_by?.name || 'Admin'})
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1 px-1.5 py-0 h-4.5">
                                                    <Bot className="size-2.5" />
                                                    Ditangani Bot
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                                            {activeConversation.ip_address && (
                                                <span>IP: {activeConversation.ip_address}</span>
                                            )}
                                            <span>Aktif: {activeConversation.last_activity_at}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Tombol Ambil Alih / Lepas */}
                                    <Button
                                        size="sm"
                                        variant={activeConversation.is_taken_over ? 'secondary' : 'default'}
                                        onClick={() => handleToggleTakeover(activeConversation)}
                                        className={`h-8 gap-1.5 text-xs font-semibold rounded-xl cursor-pointer shadow-xs ${
                                            activeConversation.is_taken_over
                                                ? 'border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10'
                                                : 'bg-primary text-primary-foreground'
                                        }`}
                                    >
                                        {activeConversation.is_taken_over ? (
                                            <>
                                                <Bot className="size-3.5" />
                                                <span>Lepas ke Bot</span>
                                            </>
                                        ) : (
                                            <>
                                                <HandMetal className="size-3.5" />
                                                <span>Ambil Alih</span>
                                            </>
                                        )}
                                    </Button>

                                    {/* Tombol Arsipkan / Buka Arsip */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleToggleArchive(activeConversation)}
                                        className="h-8 gap-1.5 text-xs font-medium rounded-xl cursor-pointer shadow-xs"
                                        title={activeConversation.is_archived ? 'Kembalikan dari Arsip' : 'Arsipkan Percakapan'}
                                    >
                                        {activeConversation.is_archived ? (
                                            <>
                                                <ArchiveRestore className="size-3.5" />
                                                <span>Buka Arsip</span>
                                            </>
                                        ) : (
                                            <>
                                                <Archive className="size-3.5" />
                                                <span>Arsipkan</span>
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setConvToDelete(activeConversation)}
                                        className="size-8 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                                        title="Hapus Percakapan"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Chat Messages Stream */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-sidebar/5">
                                {localMessages.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground py-16">
                                        <Bot className="size-8 opacity-40 mb-2" />
                                        <p className="text-xs">Belum ada pesan pada percakapan ini.</p>
                                    </div>
                                ) : (
                                    localMessages.map((msg) => {
                                        if (msg.role === 'system') {
                                            return (
                                                <div key={msg.id} className="flex justify-center my-3">
                                                    <span className="rounded-full bg-muted/80 border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                                        {msg.content}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        const isUser = msg.role === 'user';

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {!isUser && (
                                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mb-1 shadow-2xs">
                                                        <Bot className="size-3.5" />
                                                    </div>
                                                )}

                                                <div className="flex flex-col max-w-[82%] sm:max-w-[70%]">
                                                    <div
                                                        className={`rounded-2xl px-4 py-2.5 text-xs shadow-2xs ${
                                                            isUser
                                                                ? 'bg-emerald-600 text-white rounded-br-xs'
                                                                : 'bg-card text-card-foreground border border-border rounded-bl-xs'
                                                        }`}
                                                    >
                                                        {isUser ? (
                                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                        ) : (
                                                            <ChatMarkdown content={msg.content} />
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`text-[10px] text-muted-foreground mt-1 px-1 font-mono ${
                                                            isUser ? 'text-right' : 'text-left'
                                                        }`}
                                                    >
                                                        {msg.created_at || ''}
                                                    </span>
                                                </div>

                                                {isUser && (
                                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mb-1 shadow-2xs">
                                                        <User className="size-3.5" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Input Box & Takeover Controls */}
                            <div className="border-t border-border bg-sidebar/20 p-2.5 sm:p-3 shrink-0 space-y-2">
                                {!activeConversation.is_taken_over ? (
                                    <div className="flex items-center justify-between gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 shadow-2xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="relative flex size-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                                                <Bot className="size-3.5" />
                                                <span className="absolute -top-0.5 -right-0.5 flex size-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full size-1.5 bg-amber-500" />
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-800 dark:text-neutral-200 truncate">
                                                {activeConversation.is_waiting_admin ? (
                                                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                        <Clock className="size-3" />
                                                        Pengunjung menunggu respon Admin CS (Pengecekan Formulir)
                                                    </span>
                                                ) : (
                                                    <span>Percakapan dijawab otomatis oleh Bot AI</span>
                                                )}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleToggleTakeover(activeConversation)}
                                            className="h-7 px-3 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-600 text-neutral-950 shadow-2xs transition-transform active:scale-95 cursor-pointer shrink-0 gap-1.5"
                                        >
                                            <UserCheck className="size-3" />
                                            <span>Ambil Alih Chat</span>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 text-xs shadow-2xs">
                                        <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                                            <span className="relative flex size-2 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                                            </span>
                                            <UserCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-[11px]">Mode Live Admin Aktif</span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleTakeover(activeConversation)}
                                            className="h-6 px-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 cursor-pointer gap-1"
                                        >
                                            <RotateCcw className="size-3" />
                                            <span>Kembalikan ke Bot</span>
                                        </Button>
                                    </div>
                                )}

                                <form onSubmit={handleSendReply} className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <Input
                                            value={data.message}
                                            onChange={(e) => setData('message', e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={
                                                activeConversation.is_taken_over
                                                    ? 'Ketik balasan Anda langsung ke pengunjung... (Tekan Enter untuk kirim)'
                                                    : 'Klik "Ambil Alih Chat" di atas untuk membalas...'
                                            }
                                            disabled={!activeConversation.is_taken_over || processing}
                                            className={`h-9 text-xs rounded-xl bg-background transition-all px-3 ${
                                                activeConversation.is_taken_over
                                                    ? 'border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30'
                                                    : 'opacity-60 bg-muted/30 cursor-not-allowed'
                                            }`}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={!activeConversation.is_taken_over || !data.message.trim() || processing}
                                        className={`h-9 px-4 rounded-xl font-semibold text-xs shadow-2xs gap-1.5 transition-all cursor-pointer shrink-0 ${
                                            activeConversation.is_taken_over
                                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                : 'opacity-50'
                                        }`}
                                    >
                                        {processing ? (
                                            <Spinner className="size-3.5" />
                                        ) : (
                                            <>
                                                <Send className="size-3.5" />
                                                <span className="hidden sm:inline">Kirim</span>
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-8">
                            <MessageSquare className="size-12 opacity-20 mb-3" />
                            <p className="text-sm font-semibold">Pilih salah satu percakapan di sebelah kiri</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                Anda dapat memantau percakapan pengunjung secara realtime, atau mengambil alih untuk menjawab langsung sebagai admin.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Konfirmasi Hapus */}
            <Dialog open={!!convToDelete} onOpenChange={(open) => !open && setConvToDelete(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Percakapan?</DialogTitle>
                        <DialogDescription>
                            Tindakan ini akan menghapus riwayat percakapan sesi{' '}
                            <code className="font-mono text-xs">{convToDelete?.uuid}</code> secara permanen beserta seluruh pesannya.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConvToDelete(null)}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>
                            Hapus Percakapan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ConversationsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Conversations',
            href: '/conversations',
        },
    ],
};
