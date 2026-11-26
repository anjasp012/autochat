import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { echo } from '@/echo';
import { useFaviconBadge } from '@/hooks/use-favicon-badge';
import { playNotificationChime, unlockNotificationAudio } from '@/lib/notification-sound';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const pageProps = usePage().props as Record<string, any>;
    const propTotalCount = Number(
        pageProps.chatNotifications?.total_notifications ?? pageProps.escalations?.unread_count ?? 0,
    );
    const [faviconBadgeCount, setFaviconBadgeCount] = useState<number>(propTotalCount);
    const prevBadgeCountRef = useRef<number>(propTotalCount);
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        prevBadgeCountRef.current = propTotalCount;
        setFaviconBadgeCount(propTotalCount);
    }, [propTotalCount]);

    const syncUnreadNotifications = async (allowSound = false) => {
        try {
            const res = await fetch('/admin/notifications', {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) return;
            const data = await res.json();
            const counts = data.chat_notifications;
            const nextCount =
                counts && typeof counts.total_notifications === 'number'
                    ? counts.total_notifications
                    : typeof data.unread_count === 'number'
                      ? data.unread_count
                      : null;

            if (nextCount !== null) {
                if (allowSound && nextCount > prevBadgeCountRef.current) {
                    playNotificationChime();
                }
                prevBadgeCountRef.current = nextCount;
                setFaviconBadgeCount(nextCount);
                if (counts) {
                    window.dispatchEvent(new CustomEvent('autochat:notifications-updated', { detail: counts }));
                }
            }
        } catch {
            // Silent ignore on transient network error
        }
    };

    const scheduleSync = (withSound = false) => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
            syncUnreadNotifications(withSound);
        }, 250);
    };

    useEffect(() => {
        const handleFirstGesture = () => {
            unlockNotificationAudio();
        };
        window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
        window.addEventListener('keydown', handleFirstGesture, { passive: true });

        const handleCustomUpdate = (event: Event) => {
            const detail = (event as CustomEvent)?.detail;
            if (detail && typeof detail.total_notifications === 'number') {
                prevBadgeCountRef.current = detail.total_notifications;
                setFaviconBadgeCount(detail.total_notifications);
            }
        };

        const handleIncomingMessage = (event: any) => {
            if (event?.role === 'user') {
                playNotificationChime();
            }
            scheduleSync(event?.role === 'user');
        };

        const handleEscalation = () => {
            playNotificationChime();
            scheduleSync(true);
        };

        window.addEventListener('autochat:notifications-updated', handleCustomUpdate);

        const convChannel = echo.channel('conversations');
        convChannel.listen('.MessageSent', handleIncomingMessage);
        convChannel.listen('MessageSent', handleIncomingMessage);

        const notifChannel = echo.channel('admin.notifications');
        notifChannel.listen('.BotEscalationCreated', handleEscalation);
        notifChannel.listen('BotEscalationCreated', handleEscalation);

        const pollInterval = setInterval(() => {
            syncUnreadNotifications(true);
        }, 12000);

        return () => {
            window.removeEventListener('pointerdown', handleFirstGesture);
            window.removeEventListener('keydown', handleFirstGesture);
            window.removeEventListener('autochat:notifications-updated', handleCustomUpdate);
            convChannel.stopListening('.MessageSent');
            convChannel.stopListening('MessageSent');
            notifChannel.stopListening('.BotEscalationCreated');
            notifChannel.stopListening('BotEscalationCreated');
            clearInterval(pollInterval);
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, []);

    // Render badge angka notifikasi chat langsung di favicon tab browser
    useFaviconBadge(faviconBadgeCount);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </AppLayoutTemplate>
    );
}
