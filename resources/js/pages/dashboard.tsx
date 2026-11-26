import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Bot,
    Clock,
    CreditCard,
    ExternalLink,
    Headphones,
    MessageSquare,
    Plus,
    Radio,
    ShieldAlert,
    Sparkles,
    Users,
    Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WidgetScriptDialog } from '@/components/widget-script-dialog';
import { dashboard } from '@/routes';

interface ChartPoint {
    day: string;
    date: string;
    is_today: boolean;
    count: number;
}

interface Props {
    realtime: {
        customers_online: number;
        ongoing_chats: number;
        logged_in_agents: number;
        total_agents: number;
    };
    weekly: {
        total_chats: number;
        previous_period_chats: number;
        diff: number;
        chart_all: ChartPoint[];
        chart_mine: ChartPoint[];
        queued_visitors: number;
        chat_satisfaction: number;
        chat_satisfaction_diff: string;
        total_messages: number;
        avg_response_time: string;
    };
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
        ended_reason?: 'user' | 'timeout' | 'admin' | null;
        ended_at?: string | null;
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
    realtime,
    weekly,
    stats,
    recentEscalations,
    recentConversations,
    activeApp,
}: Props) {
    const [agentMode, setAgentMode] = useState<'all' | 'mine'>('all');
    const [hoveredBar, setHoveredBar] = useState<ChartPoint | null>(null);

    const activeChart = agentMode === 'all' ? weekly.chart_all : weekly.chart_mine;
    const totalWeeklyCount = activeChart.reduce((acc, curr) => acc + curr.count, 0);

    // Calculate maximum Y-axis value for clean scale
    const rawMax = Math.max(...activeChart.map((c) => c.count), 10);
    const chartMax = Math.ceil(rawMax / 50) * 50 || 100;
    const yTicks = [chartMax, Math.round((chartMax * 2) / 3), Math.round(chartMax / 3), 0];

    const appId = activeApp?.app_id || 'customer-support';

    const cleanEscalationMessage = (text: string) => {
        if (!text) return '';
        return text
            .replace(/\*\*/g, '')
            .replace(/^[📋\s]*/g, '')
            .replace(/Formulir\s+(Deposit|Withdraw)\s+Status:?/gi, '')
            .replace(/\n+/g, ' · ')
            .replace(/·\s*·/g, '·')
            .trim();
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
            <Head title="Livechat Analytics & Dashboard" />

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 bg-background">
                {/* TOP HEADER & ACTIONS */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                                Dashboard Livechat
                            </h1>
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                                <Bot className="size-3.5" />
                                <span>{activeApp?.name || 'Customer Support AI'}</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Pemantauan aktivitas pengunjung, antrean chat operator, dan analitik performa asisten AI secara real-time.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button asChild size="sm" className="h-9 px-3.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-neutral-950 cursor-pointer shadow-xs gap-1.5">
                            <Link href="/conversations">
                                <MessageSquare className="size-3.5" />
                                <span>Buka Live Chat</span>
                                <ArrowRight className="size-3" />
                            </Link>
                        </Button>

                        <WidgetScriptDialog appId={appId} appName={activeApp?.name} />
                    </div>
                </div>

                {/* SECTION 1: REAL TIME OVERVIEW (Matching Screenshot Top 3 Cards) */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Real time overview
                    </h2>

                    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-3">
                        {/* CARD 1: Customers online */}
                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs hover:border-border transition-colors">
                            <span className="text-xs font-semibold text-muted-foreground block mb-2">
                                Customers online
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                                    {realtime.customers_online}
                                </span>
                                {realtime.customers_online > 0 && (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                                        <Radio className="size-2.5 animate-pulse text-emerald-500" />
                                        <span>Aktif</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* CARD 2: Ongoing chats */}
                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs hover:border-border transition-colors">
                            <span className="text-xs font-semibold text-muted-foreground block mb-2">
                                Ongoing chats
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                                    {realtime.ongoing_chats}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    percakapan
                                </span>
                            </div>
                        </div>

                        {/* CARD 3: Logged in agents */}
                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs hover:border-border transition-colors">
                            <span className="text-xs font-semibold text-muted-foreground block mb-2">
                                Logged in agents
                            </span>
                            <div className="flex items-baseline">
                                <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                                    {realtime.logged_in_agents}
                                </span>
                                <span className="text-sm font-semibold text-muted-foreground ml-1.5">
                                    of {realtime.total_agents}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: LAST 7 DAYS ANALYTICS (Matching Screenshot Main Dark Card) */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Last 7 days
                    </h2>

                    <div className="rounded-2xl border border-border/80 bg-[#141417] dark:bg-[#111215] p-5 sm:p-6 shadow-sm space-y-6">
                        {/* CARD HEADER */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground">
                                    Total chats
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                                        {agentMode === 'all' ? weekly.total_chats : totalWeeklyCount}
                                    </span>

                                    {/* DIFF BADGE */}
                                    {weekly.diff >= 0 ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                            +{weekly.diff} from previous 7 days
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                                            {weekly.diff} from previous 7 days
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* TOGGLE: MY STATS vs ALL AGENTS */}
                            <div className="inline-flex items-center rounded-xl bg-black/40 border border-white/10 p-1 self-start sm:self-center">
                                <button
                                    type="button"
                                    onClick={() => setAgentMode('mine')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        agentMode === 'mine'
                                            ? 'bg-zinc-800 text-white shadow-xs'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    My stats
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAgentMode('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        agentMode === 'all'
                                            ? 'bg-zinc-800 text-white shadow-xs'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    All agents
                                </button>
                            </div>
                        </div>

                        {/* WEEKLY BAR CHART (Mon - Sun) */}
                        <div className="relative pt-6 pb-2">
                            {/* Y-AXIS TICKS & GRID LINES */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                                {yTicks.map((tick, idx) => (
                                    <div key={idx} className="flex items-center w-full">
                                        <span className="w-8 text-[11px] font-mono font-medium text-zinc-500 text-right pr-2 shrink-0">
                                            {tick}
                                        </span>
                                        <div className="w-full border-b border-zinc-800/80" />
                                    </div>
                                ))}
                            </div>

                            {/* BARS CONTAINER */}
                            <div className="relative flex items-end justify-between pl-10 pr-2 h-44 sm:h-52 gap-2 sm:gap-6 z-10">
                                {activeChart.map((item, idx) => {
                                    const heightPct = Math.min(100, Math.max(item.count > 0 ? (item.count / chartMax) * 100 : 4, 3));
                                    const isHovered = hoveredBar?.day === item.day;

                                    return (
                                        <div
                                            key={idx}
                                            className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                                            onMouseEnter={() => setHoveredBar(item)}
                                            onMouseLeave={() => setHoveredBar(null)}
                                        >
                                            {/* HOVER TOOLTIP */}
                                            {isHovered && (
                                                <div className="absolute -top-7 bg-zinc-900 border border-zinc-700 text-white px-2 py-0.5 rounded-md text-[11px] font-mono shadow-md whitespace-nowrap z-20 pointer-events-none animate-in fade-in-50">
                                                    <strong>{item.count}</strong> chats ({item.date})
                                                </div>
                                            )}

                                            {/* BAR PILL */}
                                            <div
                                                className={`w-full max-w-[56px] rounded-t-md transition-all duration-200 ${
                                                    item.count > 0
                                                        ? 'bg-[#0084ff] hover:bg-[#2094ff] shadow-sm'
                                                        : 'bg-zinc-800/60'
                                                }`}
                                                style={{ height: `${heightPct}%` }}
                                            />

                                            {/* DAY LABEL */}
                                            <div className="pt-2 text-center">
                                                <span
                                                    className={`text-xs font-semibold block transition-colors ${
                                                        item.is_today
                                                            ? 'text-white font-bold'
                                                            : 'text-zinc-500 group-hover:text-zinc-300'
                                                    }`}
                                                >
                                                    {item.day}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: RECENT ACTIVITY & ESCALATIONS */}
                <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
                    {/* LEFT: ESKALASI DEPOSIT / WITHDRAW */}
                    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <AlertCircle className="size-4" />
                                </div>
                                <h3 className="font-bold text-sm text-foreground">
                                    Eskalasi Deposit / Withdraw
                                </h3>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground">
                                <Link href="/conversations?status=waiting">
                                    Lihat Semua
                                </Link>
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {recentEscalations.length === 0 ? (
                                <div className="text-center py-6 text-xs text-muted-foreground italic">
                                    Tidak ada eskalasi pending saat ini.
                                </div>
                            ) : (
                                recentEscalations.map((esc) => (
                                    <Link
                                        key={esc.id}
                                        href={`/conversations/${esc.conversation_uuid}`}
                                        className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors cursor-pointer block"
                                    >
                                        <div className="shrink-0 mt-0.5">
                                            {getEscalationIcon(esc.type)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-foreground truncate">
                                                    {esc.title || esc.user_identifier}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground shrink-0">
                                                    {esc.created_at_time}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                                {cleanEscalationMessage(esc.message)}
                                            </p>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT: PERCAKAPAN TERBARU */}
                    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <MessageSquare className="size-4" />
                                </div>
                                <h3 className="font-bold text-sm text-foreground">
                                    Percakapan Pengunjung Terbaru
                                </h3>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground">
                                <Link href="/conversations">
                                    Ke Live Chat
                                </Link>
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {recentConversations.length === 0 ? (
                                <div className="text-center py-6 text-xs text-muted-foreground italic">
                                    Belum ada sesi percakapan pengunjung.
                                </div>
                            ) : (
                                recentConversations.map((conv) => (
                                    <Link
                                        key={conv.id}
                                        href={`/conversations/${conv.uuid}`}
                                        className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors cursor-pointer block"
                                    >
                                        <div className="min-w-0 flex-1 mr-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-foreground truncate">
                                                    {conv.user_identifier || `Pengunjung #${conv.id}`}
                                                </span>
                                                {conv.ended_reason && (
                                                    <span className="text-[9px] font-bold text-sky-700 dark:text-sky-300 bg-sky-500/15 px-1.5 py-0.2 rounded">
                                                        Chat Selesai
                                                    </span>
                                                )}
                                                {!conv.ended_reason && conv.is_waiting_admin && (
                                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-500/15 px-1.5 py-0.2 rounded">
                                                        Menunggu CS
                                                    </span>
                                                )}
                                                {!conv.ended_reason && conv.is_taken_over && (
                                                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-500/15 px-1.5 py-0.2 rounded">
                                                        {conv.taken_over_by_name || 'Admin CS'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                                {conv.latest_message}
                                            </p>
                                        </div>

                                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                            {conv.last_activity_time || conv.last_activity_at}
                                        </span>
                                    </Link>
                                ))
                            )}
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
