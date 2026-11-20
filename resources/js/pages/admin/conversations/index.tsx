import { Head } from '@inertiajs/react';
import { MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConversationsIndex() {
    return (
        <>
            <Head title="Conversations" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
                    <p className="text-sm text-muted-foreground">
                        Riwayat percakapan pengguna di seluruh aplikasi chatbot.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Riwayat Percakapan</CardTitle>
                        <CardDescription>
                            Daftar sesi obrolan yang tersimpan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <MessageSquare className="size-6 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-base font-semibold">Belum ada percakapan</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Riwayat percakapan pengguna akan muncul di sini secara permanen sampai dihapus.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ConversationsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Conversations',
            href: '/admin/conversations',
        },
    ],
};
