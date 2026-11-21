import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    ArrowRight,
    Bot,
    Check,
    Clock,
    Code2,
    Copy,
    CreditCard,
    ExternalLink,
    Headphones,
    MessageSquare,
    Radio,
    Settings,
    Sparkles,
    UserCheck,
    Wallet,
    Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WidgetScriptDialog } from '@/components/widget-script-dialog';
import { dashboard } from '@/routes';

interface Props {
    stats: {
        total_conversations: number;
        waiting_count: number;
        taken_over_count: number;
        bot_handled_count: number;
        total_messages: number;
        unread_escalations: number;
        bot_resolution_rate: number;
    };
    recentEscalations: {
        id: number;
        conversation_uuid: string;
        user_identifier: string;
        type: string;
        title: string;
        message: string;
        is_read: boolean;
        created_at: string;
        created_at_time: string;
    }[];
    recentConversations: {
        id: number;
        uuid: string;
        user_identifier: string | null;
        is_waiting_admin: boolean;
        is_taken_over: boolean;
        taken_over_by_name: string | null;
        latest_message: string;
        last_activity_at: string;
        last_activity_time: string;
    }[];
    activeApp?: {
        id: number;
        app_id: string;
        name: string;
        model: string;
        is_active: boolean;
    } | null;
}

export default function Dashboard({
    stats,
    recentEscalations,
    recentConversations,
    activeApp,
}: Props) {
    const [copied, setCopied] = useState(false);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
    const appId = activeApp?.app_id || 'customer-support';
    const scriptCode = `<script src="${origin}/widget.js" data-app="${appId}" async></script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(scriptCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getEscalationIcon = (type: string) => {
        if (type.includes('withdraw')) {
            return <Wallet className="size-4 text-emerald-500" />;
        }
        if (type.includes('deposit')) {
            return <CreditCard className="size-4 text-amber-500" />;
        }
        return <Headphones className="size-4 text-indigo-500" />;
    };

    return (
        <>
            <Head title="Dashboard - Admin Console" />

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6 bg-background">
                {/* HERO BANNER */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-background p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="relative flex size-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    Sistem Live & Reverb Realtime Aktif
                                </span>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                                Command Center {activeApp?.name || 'Customer Support'}
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Kelola percakapan pengunjung, antrean pengecekan deposit/withdraw, dan integrasi bot secara terpusat.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button asChild size="sm" className="h-9 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-neutral-950 cursor-pointer shadow-xs gap-1.5">
                                <Link href="/conversations">
                                    <MessageSquare className="size-4" />
                                    <span>Buka Live Chat</span>
                                    <ArrowRight className="size-3.5" />
                                </Link>
                            </Button>

                            <WidgetScriptDialog appId={appId} appName={activeApp?.name} />
                        </div>
                    </div>
                </div>

                {/* 4 KPI METRIC CARDS */}
                <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
                    {/* CARD 1: Total Percakapan */}
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Total Percakapan</span>
                            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <MessageSquare className="size-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                                {stats.total_conversations}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                                {stats.total_messages} pesan
                            </span>
                        </div>
                    </div>

                    {/* CARD 2: Menunggu Admin CS */}
                    <Link
                        href="/conversations?status=waiting"
                        className="rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 p-4 shadow-2xs space-y-2 transition-colors cursor-pointer group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                <Clock className="size-3.5" />
                                <span>Menunggu CS</span>
                            </span>
                            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                <AlertCircle className="size-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                                {stats.waiting_count}
                            </span>
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 group-hover:underline flex items-center gap-0.5">
                                <span>Lihat Antrean</span>
                                <ArrowRight className="size-3" />
                            </span>
                        </div>
                    </Link>

                    {/* CARD 3: Diambil Alih Admin */}
                    <Link
                        href="/conversations?status=mine"
                        className="rounded-2xl border border-border bg-card hover:bg-muted/40 p-4 shadow-2xs space-y-2 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Live CS Diambil Alih</span>
                            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                                <UserCheck className="size-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                                {stats.taken_over_count}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium">
                                Agen Aktif
                            </span>
                        </div>
                    </Link>

                    {/* CARD 4: Otomasi AI */}
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Otomasi AI</span>
                            <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                                <Zap className="size-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                                {stats.bot_resolution_rate}%
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                                {stats.bot_handled_count} sesi bot
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2 COLUMN CONTENT */}
                <div className="grid gap-5 lg:grid-cols-12">
                    {/* LEFT COLUMN: PENGALIHAN BOT & ANTREAN CS (7 COLS) */}
                    <div className="lg:col-span-7 space-y-5">
                        {/* Antrean Pengalihan Bot Terbaru */}
                        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
                            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <Clock className="size-4 text-amber-500" />
                                    <h2 className="text-sm font-bold text-foreground">Antrean Pengecekan & Pengalihan CS</h2>
                                </div>
                                <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400">
                                    <Link href="/conversations?status=waiting">Lihat Semua</Link>
                                </Button>
                            </div>

                            <div className="divide-y divide-border/60">
                                {recentEscalations.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-xs">
                                        <Sparkles className="size-8 opacity-30 mx-auto mb-2" />
                                        <p className="font-semibold text-foreground">Tidak ada antrean pending</p>
                                        <p className="text-[11px] mt-0.5">Semua pengecekan depo/wd dan bantuan CS telah tertangani.</p>
                                    </div>
                                ) : (
                                    recentEscalations.map((item) => (
                                        <div key={item.id} className="p-4 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-2xs mt-0.5">
                                                    {getEscalationIcon(item.type)}
                                                </div>
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-foreground truncate">
                                                            {item.title}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {item.created_at_time || item.created_at}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 leading-snug">
                                                        {item.message}
                                                    </p>
                                                    <p className="text-[11px] font-mono text-muted-foreground">
                                                        User: <strong className="text-foreground">{item.user_identifier}</strong>
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                asChild
                                                size="sm"
                                                className="h-7 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 shadow-2xs shrink-0 cursor-pointer"
                                            >
                                                <Link href={`/conversations/${item.conversation_uuid}`}>
                                                    <span>Ambil Alih</span>
                                                </Link>
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Percakapan Terbaru */}
                        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
                            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="size-4 text-primary" />
                                    <h2 className="text-sm font-bold text-foreground">Percakapan Pengunjung Terbaru</h2>
                                </div>
                                <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-semibold">
                                    <Link href="/conversations">Lihat Semua</Link>
                                </Button>
                            </div>

                            <div className="divide-y divide-border/60">
                                {recentConversations.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-xs">
                                        <p>Belum ada riwayat percakapan.</p>
                                    </div>
                                ) : (
                                    recentConversations.map((conv) => (
                                        <Link
                                            key={conv.id}
                                            href={`/conversations/${conv.uuid}`}
                                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer group"
                                        >
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-foreground truncate group-hover:text-primary">
                                                        {conv.user_identifier ? (
                                                            <span>{conv.user_identifier}</span>
                                                        ) : (
                                                            <span className="font-mono text-[11px] opacity-75">{conv.uuid.substring(0, 14)}...</span>
                                                        )}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {conv.last_activity_time || conv.last_activity_at}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {conv.latest_message}
                                                </p>
                                            </div>

                                            <div>
                                                {conv.is_waiting_admin ? (
                                                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                                                        Menunggu CS
                                                    </Badge>
                                                ) : conv.is_taken_over ? (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        {conv.taken_over_by_name || 'Diambil Alih'}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] text-emerald-600">
                                                        Mode Bot
                                                    </Badge>
                                                )}
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: WIDGET EMBED & SYSTEM HEALTH (5 COLS) */}
                    <div className="lg:col-span-5 space-y-5">
                        {/* WIDGET FLOATING EMBED CARD */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-3.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Code2 className="size-4 text-amber-500" />
                                    <h2 className="text-sm font-bold text-foreground">Pasang Widget di Web Lain</h2>
                                </div>
                                <WidgetScriptDialog appId={appId} appName={activeApp?.name} />
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Salin script di bawah ini lalu tempelkan sebelum tag <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">&lt;/body&gt;</code> di website atau landing page Anda. Chatbot akan otomatis muncul sebagai floating button di kanan bawah.
                            </p>

                            <div className="relative rounded-xl bg-neutral-950 p-3 text-xs font-mono text-emerald-400 overflow-x-auto border border-neutral-800">
                                <pre className="leading-snug select-all">{scriptCode}</pre>
                                <Button
                                    size="sm"
                                    onClick={handleCopy}
                                    className={`mt-2.5 w-full h-8 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs gap-1.5 ${
                                        copied
                                            ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                                            : 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
                                    }`}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="size-3.5" />
                                            <span>Script Berhasil Disalin!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="size-3.5" />
                                            <span>Salin Script Widget</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* SYSTEM HEALTH & BOT SETTINGS */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="size-4 text-emerald-500" />
                                    <h2 className="text-sm font-bold text-foreground">Status Bot & Engine</h2>
                                </div>
                                <Button asChild variant="outline" size="sm" className="h-7 text-xs font-semibold rounded-lg gap-1">
                                    <Link href="/setting">
                                        <Settings className="size-3" />
                                        <span>Pengaturan</span>
                                    </Link>
                                </Button>
                            </div>

                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                                    <span className="text-muted-foreground">Model AI:</span>
                                    <span className="font-mono font-bold text-foreground uppercase">{activeApp?.model || 'gpt-4o-mini'}</span>
                                </div>

                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                                    <span className="text-muted-foreground">Broadcast Reverb:</span>
                                    <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                                        <Radio className="size-3 animate-pulse" />
                                        Realtime Connected
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                                    <span className="text-muted-foreground">Sesi Percakapan:</span>
                                    <span className="font-semibold text-foreground">10 Menit Auto-Timeout</span>
                                </div>

                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                                    <span className="text-muted-foreground">Link Akses Chat:</span>
                                    <a
                                        href={`${origin}/${appId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono font-semibold text-amber-600 hover:underline flex items-center gap-1"
                                    >
                                        <span>/{appId}</span>
                                        <ExternalLink className="size-2.5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
