import { useEffect } from 'react';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    // Pastikan tab browser di CMS selalu menggunakan favicon CMS Livechat
    useEffect(() => {
        const oldLinks = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
        oldLinks.forEach((el) => el.parentNode?.removeChild(el));

        const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
        rels.forEach((rel) => {
            const link = document.createElement('link');
            link.rel = rel;
            link.href = '/favicon.png';
            document.head.appendChild(link);
        });
    }, []);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </AppLayoutTemplate>
    );
}
