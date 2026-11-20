import { type ReactNode } from 'react';
import { Bot, Moon, Plus, Sparkles, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';

interface PublicChatLayoutProps {
    appName?: string;
    appDescription?: string;
    isActive?: boolean;
    onNewChat?: () => void;
    isNewChatLoading?: boolean;
    children: ReactNode;
}

export default function PublicChatLayout({
    appName = 'AI Assistant',
    appDescription,
    isActive = true,
    onNewChat,
    isNewChatLoading = false,
    children,
}: PublicChatLayoutProps) {
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const toggleTheme = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className="flex h-dvh w-full flex-col bg-background text-foreground overflow-hidden">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-md sm:px-6">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                        <Bot className="size-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
                                {appName}
                            </h1>
                            {isActive ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Online
                                </span>
                            ) : (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                    Offline
                                </Badge>
                            )}
                        </div>
                        {appDescription && (
                            <p className="truncate text-xs text-muted-foreground hidden sm:block">
                                {appDescription}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onNewChat && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onNewChat}
                            disabled={isNewChatLoading}
                            className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
                        >
                            <Plus className="size-3.5" />
                            <span className="hidden sm:inline">Chat Baru</span>
                            <span className="sm:hidden">Baru</span>
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                        className="size-8 cursor-pointer rounded-lg text-muted-foreground hover:text-foreground"
                    >
                        {resolvedAppearance === 'dark' ? (
                            <Sun className="size-4" />
                        ) : (
                            <Moon className="size-4" />
                        )}
                    </Button>
                </div>
            </header>

            {/* Main Chat Area */}
            <main className="flex-1 overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}
