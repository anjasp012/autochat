import { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    MessageSquare,
    Settings2,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { AppSwitcher } from '@/components/app-switcher';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { ApplicationSummary } from '@/types/application';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { currentAppId, allApplications, applications, auth, chatNotifications, escalations } = usePage().props as Record<string, any>;
    const initialBadgeCount = chatNotifications?.total_notifications ?? escalations?.unread_count ?? 0;
    const [chatBadgeCount, setChatBadgeCount] = useState<number>(initialBadgeCount);

    useEffect(() => {
        setChatBadgeCount(chatNotifications?.total_notifications ?? escalations?.unread_count ?? 0);
    }, [chatNotifications?.total_notifications, escalations?.unread_count]);

    useEffect(() => {
        const handleNotifUpdate = (event: Event) => {
            const detail = (event as CustomEvent)?.detail;
            if (detail && typeof detail.total_notifications === 'number') {
                setChatBadgeCount(detail.total_notifications);
            }
        };
        window.addEventListener('autochat:notifications-updated', handleNotifUpdate);
        return () => window.removeEventListener('autochat:notifications-updated', handleNotifUpdate);
    }, []);

    const user = auth?.user;
    const isSuperAdmin =
        user?.role === 'admin' ||
        user?.role === 'super_admin' ||
        (user?.is_admin && !user?.role);

    const appList: ApplicationSummary[] = Array.isArray(allApplications)
        ? allApplications
        : Array.isArray(applications)
          ? applications
          : Array.isArray(applications?.data)
            ? applications.data
            : [];

    const currentApp = appList.find(
        (app: ApplicationSummary) => app.app_id === currentAppId
    ) || appList[0];

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Conversations',
            href: '/conversations',
            icon: MessageSquare,
            badge: chatBadgeCount,
        },
        ...(isSuperAdmin
            ? [
                  {
                      title: 'Pengaturan Bot',
                      href: '/setting',
                      icon: Settings2,
                  },
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                {/* Switcher aplikasi di paling atas sebagai Navbrand */}
                <AppSwitcher />
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter className="gap-2">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
