import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-zinc-900" />
                <Link
                    href={home()}
                    className="relative z-20 flex items-center gap-2.5 text-xl font-black tracking-tight text-white"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-sm">
                        <img
                            src="/favicon.png?v=20261128b"
                            alt="AutoChat"
                            className="size-9 object-cover"
                        />
                    </div>
                    <span>Auto<span className="text-amber-500">Chat</span></span>
                </Link>
            </div>
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Link
                        href={home()}
                        className="relative z-20 flex flex-col items-center gap-2 justify-center lg:hidden"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shadow-md">
                            <img
                                src="/favicon.png?v=20261128b"
                                alt="AutoChat"
                                className="size-14 object-cover"
                            />
                        </div>
                        <span className="text-xl font-black tracking-tight text-foreground">
                            Auto<span className="text-amber-500">Chat</span>
                        </span>
                    </Link>
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-xl font-medium">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
