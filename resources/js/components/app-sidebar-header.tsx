import { Link, usePage } from '@inertiajs/react';
import { Bot, ExternalLink, Settings2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { ApplicationSummary } from '@/types/application';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { currentAppId, applications = [] } = usePage().props;
    const currentApp = applications.find(
        (app: ApplicationSummary) => app.app_id === currentAppId
    ) || applications[0];

    const chatUrl = currentApp ? `/${currentApp.app_id}` : '/chat';

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-2">
                {currentApp && (
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hidden sm:flex cursor-pointer"
                        title="Pengaturan Prompt & Identitas Bot Ini"
                    >
                        <Link href={`/admin/applications/${currentApp.id}/edit`}>
                            <Settings2 className="size-3.5" />
                            <span>Pengaturan Bot</span>
                        </Link>
                    </Button>
                )}

                <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="h-8 gap-1.5 text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
                >
                    <a
                        href={chatUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Bot className="size-3.5" />
                        <span>Tes Chatbot</span>
                        <ExternalLink className="size-3 opacity-70" />
                    </a>
                </Button>
            </div>
        </header>
    );
}
