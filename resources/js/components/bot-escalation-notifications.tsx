import React, { useEffect, useState, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Bell,
    CheckCheck,
    CreditCard,
    Headphones,
    ArrowRight,
    Wallet,
    Sparkles,
} from 'lucide-react';
import { echo } from '@/echo';
import { Button } from '@/components/ui/button';

interface EscalationItem {
    id: number;
    application_name: string;
    application_app_id?: string;
    conversation_uuid: string;
    user_identifier: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    is_resolved?: boolean;
    created_at: string;
    created_at_time?: string;
}

export function BotEscalationNotifications() {
    const pageProps = usePage().props as Record<string, any>;
    const initialEscalations = pageProps.escalations as
        | { unread_count: number; recent: EscalationItem[] }
        | undefined;

    const [notifications, setNotifications] = useState<EscalationItem[]>(
        initialEscalations?.recent || []
    );
    const [unreadCount, setUnreadCount] = useState<number>(
        initialEscalations?.unread_count || 0
    );
    const [isOpen, setIsOpen] = useState(false);
    const [hasNewAlert, setHasNewAlert] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Play subtle chime sound when escalation arrives
    const playNotificationSound = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {
            // AudioContext might be blocked until user gesture, ignore safely
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Listen to Laravel Reverb realtime notifications
    useEffect(() => {
        const channel = echo.channel('admin.notifications');

        const handleNewEscalation = (event: any) => {
            playNotificationSound();
            setHasNewAlert(true);
            setTimeout(() => setHasNewAlert(false), 3000);

            const newNotif: EscalationItem = {
                id: event.id,
                application_name: event.application_name || 'Chatbot',
                application_app_id: event.application_app_id,
                conversation_uuid: event.conversation_uuid,
                user_identifier: event.user_identifier || 'Pengunjung',
                type: event.type,
                title: event.title,
                message: event.message,
                is_read: false,
                created_at: event.created_at || 'Baru saja',
                created_at_time: event.created_at_time,
            };

            setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== event.id)]);
            setUnreadCount((prev) => (event.unread_count !== undefined ? event.unread_count : prev + 1));
        };

        channel.listen('.BotEscalationCreated', handleNewEscalation);
        channel.listen('BotEscalationCreated', handleNewEscalation);

        return () => {
            channel.stopListening('.BotEscalationCreated');
            channel.stopListening('BotEscalationCreated');
        };
    }, []);

    const handleMarkAsRead = async (notif: EscalationItem) => {
        if (notif.is_read) return;

        try {
            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            await fetch(`/admin/notifications/${notif.id}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token || '',
                },
            });

            setNotifications((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (e) {
            console.error('Failed to mark notification as read', e);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            await fetch('/admin/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token || '',
                },
            });

            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (e) {
            console.error('Failed to mark all as read', e);
        }
    };

    const handleTakeover = (notif: EscalationItem) => {
        handleMarkAsRead(notif);
        setIsOpen(false);
        // Navigate to conversations page and highlight or search for this conversation
        router.visit(`/conversations?status=waiting&search=${notif.conversation_uuid}`);
    };

    const getIcon = (type: string) => {
        if (type.includes('withdraw')) {
            return <Wallet className="size-4 text-emerald-500" />;
        }
        if (type.includes('deposit')) {
            return <CreditCard className="size-4 text-amber-500" />;
        }
        return <Headphones className="size-4 text-indigo-500" />;
    };

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`relative flex size-8 items-center justify-center rounded-xl border border-sidebar-border bg-background hover:bg-sidebar-accent transition-all cursor-pointer ${
                    hasNewAlert ? 'ring-2 ring-amber-500 scale-105' : ''
                }`}
                title="Notifikasi Pengalihan Bot & Bantuan"
            >
                <Bell className={`size-4 text-foreground ${hasNewAlert ? 'animate-bounce' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-xs animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-popover shadow-xl z-50 overflow-hidden text-popover-foreground animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">Notifikasi Pengalihan Bot</span>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                    {unreadCount} baru
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <CheckCheck className="size-3.5" />
                                <span>Tandai Dibaca</span>
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <Sparkles className="size-8 opacity-30 mb-2" />
                                <p className="text-xs font-medium">Tidak ada notifikasi baru</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Ketika bot mengalihkan chat pengunjung ke admin (cek depo/wd), notifikasi akan muncul di sini.
                                </p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-3.5 transition-colors hover:bg-muted/50 ${
                                        !notif.is_read ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-2xs">
                                            {getIcon(notif.type)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <span className="text-xs font-bold truncate text-foreground">
                                                    {notif.title}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                                    {notif.created_at_time || notif.created_at}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mb-2 whitespace-pre-line">
                                                {notif.message}
                                            </p>

                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-mono text-muted-foreground truncate">
                                                    User: <strong className="text-foreground">{notif.user_identifier}</strong>
                                                </span>

                                                <Button
                                                    size="sm"
                                                    onClick={() => handleTakeover(notif)}
                                                    className="h-6 px-2.5 rounded-lg text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 cursor-pointer shadow-2xs gap-1"
                                                >
                                                    <span>Ambil Alih Chat</span>
                                                    <ArrowRight className="size-2.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
