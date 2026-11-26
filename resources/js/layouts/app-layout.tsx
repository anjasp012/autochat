import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { echo } from '@/echo';
import { useFaviconBadge } from '@/hooks/use-favicon-badge';
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
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setFaviconBadgeCount(propTotalCount);
    }, [propTotalCount]);

    const syncUnreadNotifications = async () => {
        try {
            const res = await fetch('/admin/notifications', {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) return;
            const data = await res.json();
            const counts = data.chat_notifications;
            if (counts && typeof counts.total_notifications === 'number') {
                setFaviconBadgeCount(counts.total_notifications);
                window.dispatchEvent(new CustomEvent('autochat:notifications-updated', { detail: counts }));
            } else if (typeof data.unread_count === 'number') {
                setFaviconBadgeCount(data.unread_count);
            }
        } catch {
            // Silent ignore on transient network error
        }
    };

    const scheduleSync = () => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
            syncUnreadNotifications();
        }, 250);
    };

    useEffect(() => {
        const handleCustomUpdate = (event: Event) => {
            const detail = (event as CustomEvent)?.detail;
            if (detail && typeof detail.total_notifications === 'number') {
                setFaviconBadgeCount(detail.total_notifications);
            }
        };

        window.addEventListener('autochat:notifications-updated', handleCustomUpdate);

        const convChannel = echo.channel('conversations');
        convChannel.listen('.MessageSent', scheduleSync);
        convChannel.listen('MessageSent', scheduleSync);

        const notifChannel = echo.channel('admin.notifications');
        notifChannel.listen('.BotEscalationCreated', scheduleSync);
        notifChannel.listen('BotEscalationCreated', scheduleSync);

        const pollInterval = setInterval(() => {
            syncUnreadNotifications();
        }, 20000);

        return () => {
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
