import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Bot,
    ExternalLink,
    Filter,
    MessageSquare,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { ApplicationDetail } from '@/types/application';

interface PaginatedApplications {
    data: ApplicationDetail[];
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
    applications: PaginatedApplications;
    filters: {
        search?: string | null;
        status?: string | null;
    };
}

export default function ApplicationsIndex({ applications, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [appToDelete, setAppToDelete] = useState<ApplicationDetail | null>(null);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/applications',
            { search: search || undefined, status: status || undefined },
            { preserveState: true }
        );
    };

    const handleStatusFilterChange = (newStatus: string) => {
        setStatus(newStatus);
        router.get(
            '/admin/applications',
            { search: search || undefined, status: newStatus || undefined },
            { preserveState: true }
        );
    };

    const handleToggleStatus = (app: ApplicationDetail) => {
        router.post(
            `/admin/applications/${app.id}/toggle-status`,
            {},
            { preserveScroll: true }
        );
    };

    const handleDeleteConfirm = () => {
        if (!appToDelete) return;

        router.delete(`/admin/applications/${appToDelete.id}`, {
            onSuccess: () => setAppToDelete(null),
        });
    };

    return (
        <>
            <Head title="Applications - Admin" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header Section */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola seluruh chatbot AI, konfigurasi model, dan parameter sistem.
                        </p>
                    </div>

                    <Button asChild className="cursor-pointer gap-2 self-start sm:self-auto shadow-xs">
                        <Link href="/admin/applications/create">
                            <Plus className="size-4" />
                            Tambah Aplikasi
                        </Link>
                    </Button>
                </div>

                {/* Filter and Search Bar */}
                <Card>
                    <CardContent className="p-4">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="flex flex-col gap-3 sm:flex-row sm:items-center"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari berdasarkan nama, app_id, atau deskripsi..."
                                    className="pl-9 h-9"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 rounded-lg border border-input p-0.5 text-xs bg-muted/40">
                                    <button
                                        type="button"
                                        onClick={() => handleStatusFilterChange('')}
                                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                                            !status ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Semua ({applications.total})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusFilterChange('active')}
                                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                                            status === 'active' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Aktif
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusFilterChange('inactive')}
                                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                                            status === 'inactive' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Nonaktif
                                    </button>
                                </div>

                                <Button type="submit" size="sm" variant="secondary" className="h-9 px-3">
                                    Filter
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Applications Table */}
                <Card>
                    <CardHeader className="p-4 sm:p-6 pb-2">
                        <CardTitle className="text-lg">Daftar Aplikasi Chatbot</CardTitle>
                        <CardDescription>
                            Total {applications.total} aplikasi terdaftar dalam platform.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {applications.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                                    <Bot className="size-6 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 text-base font-semibold">Tidak ada aplikasi</h3>
                                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                                    {search || status
                                        ? 'Tidak ditemukan aplikasi yang cocok dengan filter pencarian Anda.'
                                        : 'Belum ada aplikasi yang dibuat. Klik tombol di bawah untuk membuat aplikasi baru.'}
                                </p>
                                {!search && !status && (
                                    <Button asChild size="sm" className="mt-4 gap-1.5 cursor-pointer">
                                        <Link href="/admin/applications/create">
                                            <Plus className="size-4" />
                                            Tambah Aplikasi Sekarang
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Aplikasi</TableHead>
                                        <TableHead>Model & Parameter</TableHead>
                                        <TableHead>Percakapan</TableHead>
                                        <TableHead>Knowledge Base</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {applications.data.map((app) => (
                                        <TableRow key={app.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                        <Bot className="size-5" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-foreground text-sm">
                                                            {app.name}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <code className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded">
                                                                {app.app_id}
                                                            </code>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex flex-col text-xs space-y-0.5">
                                                    <span className="font-medium text-foreground">{app.model}</span>
                                                    <span className="text-muted-foreground text-[11px]">
                                                        Temp: {app.temperature} • Max: {app.max_tokens}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <MessageSquare className="size-3.5" />
                                                    <span className="font-medium text-foreground">
                                                        {app.conversations_count ?? 0}
                                                    </span>
                                                    <span>sesi</span>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex flex-col text-xs text-muted-foreground">
                                                    <span>
                                                        <strong className="text-foreground">{app.knowledge_sources_count ?? 0}</strong> sumber
                                                    </span>
                                                    <span className="text-[11px]">
                                                        {app.knowledge_chunks_count ?? 0} chunks
                                                    </span>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={app.is_active}
                                                        onCheckedChange={() => handleToggleStatus(app)}
                                                        title={app.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                                                    />
                                                    <span className="text-xs text-muted-foreground">
                                                        {app.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                        className="size-8 cursor-pointer rounded-lg text-muted-foreground hover:text-foreground"
                                                        title="Buka Chat Publik"
                                                    >
                                                        <a
                                                            href={`/chat/${app.app_id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink className="size-4" />
                                                        </a>
                                                    </Button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 cursor-pointer rounded-lg text-muted-foreground hover:text-foreground"
                                                            >
                                                                <MoreHorizontal className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                                            <DropdownMenuLabel className="text-xs">Tindakan</DropdownMenuLabel>
                                                            <DropdownMenuItem asChild className="cursor-pointer text-xs">
                                                                <Link href={`/admin/applications/${app.id}/edit`}>
                                                                    <Pencil className="size-3.5 mr-2" />
                                                                    Edit Konfigurasi
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild className="cursor-pointer text-xs">
                                                                <a
                                                                    href={`/chat/${app.app_id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <ExternalLink className="size-3.5 mr-2" />
                                                                    Tes Chat Publik
                                                                </a>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setAppToDelete(app)}
                                                                className="cursor-pointer text-xs text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="size-3.5 mr-2" />
                                                                Hapus Aplikasi
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {/* Pagination Links */}
                        {applications.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
                                <span className="text-xs text-muted-foreground">
                                    Halaman {applications.current_page} dari {applications.last_page}
                                </span>
                                <div className="flex items-center gap-1">
                                    {applications.links.map((link, idx) => (
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
            <Dialog open={!!appToDelete} onOpenChange={(open) => !open && setAppToDelete(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Hapus Aplikasi?</DialogTitle>
                        <DialogDescription className="text-sm">
                            Apakah Anda yakin ingin menghapus aplikasi{' '}
                            <strong>{appToDelete?.name}</strong>? Seluruh riwayat obrolan dan knowledge base terkait akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setAppToDelete(null)}
                            className="cursor-pointer"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            className="cursor-pointer"
                        >
                            Ya, Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ApplicationsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Applications',
            href: '/admin/applications',
        },
    ],
};
