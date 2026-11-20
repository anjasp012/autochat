import { Link, router, usePage } from '@inertiajs/react';
import {
    Bot,
    Check,
    ChevronsUpDown,
    Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ApplicationSummary } from '@/types/application';

export function AppSwitcher() {
    const { allApplications, applications, currentAppId } = usePage().props as Record<string, any>;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

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

    const handleSwitchApp = (appId: string) => {
        if (appId === currentAppId) return;

        router.post(
            '/applications/switch-current',
            { app_id: appId },
            { preserveScroll: true }
        );
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer rounded-lg hover:bg-sidebar-accent/50 p-2 transition-colors border-0 shadow-none bg-transparent"
                        >
                            <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                                <Bot className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="truncate font-semibold text-foreground text-sm tracking-tight">
                                        {currentApp?.name || 'Pilih Aplikasi'}
                                    </span>
                                </div>
                                <span className="truncate text-xs text-muted-foreground">
                                    {currentApp ? currentApp.app_id : 'Belum ada aplikasi'}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-xl p-1.5 shadow-lg"
                        align="start"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'right'
                                  : 'bottom'
                        }
                    >
                        <DropdownMenuLabel className="flex items-center justify-between text-[11px] font-medium text-muted-foreground px-2 py-1.5">
                            <span>Pilih Aplikasi Chatbot</span>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                {appList.length}
                            </Badge>
                        </DropdownMenuLabel>

                        <DropdownMenuGroup className="max-h-56 overflow-y-auto space-y-0.5">
                            {appList.length === 0 ? (
                                <div className="p-3 text-center text-xs text-muted-foreground">
                                    Belum ada aplikasi terdaftar.
                                </div>
                            ) : (
                                appList.map((app: ApplicationSummary) => (
                                    <DropdownMenuItem
                                        key={app.id}
                                        onClick={() => handleSwitchApp(app.app_id)}
                                        className="flex items-center justify-between cursor-pointer rounded-lg px-2 py-2 text-xs"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-medium ${
                                                    app.app_id === currentApp?.app_id
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                <Bot className="size-3.5" />
                                            </div>
                                            <div className="flex flex-col min-w-0 text-left">
                                                <span className="truncate font-medium text-foreground">
                                                    {app.name}
                                                </span>
                                                <span className="truncate text-[10px] text-muted-foreground">
                                                    {app.app_id}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                            {app.app_id === currentApp?.app_id && (
                                                <Check className="size-3.5 text-primary" />
                                            )}
                                        </div>
                                    </DropdownMenuItem>
                                ))
                            )}
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator className="my-1" />

                        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2 py-1.5 text-xs">
                            <Link href="/applications/create" className="flex items-center gap-2 text-foreground font-medium">
                                <div className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                                    <Plus className="size-3.5" />
                                </div>
                                <span>Tambah Aplikasi Baru</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
