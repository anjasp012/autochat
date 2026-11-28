import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2.5 font-medium group cursor-pointer"
                        >
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden drop-shadow-md transition-transform group-hover:scale-105">
                                <img
                                    src="/favicon.png?v=20261128b"
                                    alt="AutoChat"
                                    className="size-16 object-cover"
                                />
                            </div>
                            <div className="flex items-center gap-0.5 text-2xl font-black tracking-tight text-foreground">
                                <span>Auto</span>
                                <span className="text-amber-500">Chat</span>
                            </div>
                        </Link>

                        <div className="space-y-1.5 text-center">
                            <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
                            <p className="text-center text-xs text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
