import { Head } from '@inertiajs/react';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function KnowledgeBaseIndex() {
    return (
        <>
            <Head title="Knowledge Base" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola sumber website, proses crawling, dan chunk konten untuk RAG.
                        </p>
                    </div>
                    <Button className="cursor-pointer gap-2 self-start sm:self-auto">
                        <Plus className="size-4" />
                        Tambah Sumber Website
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Sumber Knowledge Base</CardTitle>
                        <CardDescription>
                            Daftar URL website yang terhubung ke aplikasi chatbot.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <BookOpen className="size-6 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-base font-semibold">Belum ada sumber website</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Masukkan URL website publik untuk mulai crawling konten.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

KnowledgeBaseIndex.layout = {
    breadcrumbs: [
        {
            title: 'Knowledge Base',
            href: '/admin/knowledge-base',
        },
    ],
};
