import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Bot,
    Clock,
    CornerDownLeft,
    HandMetal,
    RotateCw,
    Send,
    Trash2,
    User,
    UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

interface Message {
    id: number;
    conversation_id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens_used: number;
    created_at: string;
}

interface Conversation {
    id: number;
    uuid: string;
    application_id: number;
    ip_address: string | null;
    user_agent: string | null;
    last_activity_at: string;
    is_taken_over: boolean;
    ended_reason?: 'user' | 'timeout' | 'admin' | null;
    ended_at?: string | null;
    taken_over_at: string | null;
    created_at: string;
    application?: {
        id: number;
        app_id: string;
        name: string;
        is_active: boolean;
    };
    taken_over_by?: {
        id: number;
        name: string;
        email: string;
    } | null;
    messages: Message[];
}

interface Props {
    conversation: Conversation;
}

export default function ConversationsShow({ conversation }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data, setData, post, processing, reset } = useForm({
        message: '',
    });

    const focusReplyTextarea = () => {
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 50);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [conversation.messages?.length]);

    // Polling setiap 3 detik untuk update chat secara live
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['conversation'] });
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const handleToggleTakeover = () => {
        if (conversation.is_taken_over) {
            router.post(`/admin/conversations/${conversation.uuid}/release-takeover`, {}, { preserveScroll: true });
        } else {
            router.post(`/admin/conversations/${conversation.uuid}/takeover`, {}, { preserveScroll: true });
        }
    };

    const handleSendReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.message.trim() || processing) return;

        post(`/admin/conversations/${conversation.uuid}/reply`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
            },
            onFinish: () => {
                focusReplyTextarea();
            },
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply(e);
        }
    };

    const handleDelete = () => {
        router.delete(`/admin/conversations/${conversation.uuid}`);
    };

    return (
        <>
            <Head title={`Percakapan ${conversation.uuid.substring(0, 8)} - Admin`} />

            <div className="flex h-[calc(100vh-4rem)] flex-1 flex-col overflow-hidden p-4 md:p-6 gap-4">
                {/* Header & Status Bar */}
                <div className="flex flex-col gap-3 rounded-2xl border border-sidebar-border/60 bg-sidebar/50 p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button variant="outline" size="icon" asChild className="size-9 rounded-xl shrink-0">
                            <Link href="/admin/conversations">
                                <ArrowLeft className="size-4" />
                            </Link>
                        </Button>

                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="font-mono text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                                    {conversation.uuid}
                                </h1>
                                {conversation.ended_reason ? (
                                    <Badge variant="secondary" className="gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30">
                                        <span>Chat Selesai</span>
                                    </Badge>
                                ) : conversation.is_taken_over ? (
                                    <Badge variant="secondary" className="gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                        <UserCheck className="size-3.5" />
                                        <span>Diambil Alih ({conversation.taken_over_by?.name || 'Admin'})</span>
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                        <Bot className="size-3.5" />
                                        <span>Ditangani AI</span>
                                    </Badge>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5 font-mono">
                                <span>Bot: <strong className="text-foreground font-sans">{conversation.application?.name}</strong></span>
                                <span>IP: {conversation.ip_address || 'Tidak tercatat'}</span>
                                <span>Pesan: {conversation.messages?.length || 0}</span>
                                <span>Aktivitas: {conversation.last_activity_at}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <Button
                            size="sm"
                            variant={conversation.is_taken_over ? 'secondary' : 'default'}
                            onClick={handleToggleTakeover}
                            className={`h-9 gap-1.5 text-xs font-semibold rounded-xl cursor-pointer shadow-xs ${
                                conversation.is_taken_over
                                    ? 'border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10'
                                    : 'bg-primary text-primary-foreground'
                            }`}
                        >
                            {conversation.is_taken_over ? (
                                <>
                                    <Bot className="size-4" />
                                    <span>Lepas ke AI</span>
                                </>
                            ) : (
                                <>
                                    <HandMetal className="size-4" />
                                    <span>Ambil Alih Percakapan</span>
                                </>
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsDeleting(true)}
                            className="size-9 rounded-xl text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Hapus Percakapan"
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Messages Stream Container */}
                <Card className="flex flex-1 flex-col overflow-hidden border border-border shadow-xs">
                    <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                        {conversation.messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground py-16">
                                <Bot className="size-8 opacity-40 mb-2" />
                                <p className="text-sm">Belum ada pesan pada sesi percakapan ini.</p>
                            </div>
                        ) : (
                            conversation.messages.map((msg) => {
                                if (msg.role === 'system') {
                                    return (
                                        <div key={msg.id} className="flex justify-center my-3">
                                            <span className="rounded-full bg-muted/80 px-3 py-1 text-[11px] font-medium text-muted-foreground border border-border">
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
                                        className={`flex gap-3 max-w-3xl ${
                                            isRight ? 'ml-auto flex-row-reverse' : 'mr-auto'
                                        }`}
                                    >
                                        <div
                                            className={`flex size-8 shrink-0 items-center justify-center rounded-xl shadow-xs text-xs font-semibold ${
                                                isRight
                                                    ? isAdmin
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-emerald-700 text-white dark:bg-emerald-800'
                                                    : 'bg-neutral-800 text-white dark:bg-neutral-700'
                                            }`}
                                        >
                                            {isAdmin ? <UserCheck className="size-4" /> : isAssistant ? <Bot className="size-4" /> : <User className="size-4" />}
                                        </div>

                                        <div className={`flex flex-col gap-1 min-w-0 ${isRight ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
                                                <span className="font-semibold text-foreground flex items-center gap-1">
                                                    {isAdmin ? 'Anda (Admin CS)' : isAssistant ? 'Asisten AI' : 'Pengunjung'}
                                                </span>
                                                <span className="flex items-center gap-1 font-mono text-[10px]">
                                                    <Clock className="size-2.5" />
                                                    {msg.created_at}
                                                </span>
                                            </div>

                                            <div
                                                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                                                    isRight
                                                        ? isAdmin
                                                            ? 'bg-emerald-600 text-white rounded-tr-xs'
                                                            : 'bg-emerald-700 text-white rounded-tr-xs dark:bg-emerald-800'
                                                        : 'bg-card text-foreground border border-border rounded-tl-xs'
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
                    </CardContent>

                    {/* Bottom Admin Control / Reply Box */}
                    <div className="border-t border-border bg-sidebar/30 p-3 sm:p-4 shrink-0">
                        {conversation.ended_reason ? (
                            <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 px-3 py-2.5 text-xs font-semibold text-sky-800 dark:text-sky-200 text-center">
                                {conversation.ended_reason === 'user'
                                    ? 'Chat Selesai — Diakhiri oleh pengunjung.'
                                    : conversation.ended_reason === 'admin'
                                        ? 'Chat Selesai — Ditandai selesai oleh Admin.'
                                        : 'Chat Selesai — Berakhir otomatis karena batas waktu.'}
                            </div>
                        ) : conversation.is_taken_over ? (
                            <form onSubmit={handleSendReply} className="flex flex-col gap-2.5">
                                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                    <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <UserCheck className="size-3.5" />
                                        Mode Live Support Admin Aktif (AI dinonaktifkan)
                                    </span>
                                    <span className="hidden sm:inline text-[11px]">
                                        Tekan <kbd className="font-mono rounded border bg-muted px-1">Enter</kbd> untuk mengirim, <kbd className="font-mono rounded border bg-muted px-1">Shift+Enter</kbd> untuk baris baru
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <Textarea
                                        ref={textareaRef}
                                        value={data.message}
                                        onChange={(e) => setData('message', e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ketik balasan Anda langsung ke pengunjung... (Tekan Enter untuk mengirim)"
                                        rows={2}
                                        readOnly={processing}
                                        className="resize-none rounded-xl"
                                        autoFocus
                                    />
                                    <Button
                                        type="submit"
                                        disabled={!data.message.trim() || processing}
                                        className="h-auto px-4 rounded-xl cursor-pointer gap-2 shrink-0 self-end"
                                    >
                                        {processing ? <Spinner /> : <Send className="size-4" />}
                                        <span className="hidden sm:inline">Kirim Balasan</span>
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 rounded-xl bg-muted/40 border border-border/60">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground text-center sm:text-left">
                                    <Bot className="size-4 text-primary shrink-0" />
                                    <span>
                                        Chatbot AI sedang menangani percakapan ini secara otomatis.
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleToggleTakeover}
                                    className="gap-1.5 text-xs font-semibold rounded-lg cursor-pointer h-8 shrink-0"
                                >
                                    <HandMetal className="size-3.5" />
                                    <span>Ambil Alih untuk Membalas</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Delete Dialog */}
            <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Hapus Percakapan Ini?</DialogTitle>
                        <DialogDescription className="text-sm">
                            Seluruh rekaman pesan pada sesi <code className="font-mono text-xs">{conversation.uuid}</code> akan dihapus secara permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDeleting(false)} className="cursor-pointer">
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} className="cursor-pointer">
                            Hapus Permanen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ConversationsShow.layout = {
    breadcrumbs: [
        {
            title: 'Conversations',
            href: '/admin/conversations',
        },
        {
            title: 'Detail Percakapan',
            href: '',
        },
    ],
};
