import { useEffect, useRef, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Bot,
    Clock,
    HandMetal,
    MessageSquare,
    Search,
    Send,
    Trash2,
    User,
    UserCheck,
} from 'lucide-react';
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
    ip_address: string | null;
    last_activity_at: string;
    is_taken_over: boolean;
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

interface Props {
    conversations?: ConversationItem[] | { data: ConversationItem[] };
    activeConversation?: ConversationDetail | null;
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
    const [status, setStatus] = useState(filters?.status || '');
    const [convToDelete, setConvToDelete] = useState<ConversationItem | null>(null);

    const activeMessages: Message[] = Array.isArray(activeConversation?.messages)
        ? activeConversation.messages
        : [];

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data, setData, post, processing, reset } = useForm({
        message: '',
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeMessages.length, activeConversation?.uuid]);

    // WebSocket realtime listener via Laravel Reverb Echo
    useEffect(() => {
        if (!activeConversation?.uuid) return;

        const channel = echo.channel(`conversation.${activeConversation.uuid}`);
        const handleIncoming = () => {
            router.reload({
                only: ['conversations', 'activeConversation'],
                preserveScroll: true,
                preserveState: true,
            });
        };

        channel.listen('.MessageSent', handleIncoming);
        channel.listen('MessageSent', handleIncoming);

        return () => {
            channel.stopListening('.MessageSent');
            channel.stopListening('MessageSent');
        };
    }, [activeConversation?.uuid]);

    // Live sync polling backup setiap 3 detik
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['conversations', 'activeConversation'],
                preserveScroll: true,
                preserveState: true,
            });
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/conversations',
            {
                search: search || undefined,
                status: status || undefined,
            },
            { preserveState: true }
        );
    };

    const handleStatusFilter = (newStatus: string) => {
        setStatus(newStatus);
        router.get(
            '/conversations',
            {
                search: search || undefined,
                status: newStatus || undefined,
            },
            { preserveState: true }
        );
    };

    const handleSelectConversation = (conv: ConversationItem) => {
        if (activeConversation?.uuid === conv.uuid) return;

        router.get(
            `/conversations/${conv.uuid}`,
            {},
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

    return (
        <>
            <Head title="Conversations - Admin" />

            <div className="flex h-[calc(100vh-4rem)] flex-1 overflow-hidden bg-background">
                {/* SISI KIRI: Daftar User / Percakapan (Mirip WhatsApp Web) */}
                <div className="flex w-full sm:w-80 lg:w-96 shrink-0 flex-col border-r border-border bg-sidebar/20">
                    {/* Header Sisi Kiri */}
                    <div className="p-3 border-b border-border bg-sidebar/40 space-y-2.5 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold tracking-tight text-foreground">
                                    Conversations
                                </h2>
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold">
                                    {convList.length}
                                </Badge>
                            </div>
                            {selectedApp && (
                                <Badge variant="outline" className="text-[11px] font-mono gap-1 py-0 px-2">
                                    <Bot className="size-3 text-primary" />
                                    {selectedApp.name}
                                </Badge>
                            )}
                        </div>

                        {/* Search Input */}
                        <form onSubmit={handleSearch} className="relative">
                            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari percakapan..."
                                className="pl-8 h-8 text-xs bg-background/80 rounded-lg"
                            />
                        </form>

                        {/* Filter Status Tabs */}
                        <div className="flex items-center gap-1 rounded-lg border border-input p-0.5 text-xs bg-muted/40">
                            <button
                                type="button"
                                onClick={() => handleStatusFilter('')}
                                className={`flex-1 rounded-md py-1 text-center font-medium transition-colors cursor-pointer text-[11px] ${
                                    !status ? 'bg-background shadow-2xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Semua
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusFilter('taken_over')}
                                className={`flex-1 rounded-md py-1 text-center font-medium transition-colors cursor-pointer text-[11px] ${
                                    status === 'taken_over' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Diambil Alih
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusFilter('ai')}
                                className={`flex-1 rounded-md py-1 text-center font-medium transition-colors cursor-pointer text-[11px] ${
                                    status === 'ai' ? 'bg-background shadow-2xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Mode AI
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Conversation List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                        {convList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <MessageSquare className="size-8 opacity-30 mb-2" />
                                <p className="text-xs">Belum ada percakapan</p>
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
                                                ? 'bg-sidebar-accent border-l-3 border-primary shadow-2xs'
                                                : ''
                                        }`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-2xs">
                                            <User className="size-5" />
                                            {conv.is_taken_over && (
                                                <span
                                                    className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-amber-500 border-2 border-background"
                                                    title="Sedang Diambil Alih oleh Admin"
                                                />
                                            )}
                                        </div>

                                        {/* Content Preview */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <span className="font-mono text-xs font-bold truncate text-foreground">
                                                    {conv.uuid.substring(0, 16)}...
                                                </span>
                                                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                                    {conv.last_activity_at}
                                                </span>
                                            </div>

                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5 leading-snug">
                                                {latestMsg || '(Sesi baru dimulai)'}
                                            </p>

                                            <div className="flex items-center justify-between">
                                                {conv.is_taken_over ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.2 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                                        <UserCheck className="size-2.5" />
                                                        Diambil Alih
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.2 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                                        <Bot className="size-2.5" />
                                                        Mode AI
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

                {/* SISI KANAN: Chat Thread Percakapan Yang Sedang Dibuka */}
                <div className="hidden sm:flex flex-1 flex-col h-full bg-sidebar/5 overflow-hidden">
                    {activeConversation ? (
                        <>
                            {/* Header Chat Thread */}
                            <div className="flex h-16 items-center justify-between border-b border-border bg-sidebar/30 px-6 shrink-0 shadow-2xs">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs">
                                        <User className="size-4.5" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold truncate text-foreground">
                                                {activeConversation.uuid}
                                            </span>
                                            {activeConversation.is_taken_over ? (
                                                <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 px-1.5 py-0 h-4.5">
                                                    <UserCheck className="size-2.5" />
                                                    Diambil Alih ({activeConversation.taken_over_by?.name || 'Admin'})
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1 px-1.5 py-0 h-4.5">
                                                    <Bot className="size-2.5" />
                                                    Ditangani AI
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
                                    {/* Tombol Ambil Alih */}
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
                                                <span>Lepas ke AI</span>
                                            </>
                                        ) : (
                                            <>
                                                <HandMetal className="size-3.5" />
                                                <span>Ambil Alih</span>
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
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-sidebar/5">
                                {activeMessages.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground py-16">
                                        <Bot className="size-8 opacity-40 mb-2" />
                                        <p className="text-xs">Belum ada pesan pada percakapan ini.</p>
                                    </div>
                                ) : (
                                    activeMessages.map((msg) => {
                                        if (msg.role === 'system') {
                                            return (
                                                <div key={msg.id} className="flex justify-center my-2">
                                                    <span className="rounded-full bg-muted/80 px-3 py-1 text-[11px] font-medium text-muted-foreground border border-border/80 shadow-2xs">
                                                        {msg.content}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        const isUser = msg.role === 'user';

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex gap-2.5 max-w-2xl ${
                                                    isUser ? 'mr-auto' : 'ml-auto flex-row-reverse'
                                                }`}
                                            >
                                                <div
                                                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-2xs mt-1 ${
                                                        isUser
                                                            ? 'bg-muted text-muted-foreground border border-border'
                                                            : 'bg-primary text-primary-foreground'
                                                    }`}
                                                >
                                                    {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                                                </div>

                                                <div className={`flex flex-col gap-1 min-w-0 ${isUser ? 'items-start' : 'items-end'}`}>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                                                        <span className="font-semibold text-foreground">
                                                            {isUser ? 'Pengunjung' : (activeConversation.is_taken_over ? 'Admin' : 'AI Bot')}
                                                        </span>
                                                        <span className="font-mono text-[9px]">
                                                            {msg.created_at}
                                                        </span>
                                                    </div>

                                                    <div
                                                        className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                                                            isUser
                                                                ? 'bg-card text-card-foreground border border-border/80 rounded-tl-xs'
                                                                : 'bg-primary text-primary-foreground rounded-tr-xs'
                                                        }`}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Input Bar (Bawah) */}
                            <div className="border-t border-border bg-sidebar/30 p-3 sm:p-4 shrink-0">
                                {activeConversation.is_taken_over ? (
                                    <form onSubmit={handleSendReply} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                            <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 text-[11px]">
                                                <UserCheck className="size-3" />
                                                Mode Live Support Admin Aktif (AI dihentikan)
                                            </span>
                                            <span className="text-[10px] hidden sm:inline">
                                                Tekan <kbd className="font-mono rounded border bg-muted px-1">Enter</kbd> untuk kirim, <kbd className="font-mono rounded border bg-muted px-1">Shift+Enter</kbd> untuk baris baru
                                            </span>
                                        </div>

                                        <div className="flex gap-2">
                                            <Textarea
                                                value={data.message}
                                                onChange={(e) => setData('message', e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Ketik balasan langsung ke pengunjung... (Tekan Enter untuk kirim)"
                                                rows={2}
                                                className="resize-none rounded-xl text-xs sm:text-sm bg-background"
                                                autoFocus
                                            />
                                            <Button
                                                type="submit"
                                                disabled={!data.message.trim() || processing}
                                                className="h-auto px-4 rounded-xl cursor-pointer gap-2 shrink-0 self-end"
                                            >
                                                {processing ? <Spinner /> : <Send className="size-4" />}
                                                <span className="hidden sm:inline text-xs font-semibold">Kirim</span>
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Bot className="size-4 text-primary shrink-0" />
                                            <span>
                                                Percakapan ini dijawab otomatis oleh AI. Ingin membalas pengunjung langsung?
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleToggleTakeover(activeConversation)}
                                            className="gap-1.5 text-xs font-semibold rounded-lg cursor-pointer h-7.5 shrink-0"
                                        >
                                            <HandMetal className="size-3" />
                                            <span>Ambil Alih untuk Membalas</span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted-foreground">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/60 mb-3">
                                <MessageSquare className="size-8 opacity-40 text-primary" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">
                                Pilih Percakapan
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                                Pilih salah satu sesi percakapan pengunjung di sebelah kiri untuk melihat pesan atau mengambil alih interaksi langsung.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!convToDelete} onOpenChange={(open) => !open && setConvToDelete(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">Hapus Riwayat Percakapan?</DialogTitle>
                        <DialogDescription className="text-xs">
                            Seluruh pesan pada sesi <code className="font-mono text-xs">{convToDelete?.uuid}</code> akan dihapus secara permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConvToDelete(null)}
                            className="cursor-pointer text-xs"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteConfirm}
                            className="cursor-pointer text-xs"
                        >
                            Hapus Permanen
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
