import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-hidden h-svh max-h-svh flex flex-col">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
