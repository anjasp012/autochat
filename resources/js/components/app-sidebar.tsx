import { Link } from '@inertiajs/react';
import {
    BookOpen,
    LayoutGrid,
    MessageSquare,
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
import type { NavItem } from '@/types';

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
];

export function AppSidebar() {
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
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter className="gap-2">
                <AppSwitcher />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
