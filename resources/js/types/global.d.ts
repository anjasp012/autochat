import type { ApplicationSummary } from '@/types/application';
import type { Auth } from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            applications: ApplicationSummary[];
            currentAppId: string | null;
            [key: string]: unknown;
        };
    }
}
