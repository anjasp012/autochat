import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-amber-500 text-neutral-950 shadow-xs shrink-0">
                <AppLogoIcon className="size-5 fill-current" />
            </div>
            <div className="ml-1.5 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-black tracking-tight text-foreground flex items-center gap-0.5">
                    Auto<span className="text-amber-500">Chat</span>
                </span>
                <span className="truncate text-[10px] text-muted-foreground font-semibold">
                    Livechat Console
                </span>
            </div>
        </>
    );
}
