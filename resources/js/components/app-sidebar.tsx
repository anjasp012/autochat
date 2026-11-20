import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Bot,
    ExternalLink,
    LayoutGrid,
    MessageSquare,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { AppSwitcher } from '@/components/app-switcher';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Button } from '@/components/ui/button';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ApplicationSummary } from '@/types/application';
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
    const { currentAppId, applications = [] } = usePage().props;
    const { state } = useSidebar();

    const currentApp = applications.find(
        (app: ApplicationSummary) => app.app_id === currentAppId
    ) || applications[0];

    const chatUrl = currentApp ? `/${currentApp.app_id}` : '/chat';

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
                {/* Button to test active chatbot at domain/slug */}
                {state === 'collapsed' ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className="size-8 rounded-lg border-primary/25 bg-primary/5 text-primary hover:bg-primary/10"
                            >
                                <a
                                    href={chatUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Bot className="size-4" />
                                </a>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            Tes Chatbot ({currentApp?.app_id ?? 'chat'})
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full justify-start gap-2 text-xs font-semibold border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary transition-colors rounded-xl shadow-2xs h-9 cursor-pointer"
                    >
                        <a
                            href={chatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center w-full"
                        >
                            <div className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <Bot className="size-3.5" />
                            </div>
                            <span className="truncate">Tes Chatbot</span>
                            <span className="truncate text-[10px] text-muted-foreground font-mono">
                                /{currentApp?.app_id ?? 'chat'}
                            </span>
                            <ExternalLink className="ml-auto size-3 opacity-60 shrink-0" />
                        </a>
                    </Button>
                )}

                <AppSwitcher />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
