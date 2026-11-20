import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
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
    const { currentAppId, allApplications, applications } = usePage().props as Record<string, any>;

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
            title: 'Knowledge Base',
            href: '/admin/knowledge-base',
            icon: BookOpen,
        },
        {
            title: 'Conversations',
            href: '/admin/conversations',
            icon: MessageSquare,
        },
        {
            title: 'Pengaturan Bot',
            href: currentApp ? `/admin/applications/${currentApp.id}/edit` : '/admin/applications',
            icon: Settings2,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Dropdown Ganti-Ganti Aplikasi diletakkan di atas sebelum menu utama */}
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
