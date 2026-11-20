import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Bot,
    Clock,
    Filter,
    HandMetal,
    MessageSquare,
    Search,
    Trash2,
    User,
    UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface ConversationItem {
    id: number;
    uuid: string;
    application_id: number;
    ip_address: string | null;
    last_activity_at: string;
    is_taken_over: boolean;
    taken_over_at: string | null;
    messages_count: number;
    application?: {
        id: number;
        app_id: string;
        name: string;
    };
    taken_over_by?: {
        id: number;
        name: string;
    } | null;
}

interface PaginatedConversations {
    data: ConversationItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Props {
    conversations: PaginatedConversations;
    filters: {
        search?: string | null;
        app_id?: string | null;
        status?: string | null;
    };
    selectedApp?: {
        id: number;
        app_id: string;
        name: string;
    } | null;
}

export default function ConversationsIndex({
    conversations,
    filters,
    selectedApp,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [convToDelete, setConvToDelete] = useState<ConversationItem | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/conversations',
            {
                search: search || undefined,
                status: status || undefined,
                app_id: filters.app_id || undefined,
            },
            { preserveState: true }
        );
    };

    const handleStatusFilter = (newStatus: string) => {
        setStatus(newStatus);
        router.get(
            '/admin/conversations',
            {
                search: search || undefined,
                status: newStatus || undefined,
                app_id: filters.app_id || undefined,
            },
            { preserveState: true }
        );
    };

    const handleToggleTakeover = (conv: ConversationItem) => {
        if (conv.is_taken_over) {
            router.post(`/admin/conversations/${conv.id}/release-takeover`, {}, { preserveScroll: true });
        } else {
            router.post(`/admin/conversations/${conv.id}/takeover`, {}, { preserveScroll: true });
        }
    };

    const handleDeleteConfirm = () => {
        if (!convToDelete) return;
        router.delete(`/admin/conversations/${convToDelete.id}`, {
            onSuccess: () => setConvToDelete(null),
        });
    };

    return (
        <>
            <Head title="Conversations - Admin" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
                        <p className="text-sm text-muted-foreground">
                            Riwayat sesi percakapan pengunjung dan fitur intervensi live support (Ambil Alih).
                        </p>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <Card>
                    <CardContent className="p-4">
                        <form
                            onSubmit={handleSearch}
                            className="flex flex-col gap-3 sm:flex-row sm:items-center"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari berdasarkan UUID sesi atau isi pesan..."
                                    className="pl-9 h-9"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 rounded-lg border border-input p-0.5 text-xs bg-muted/40">
                                    <button
                                        type="button"
                                        onClick={() => handleStatusFilter('')}
                                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                                            !status ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Semua ({conversations.total})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusFilter('taken_over')}
                                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                                            status === 'taken_over' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Diambil Alih
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusFilter('ai')}
                                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                                            status === 'ai' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Mode AI
                                    </button>
                                </div>

                                <Button type="submit" size="sm" variant="secondary" className="h-9 px-3">
                                    Cari
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Conversations Table */}
                <Card>
                    <CardHeader className="p-4 sm:p-6 pb-2">
                        <CardTitle className="text-lg">Riwayat Percakapan</CardTitle>
                        <CardDescription>
                            {selectedApp
                                ? `Menampilkan percakapan untuk chatbot: ${selectedApp.name}`
                                : 'Semua percakapan tersimpan permanen di database sampai dihapus.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {conversations.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                                    <MessageSquare className="size-6 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 text-base font-semibold">Belum ada percakapan</h3>
                                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                                    {search || status
                                        ? 'Tidak ditemukan sesi yang cocok dengan filter pencarian.'
                                        : 'Belum ada pengunjung yang melakukan chat pada aplikasi ini.'}
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sesi Percakapan</TableHead>
                                        <TableHead>Aplikasi</TableHead>
                                        <TableHead>Penanganan</TableHead>
                                        <TableHead>Total Pesan</TableHead>
                                        <TableHead>Aktivitas Terakhir</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {conversations.data.map((conv) => (
                                        <TableRow key={conv.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <Link
                                                        href={`/admin/conversations/${conv.id}`}
                                                        className="font-mono text-xs font-semibold hover:underline text-foreground"
                                                    >
                                                        {conv.uuid.substring(0, 18)}...
                                                    </Link>
                                                    {conv.ip_address && (
                                                        <span className="text-[11px] text-muted-foreground font-mono">
                                                            IP: {conv.ip_address}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <Badge variant="outline" className="text-xs gap-1">
                                                    <Bot className="size-3 text-primary" />
                                                    {conv.application?.name || 'Aplikasi'}
                                                </Badge>
                                            </TableCell>

                                            <TableCell>
                                                {conv.is_taken_over ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                        <UserCheck className="size-3.5" />
                                                        Diambil Alih ({conv.taken_over_by?.name || 'Admin'})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                                                        <Bot className="size-3.5" />
                                                        Ditangani AI
                                                    </span>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                <span className="text-xs font-medium">
                                                    {conv.messages_count} pesan
                                                </span>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="size-3" />
                                                    <span>{conv.last_activity_at}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Tombol Ambil Alih */}
                                                    <Button
                                                        size="sm"
                                                        variant={conv.is_taken_over ? 'secondary' : 'default'}
                                                        onClick={() => handleToggleTakeover(conv)}
                                                        className={`h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs ${
                                                            conv.is_taken_over
                                                                ? 'border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10'
                                                                : 'bg-primary text-primary-foreground'
                                                        }`}
                                                    >
                                                        {conv.is_taken_over ? (
                                                            <>
                                                                <Bot className="size-3.5" />
                                                                Lepas ke AI
                                                            </>
                                                        ) : (
                                                            <>
                                                                <HandMetal className="size-3.5" />
                                                                Ambil Alih
                                                            </>
                                                        )}
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                        className="h-8 gap-1 text-xs cursor-pointer"
                                                    >
                                                        <Link href={`/admin/conversations/${conv.id}`}>
                                                            Buka
                                                            <ArrowRight className="size-3" />
                                                        </Link>
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setConvToDelete(conv)}
                                                        className="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
                                                        title="Hapus Percakapan"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {/* Pagination Links */}
                        {conversations.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
                                <span className="text-xs text-muted-foreground">
                                    Halaman {conversations.current_page} dari {conversations.last_page}
                                </span>
                                <div className="flex items-center gap-1">
                                    {conversations.links.map((link, idx) => (
                                        <Button
                                            key={idx}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            asChild={!!link.url}
                                            disabled={!link.url}
                                            className="h-8 min-w-8 px-2 text-xs"
                                        >
                                            {link.url ? (
                                                <Link href={link.url} preserveScroll>
                                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                                </Link>
                                            ) : (
                                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!convToDelete} onOpenChange={(open) => !open && setConvToDelete(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Hapus Riwayat Percakapan?</DialogTitle>
                        <DialogDescription className="text-sm">
                            Seluruh rekaman pesan pada sesi <code className="font-mono text-xs">{convToDelete?.uuid}</code> akan dihapus secara permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setConvToDelete(null)}
                            className="cursor-pointer"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            className="cursor-pointer"
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
