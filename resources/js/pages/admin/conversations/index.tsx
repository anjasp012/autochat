import { useEffect, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Archive,
    ArchiveRestore,
    ArrowLeft,
    Bot,
    CheckCheck,
    Clock,
    Film,
    HandMetal,
    Inbox,
    Loader2,
    MessageSquare,
    Paperclip,
    RotateCcw,
    Search,
    Send,
    Trash2,
    User,
    UserCheck,
    X,
    Zap,
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
    id: number | string;
    conversation_id?: number;
    role: 'user' | 'assistant' | 'admin' | 'system';
    content: string;
    media_url?: string | null;
    media_type?: 'image' | 'video' | null;
    tokens_used?: number;
    created_at?: string;
    status?: 'sending' | 'sent' | 'failed';
    error?: string;
}

interface ConversationItem {
    id: number;
    uuid: string;
    application_id: number;
    user_identifier?: string | null;
    ip_address: string | null;
    city?: string | null;
    last_activity_at: string;
    is_taken_over: boolean;
    is_waiting_admin?: boolean;
    is_archived: boolean;
    taken_over_at: string | null;
    messages_count: number;
    latest_message?: {
        id: number;
        content: string;
        role: string;
        created_at: string;
    } | null;
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
    waiting?: number;
    mine: number;
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

const formatWibDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return (
            new Intl.DateTimeFormat('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta',
            }).format(d) + ' WIB'
        );
    } catch {
        return dateStr;
    }
};

export default function ConversationsIndex({
    conversations = [],
    activeConversation,
    counts = { all: 0, waiting: 0, mine: 0, bot: 0, archived: 0 },
    filters = {},
    selectedApp,
}: Props) {
    const rawConversations = conversations as any;
    const convList: ConversationItem[] = Array.isArray(rawConversations)
        ? rawConversations
        : Array.isArray(rawConversations?.data)
            ? rawConversations.data
            : [];

    const { auth } = usePage().props as Record<string, any>;
    const currentUserId = auth?.user?.id;
    const isSuperAdmin =
        auth?.user?.role === 'admin' ||
        auth?.user?.role === 'super_admin' ||
        (auth?.user?.is_admin && !auth?.user?.role);

    const isTakenOver = Boolean(activeConversation?.is_taken_over);
    const takenOverUserId = activeConversation?.taken_over_by?.id;
    const isTakenOverByMe = isTakenOver && takenOverUserId === currentUserId;
    const isTakenOverByOther = isTakenOver && Boolean(takenOverUserId) && takenOverUserId !== currentUserId;
    const canReply = isTakenOver ? (!takenOverUserId || isTakenOverByMe) : false;

    const [search, setSearch] = useState(filters?.search || '');
    const [currentStatus, setCurrentStatus] = useState(filters?.status || 'all');
    const [convToDelete, setConvToDelete] = useState<ConversationItem | null>(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const [localMessages, setLocalMessages] = useState<Message[]>(
        Array.isArray(activeConversation?.messages) ? activeConversation.messages : []
    );

    useEffect(() => {
        setLocalMessages(Array.isArray(activeConversation?.messages) ? activeConversation.messages : []);
    }, [activeConversation?.id, activeConversation?.uuid, activeConversation?.messages]);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

    const { data, setData, post, processing, reset } = useForm<{
        message: string;
        attachment: File | null;
    }>({
        message: '',
        attachment: null,
    });

    const scrollToBottom = (smooth = true) => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto',
            });
        }
    };

    const focusReplyInput = () => {
        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
    };

    useEffect(() => {
        scrollToBottom(false);
        if (canReply) {
            focusReplyInput();
        }
    }, [activeConversation?.uuid]);

    useEffect(() => {
        scrollToBottom(true);
    }, [localMessages.length]);

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
            console.log('[Echo Admin] Received conversation room update:', event);
            // Instant local state append / deduplication
            setLocalMessages((prev) => {
                const idStr = String(event.id);
                if (prev.some((m) => String(m.id) === idStr)) return prev;

                // Replace matching temporary optimistic message
                const tempIndex = prev.findIndex(
                    (m) =>
                        String(m.id).startsWith('temp-admin-') &&
                        (m.content === event.content || (event.media_url && m.media_url))
                );

                if (tempIndex !== -1) {
                    const next = [...prev];
                    next[tempIndex] = {
                        ...next[tempIndex],
                        id: Number(event.id) || event.id,
                        media_url: event.media_url || next[tempIndex].media_url,
                        media_type: event.media_type || next[tempIndex].media_type,
                        created_at: event.created_at || next[tempIndex].created_at,
                        status: 'sent',
                    };
                    return next;
                }

                return [
                    ...prev,
                    {
                        id: Number(event.id) || Date.now(),
                        conversation_id: activeConversation.id,
                        role: event.role,
                        content: event.content,
                        media_url: event.media_url,
                        media_type: event.media_type,
                        tokens_used: 0,
                        created_at: event.created_at || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: 'sent',
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

    // Fallback sync polling: periodically sync in background so no message is ever delayed or lost
    useEffect(() => {
        if (!activeConversation?.uuid) return;

        const interval = setInterval(async () => {
            if (document.hidden) return;

            try {
                const res = await fetch(`/conversations/${activeConversation.uuid}/messages`, {
                    headers: { Accept: 'application/json' },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.messages && Array.isArray(data.messages)) {
                        setLocalMessages((prev) => {
                            let hasNew = false;
                            const merged = [...prev];
                            for (const serverMsg of data.messages) {
                                const exists = merged.some(
                                    (m) =>
                                        String(m.id) === String(serverMsg.id) ||
                                        (m.role === serverMsg.role &&
                                            m.content === serverMsg.content &&
                                            (m.media_url === serverMsg.media_url || !m.media_url))
                                );
                                if (!exists) {
                                    hasNew = true;
                                    merged.push({
                                        ...serverMsg,
                                        status: 'sent',
                                    });
                                }
                            }
                            return hasNew ? merged : prev;
                        });
                    }
                }
            } catch (e) {
                // Ignore silent background sync errors
            }
        }, 3500);

        return () => clearInterval(interval);
    }, [activeConversation?.uuid]);

    // Auto-reload on browser window focus
    useEffect(() => {
        const handleFocus = () => {
            router.reload({
                only: ['conversations', 'counts'],
                preserveScroll: true,
                preserveState: true,
            });
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

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
                onSuccess: () => focusReplyInput(),
            }
        );
    };

    const handleToggleTakeover = (conv: ConversationItem) => {
        if (conv.is_taken_over) {
            if (conv.taken_over_by?.id && conv.taken_over_by.id !== currentUserId && !isSuperAdmin) {
                return;
            }
            router.post(`/conversations/${conv.uuid}/release-takeover`, {}, { preserveScroll: true });
        } else {
            router.post(
                `/conversations/${conv.uuid}/takeover`,
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => focusReplyInput(),
                }
            );
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
        if (!activeConversation || isTakenOverByOther || !canReply || (!data.message.trim() && !data.attachment) || processing) return;

        const tempId = `temp-admin-${Date.now()}`;
        const tempMediaUrl = data.attachment ? URL.createObjectURL(data.attachment) : null;
        const tempMediaType = data.attachment
            ? data.attachment.type.startsWith('video/')
                ? 'video'
                : 'image'
            : null;
        const sentContent = data.message.trim() || (tempMediaType === 'video' ? '[Video]' : '[Gambar]');
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Optimistic append immediately to localMessages
        const optimisticMsg: Message = {
            id: tempId,
            conversation_id: activeConversation.id,
            role: 'admin',
            content: sentContent,
            media_url: tempMediaUrl,
            media_type: tempMediaType,
            tokens_used: 0,
            created_at: timeNow,
            status: 'sending',
        };

        setLocalMessages((prev) => [...prev, optimisticMsg]);
        scrollToBottom(true);

        post(`/conversations/${activeConversation.uuid}/reply`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                reset();
                if (filePreviewUrl) {
                    URL.revokeObjectURL(filePreviewUrl);
                    setFilePreviewUrl(null);
                }
                setLocalMessages((prev) =>
                    prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
                );
            },
            onError: (errors) => {
                const errMsg = errors?.attachment || errors?.message || 'Gagal mengirim lampiran.';
                setLocalMessages((prev) =>
                    prev.map((m) =>
                        m.id === tempId
                            ? { ...m, status: 'failed', error: String(errMsg) }
                            : m
                    )
                );
            },
            onFinish: () => {
                focusReplyInput();
            },
        });
        focusReplyInput();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    const handleDeleteConfirm = () => {
        if (!convToDelete || !isSuperAdmin) return;
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

    const activeDisplayName = (() => {
        if (!activeConversation) return '';
        let name = activeConversation.user_identifier;
        if (!name || name === activeConversation.uuid) {
            const firstMsg = localMessages.find((m) => m.role === 'user')?.content || '';
            const m = firstMsg.match(/User ID saya:\s*([^.\n]+)/i) || firstMsg.match(/Username:\*{0,2}\s*([^\n\r*]+)/i);
            if (m && m[1]) {
                name = m[1].trim();
            }
        }
        if (!name || name === activeConversation.uuid) {
            name = `User_${activeConversation.uuid.substring(0, 6)}`;
        }
        return name;
    })();

    return (
        <>
            <Head title="Conversations - Admin" />

            <div className="flex h-full flex-1 overflow-hidden bg-background min-h-0">
                {/* PANEL 1: Kategori Percakapan (Sesuai Referensi Gambar User) */}
                <div className="hidden md:flex w-56 shrink-0 flex-col justify-between border-r border-border bg-sidebar/30 p-3 overflow-y-auto min-h-0">
                    <div className="space-y-4">
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
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${isActive
                                            ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold shadow-2xs'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Icon className={`size-4 shrink-0 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                                            <span className="truncate">{cat.label}</span>
                                        </div>
                                        <span
                                            className={`text-xs tabular-nums ml-2 font-semibold ${isActive
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
                    </div>

                    {/* Tombol Hapus Semua di Menu Percakapan (Paling Bawah) - Khusus Super Admin */}
                    {isSuperAdmin && (
                        <div className="pt-3 border-t border-border mt-auto">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDeleteAllModal(true)}
                                className="w-full justify-start text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:hover:bg-rose-950/30 gap-2 cursor-pointer font-semibold rounded-xl h-9"
                                title="Hapus Semua Riwayat Percakapan"
                            >
                                <Trash2 className="size-4 text-rose-600 shrink-0" />
                                <span>Hapus Semua</span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* PANEL 2: Thread List Percakapan */}
                <div className={`${activeConversation ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 lg:w-96 shrink-0 flex-col border-r border-border bg-sidebar/10 h-full overflow-hidden min-h-0`}>
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
                            <div className="flex md:hidden items-center gap-1.5">
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
                                {isSuperAdmin && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowDeleteAllModal(true)}
                                        className="size-7 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                                        title="Hapus Semua Percakapan"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Search Input */}
                        <form onSubmit={handleSearch} className="relative">
                            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari ID, pesan, atau IP..."
                                className="pl-8 pr-7 h-8 text-xs bg-background/80 rounded-lg"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        router.get('/conversations', { status: currentStatus !== 'all' ? currentStatus : undefined }, { preserveState: true });
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Bersihkan Pencarian"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Scrollable Conversation List */}
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-border/40">
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

                                // Dapatkan pesan PALING TERBARU:
                                // Jika percakapan aktif di layar, ambil pesan paling akhir dari localMessages
                                // Jika tidak, ambil dari conv.latest_message (atau fallback ke conv.messages)
                                const latestMessageObj = (isSelected && localMessages.length > 0)
                                    ? localMessages[localMessages.length - 1]
                                    : (conv.latest_message || (conv.messages && conv.messages.length > 0 ? conv.messages[0] : null));

                                const latestMsg = latestMessageObj ? latestMessageObj.content : '';

                                // Belum dijawab (Unanswered): HANYA jika pesan paling akhir adalah dari user/pengunjung!
                                // Begitu dibalas oleh bot atau admin, isLatestFromUser bernilai false sehingga TIDAK MERAH.
                                const isLatestFromUser = latestMessageObj?.role === 'user';
                                const hasUnreadAdminMessage = isLatestFromUser;

                                let displayName = conv.user_identifier;
                                if (!displayName || displayName === conv.uuid) {
                                    displayName = `User_${conv.uuid.substring(0, 6)}`;
                                }

                                return (
                                    <div
                                        key={conv.uuid}
                                        onClick={() => handleSelectConversation(conv)}
                                        className={`flex items-start gap-3 p-3.5 cursor-pointer transition-all hover:bg-sidebar-accent/50 ${isSelected
                                            ? 'bg-sidebar-accent border-l-3 border-emerald-600 dark:border-emerald-500 shadow-2xs'
                                            : ''
                                            }`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-2xs">
                                            <User className="size-5" />
                                            {hasUnreadAdminMessage && (
                                                <span className="absolute -top-1 -right-1 flex size-3.5" title="Pesan baru belum dibalas admin">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                                                    <span className="relative inline-flex rounded-full size-3.5 bg-rose-500 border-2 border-background" />
                                                </span>
                                            )}
                                        </div>

                                        {/* Content Preview */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <span className="text-xs font-bold truncate text-foreground flex items-center gap-1.5">
                                                    <span>{displayName}</span>
                                                    <span className="font-mono text-[10px] text-muted-foreground font-normal opacity-70">
                                                        ({conv.uuid.substring(0, 6)})
                                                    </span>
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

                                            <p className={`text-xs line-clamp-1 mb-1.5 leading-snug ${hasUnreadAdminMessage ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                                {latestMessageObj?.role === 'admin'
                                                    ? `Anda: ${latestMsg}`
                                                    : latestMsg || '(Sesi percakapan baru)'}
                                            </p>

                                            <div className="flex items-center justify-between gap-1">
                                                {conv.is_archived ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.2 text-[10px] font-semibold text-muted-foreground">
                                                        <Archive className="size-2.5" />
                                                        Arsip
                                                    </span>
                                                ) : hasUnreadAdminMessage ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.2 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                                        <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                        Pesan Baru
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
                <div className={`${activeConversation ? 'flex' : 'hidden sm:flex'} flex-1 flex-col h-full bg-background overflow-hidden min-h-0`}>
                    {activeConversation ? (
                        <>
                            {/* Header Chat Thread */}
                            <div className="flex h-16 items-center justify-between border-b border-border bg-sidebar/20 px-3 sm:px-6 shrink-0 shadow-2xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => router.get('/conversations', { status: currentStatus !== 'all' ? currentStatus : undefined }, { preserveState: true })}
                                        className="sm:hidden flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                                        title="Kembali ke Daftar Chat"
                                    >
                                        <ArrowLeft className="size-4" />
                                    </button>
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs">
                                        <User className="size-4.5" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold truncate text-foreground flex items-center gap-1.5">
                                                <span>{activeDisplayName}</span>
                                                <span className="text-xs font-mono font-normal text-muted-foreground">({activeConversation.uuid.substring(0, 8)}...)</span>
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
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-mono">
                                            {activeConversation.ip_address && (
                                                <span>IP: {activeConversation.ip_address}</span>
                                            )}
                                            <span>KOTA : {activeConversation.city || '-'}</span>
                                            <span>Aktif: {formatWibDateTime(activeConversation.last_activity_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Tombol Ambil Alih / Lepas */}
                                    {isTakenOverByOther && !isSuperAdmin ? (
                                        <Badge
                                            variant="secondary"
                                            className="h-8 px-3 text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1.5 shadow-2xs"
                                        >
                                            <UserCheck className="size-3.5" />
                                            <span>Ditangani {activeConversation.taken_over_by?.name || 'Admin Lain'}</span>
                                        </Badge>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant={activeConversation.is_taken_over ? 'secondary' : 'default'}
                                            onClick={() => handleToggleTakeover(activeConversation)}
                                            className={`h-8 gap-1.5 text-xs font-semibold rounded-xl cursor-pointer shadow-xs ${activeConversation.is_taken_over
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
                                    )}

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

                                    {isSuperAdmin && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setConvToDelete(activeConversation)}
                                            className="size-8 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                                            title="Hapus Percakapan"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Chat Messages Stream */}
                            <div
                                ref={messagesContainerRef}
                                className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3.5 bg-sidebar/5"
                            >
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
                                        const isAdmin = msg.role === 'admin';
                                        const isAssistant = msg.role === 'assistant';
                                        // Di CMS Admin: Pengunjung di KIRI, Admin & AI di KANAN!
                                        const isRight = isAdmin || isAssistant;

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex items-end gap-2.5 ${isRight ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {!isRight && (
                                                    <div
                                                        className="flex size-7 shrink-0 items-center justify-center rounded-full mb-1 shadow-2xs bg-neutral-800 text-white dark:bg-neutral-700"
                                                        title={activeDisplayName || 'Pengunjung'}
                                                    >
                                                        <User className="size-3.5" />
                                                    </div>
                                                )}

                                                <div className={`flex flex-col max-w-[82%] sm:max-w-[70%] ${isRight ? 'items-end' : 'items-start'}`}>
                                                    <span className="text-[10px] font-semibold text-muted-foreground px-1 mb-0.5 flex items-center gap-1">
                                                        {isAdmin ? (
                                                            <>
                                                                <UserCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
                                                                <span>Anda (Admin CS)</span>
                                                            </>
                                                        ) : isAssistant ? (
                                                            <>
                                                                <Bot className="size-3 text-emerald-600 dark:text-emerald-400" />
                                                                <span>Asisten AI</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <User className="size-3" />
                                                                <span>{activeDisplayName || 'Pengunjung'}</span>
                                                            </>
                                                        )}
                                                    </span>

                                                    {/* Media Attachment (Image or Video) */}
                                                    {msg.media_url && (
                                                        <div className="relative overflow-hidden rounded-2xl max-w-full shadow-2xs mb-1.5 group">
                                                            {msg.media_type === 'video' ? (
                                                                <video
                                                                    src={msg.media_url}
                                                                    controls={msg.status !== 'sending'}
                                                                    playsInline
                                                                    className="max-h-60 max-w-full rounded-2xl bg-black"
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={msg.media_url}
                                                                    alt="Lampiran"
                                                                    onClick={() => msg.status !== 'sending' && setLightboxMedia({ url: msg.media_url!, type: 'image' })}
                                                                    className="max-h-60 max-w-full rounded-2xl object-contain cursor-pointer hover:opacity-95 transition-opacity bg-black/5"
                                                                />
                                                            )}

                                                            {/* Uploading Overlay */}
                                                            {msg.status === 'sending' && (
                                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1.5 p-3">
                                                                    <Loader2 className="size-5 animate-spin text-emerald-400" />
                                                                    <span className="text-xs font-semibold text-white drop-shadow">
                                                                        Mengunggah {msg.media_type === 'video' ? 'video' : 'foto'}...
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Failed Overlay */}
                                                            {msg.status === 'failed' && (
                                                                <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1 p-2 text-center">
                                                                    <AlertCircle className="size-5 text-rose-400 mb-0.5" />
                                                                    <span className="text-xs font-bold text-rose-200">Gagal Terkirim</span>
                                                                    <span className="text-[10px] text-rose-300 max-w-[200px] leading-tight">
                                                                        {msg.error || 'Ukuran melebihi batas atau kendala jaringan'}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Sent Badge on Media */}
                                                            {(msg.status === 'sent' || (!msg.status && isRight)) && (
                                                                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs shadow-xs">
                                                                    <CheckCheck className="size-3 text-emerald-400" />
                                                                    <span>Terkirim</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {msg.content && msg.content !== '[Gambar]' && msg.content !== '[Video]' && (
                                                        <div
                                                            className={`rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${isRight
                                                                ? isAdmin
                                                                    ? 'bg-emerald-600 text-white rounded-br-xs'
                                                                    : 'bg-emerald-700 text-white rounded-br-xs dark:bg-emerald-800'
                                                                : 'bg-card text-card-foreground border border-border rounded-bl-xs'
                                                                }`}
                                                        >
                                                            {isUser ? (
                                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                            ) : (
                                                                <ChatMarkdown content={msg.content} />
                                                            )}
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`text-[10px] text-muted-foreground mt-1 px-1 font-mono flex items-center gap-1 ${isRight ? 'justify-end' : 'justify-start'
                                                            }`}
                                                    >
                                                        <span>{msg.created_at || ''}</span>
                                                        {isRight && (
                                                            msg.status === 'sending' ? (
                                                                <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                                                                    <Clock className="size-2.5 animate-spin" />
                                                                    <span>Mengirim...</span>
                                                                </span>
                                                            ) : msg.status === 'failed' ? (
                                                                <span className="flex items-center gap-0.5 text-rose-500 font-bold">
                                                                    <AlertCircle className="size-2.5" />
                                                                    <span>Gagal</span>
                                                                </span>
                                                            ) : (
                                                                <CheckCheck className="size-3 text-emerald-500" />
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                {isRight && (
                                                    <div
                                                        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-white mb-1 shadow-2xs ${isAdmin ? 'bg-emerald-600' : 'bg-emerald-700 dark:bg-emerald-800'
                                                            }`}
                                                        title={isAdmin ? 'Anda (Admin CS)' : 'Asisten AI'}
                                                    >
                                                        {isAdmin ? <UserCheck className="size-3.5" /> : <Bot className="size-3.5" />}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Reply Input Box & Takeover Controls */}
                            <div className="border-t border-border bg-sidebar/20 p-2.5 sm:p-3 shrink-0 space-y-2">
                                {isTakenOverByOther ? (
                                    <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 text-xs shadow-2xs">
                                        <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 min-w-0">
                                            <UserCheck className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <span className="text-[11px] truncate">
                                                Sedang Ditangani oleh {activeConversation.taken_over_by?.name || 'Admin Lain'} (Mode Pantau / Tidak Dapat Mengetik)
                                            </span>
                                        </div>
                                        {isSuperAdmin && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleTakeover(activeConversation)}
                                                className="h-6 px-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 cursor-pointer gap-1 shrink-0"
                                            >
                                                <RotateCcw className="size-3" />
                                                <span>Kembalikan ke Bot</span>
                                            </Button>
                                        )}
                                    </div>
                                ) : !activeConversation.is_taken_over ? (
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

                                {/* Attachment Preview Chip */}
                                {data.attachment && (
                                    <div className="flex items-center gap-2 p-1.5 px-2.5 rounded-xl bg-muted border border-border text-xs w-fit max-w-full">
                                        {filePreviewUrl && data.attachment.type.startsWith('image/') ? (
                                            <img
                                                src={filePreviewUrl}
                                                alt="Preview"
                                                className="size-8 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <Film className="size-5 text-muted-foreground shrink-0" />
                                        )}
                                        <span className="truncate max-w-[200px] font-medium text-[11px]">
                                            {data.attachment.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setData('attachment', null);
                                                if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
                                                setFilePreviewUrl(null);
                                            }}
                                            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleSendReply} className="flex gap-2 items-center">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 25 * 1024 * 1024) {
                                                    alert('Ukuran file maksimal 25 MB. Silakan pilih file yang lebih kecil.');
                                                    e.target.value = '';
                                                    return;
                                                }
                                                setData('attachment', file);
                                                setFilePreviewUrl(URL.createObjectURL(file));
                                                setTimeout(() => inputRef.current?.focus(), 50);
                                            }
                                            e.target.value = '';
                                        }}
                                    />

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={!canReply || processing}
                                        className="size-9 rounded-xl shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                        title={
                                            isTakenOverByOther
                                                ? `Sedang ditangani oleh ${activeConversation.taken_over_by?.name || 'Admin Lain'}`
                                                : canReply
                                                    ? 'Kirim Foto atau Video'
                                                    : 'Klik Ambil Alih Chat terlebih dahulu'
                                        }
                                    >
                                        <Paperclip className="size-4" />
                                    </Button>

                                    <div className="relative flex-1">
                                        <Input
                                            ref={inputRef}
                                            value={data.message}
                                            onChange={(e) => setData('message', e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={
                                                isTakenOverByOther
                                                    ? `Sedang ditangani oleh ${activeConversation.taken_over_by?.name || 'Admin Lain'} (Mode Pantau / Hanya Baca)`
                                                    : canReply
                                                        ? data.attachment
                                                            ? 'Tambah keterangan lampiran (opsional)... (Tekan Enter untuk kirim)'
                                                            : 'Ketik balasan Anda langsung ke pengunjung... (Tekan Enter untuk kirim)'
                                                        : 'Klik "Ambil Alih Chat" di atas untuk membalas...'
                                            }
                                            disabled={!canReply}
                                            readOnly={processing}
                                            className={`h-9 text-xs rounded-xl bg-background transition-all px-3 ${canReply
                                                ? 'border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30'
                                                : 'opacity-60 bg-muted/30 cursor-not-allowed'
                                                }`}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={!canReply || (!data.message.trim() && !data.attachment) || processing}
                                        className={`h-9 px-4 rounded-xl font-semibold text-xs shadow-2xs gap-1.5 transition-all shrink-0 ${canReply
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                            : 'opacity-50 cursor-not-allowed'
                                            }`}
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="size-3.5 animate-spin" />
                                                <span>Mengirim...</span>
                                            </>
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
            </div >

            {/* Modal Konfirmasi Hapus */}
            {/* Modal Konfirmasi Hapus Satuan */}
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

            {/* Modal Konfirmasi Hapus Semua Percakapan */}
            <Dialog open={showDeleteAllModal} onOpenChange={setShowDeleteAllModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="size-5" />
                            Hapus Semua Percakapan?
                        </DialogTitle>
                        <DialogDescription className="space-y-2 pt-1 text-xs">
                            <p>
                                Tindakan ini akan menghapus <strong>seluruh riwayat percakapan</strong> beserta semua pesan di dalamnya secara permanen dari database.
                            </p>
                            <p className="text-muted-foreground font-semibold">
                                Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteAllModal(false)}
                            disabled={isDeletingAll}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={isDeletingAll}
                            onClick={() => {
                                if (!isSuperAdmin) return;
                                setIsDeletingAll(true);
                                router.delete('/conversations/destroy-all', {
                                    onFinish: () => {
                                        setIsDeletingAll(false);
                                        setShowDeleteAllModal(false);
                                    },
                                });
                            }}
                            className="gap-1.5"
                        >
                            {isDeletingAll && <Spinner className="size-3.5" />}
                            <span>Ya, Hapus Semua</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lightbox Media Preview (Image & Video) */}
            {lightboxMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setLightboxMedia(null)}
                >
                    <button
                        type="button"
                        onClick={() => setLightboxMedia(null)}
                        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer transition-colors"
                        title="Tutup Preview"
                    >
                        <X className="size-6" />
                    </button>
                    <div
                        className="relative max-w-4xl max-h-[90vh] overflow-hidden flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {lightboxMedia.type === 'video' ? (
                            <video
                                src={lightboxMedia.url}
                                controls
                                autoPlay
                                className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl"
                            />
                        ) : (
                            <img
                                src={lightboxMedia.url}
                                alt="Pratinjau Foto"
                                className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
                            />
                        )}
                    </div>
                </div>
            )}
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
