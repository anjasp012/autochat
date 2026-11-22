import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Building2,
    Check,
    CheckCircle2,
    Edit2,
    Headphones,
    KeyRound,
    Mail,
    Plus,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    User as UserIcon,
    Users,
} from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ApplicationItem {
    id: number;
    app_id: string;
    name: string;
    is_active: boolean;
}

interface UserItem {
    id: number;
    name: string;
    email: string;
    role: string;
    assigned_application_ids: number[];
    created_at: string;
}

interface Props {
    users: UserItem[];
    applications: ApplicationItem[];
}

export default function UsersSettings({ users, applications }: Props) {
    const { auth } = usePage().props as Record<string, any>;
    const currentUserId = auth?.user?.id;

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'operator'>('operator');
    const [assignedApps, setAssignedApps] = useState<number[]>([]);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleOpenCreate = () => {
        setEditingUser(null);
        setName('');
        setEmail('');
        setPassword('');
        setRole('operator');
        // By default on new user, select all applications for convenience or none
        setAssignedApps(applications.map((app) => app.id));
        setErrors({});
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (user: UserItem) => {
        setEditingUser(user);
        setName(user.name);
        setEmail(user.email);
        setPassword('');
        setRole(user.role === 'admin' ? 'admin' : 'operator');
        setAssignedApps(Array.isArray(user.assigned_application_ids) ? user.assigned_application_ids : []);
        setErrors({});
        setIsDialogOpen(true);
    };

    const toggleAppAssignment = (appId: number) => {
        setAssignedApps((prev) =>
            prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
        );
    };

    const handleSelectAllApps = () => {
        setAssignedApps(applications.map((app) => app.id));
    };

    const handleDeselectAllApps = () => {
        setAssignedApps([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const payload: Record<string, any> = {
            name,
            email,
            role,
            assigned_application_ids: role === 'operator' ? assignedApps : [],
        };

        if (password.trim() !== '') {
            payload.password = password;
        }

        if (editingUser) {
            router.put(`/settings/users/${editingUser.id}`, payload, {
                onSuccess: () => {
                    setIsDialogOpen(false);
                    setProcessing(false);
                },
                onError: (err) => {
                    setErrors(err);
                    setProcessing(false);
                },
            });
        } else {
            router.post('/settings/users', payload, {
                onSuccess: () => {
                    setIsDialogOpen(false);
                    setProcessing(false);
                },
                onError: (err) => {
                    setErrors(err);
                    setProcessing(false);
                },
            });
        }
    };

    const handleDelete = () => {
        if (!userToDelete) return;
        setProcessing(true);

        router.delete(`/settings/users/${userToDelete.id}`, {
            onSuccess: () => {
                setIsDeleteOpen(false);
                setUserToDelete(null);
                setProcessing(false);
            },
            onError: () => {
                setProcessing(false);
            },
        });
    };

    return (
        <>
            <Head title="Kelola Pengguna - Pengaturan" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
                    <div>
                        <Heading
                            title="Kelola Pengguna & Hak Akses"
                            description="Kelola akun Admin Utama dan Operator CS beserta pembatasan akses aplikasi yang dapat mereka kelola."
                        />
                    </div>
                    <Button
                        onClick={handleOpenCreate}
                        className="rounded-xl bg-primary text-primary-foreground font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0"
                    >
                        <Plus className="size-4" />
                        <span>Tambah Pengguna</span>
                    </Button>
                </div>

                {/* USER LIST */}
                <div className="grid gap-4">
                    {users.map((user) => {
                        const isSelf = user.id === currentUserId;
                        const isAdmin = user.role === 'admin';
                        const userAssignedApps = applications.filter((app) =>
                            user.assigned_application_ids?.includes(app.id)
                        );

                        return (
                            <div
                                key={user.id}
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 rounded-2xl border border-border bg-card shadow-2xs hover:border-border/80 transition-all"
                            >
                                <div className="flex items-start gap-3.5 min-w-0">
                                    <div
                                        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                                            isAdmin
                                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        }`}
                                    >
                                        {isAdmin ? (
                                            <ShieldCheck className="size-5" />
                                        ) : (
                                            <Headphones className="size-5" />
                                        )}
                                    </div>

                                    <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-foreground text-sm tracking-tight truncate">
                                                {user.name}
                                            </span>
                                            {isSelf && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] py-0 px-1.5 font-semibold text-muted-foreground"
                                                >
                                                    Akun Anda
                                                </Badge>
                                            )}
                                            <Badge
                                                className={`text-[10px] py-0 px-2 font-bold ${
                                                    isAdmin
                                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                }`}
                                            >
                                                {isAdmin ? 'Admin Utama' : 'Operator CS'}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Mail className="size-3.5" />
                                            <span>{user.email}</span>
                                            <span>•</span>
                                            <span>Dibuat: {user.created_at}</span>
                                        </div>

                                        {/* APLIKASI YANG DIIZINKAN */}
                                        <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                                            <span className="text-[11px] font-semibold text-muted-foreground">
                                                Akses Aplikasi:
                                            </span>
                                            {isAdmin ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                                                    <CheckCircle2 className="size-3" />
                                                    Semua Aplikasi (Akses Penuh)
                                                </span>
                                            ) : userAssignedApps.length > 0 ? (
                                                userAssignedApps.map((app) => (
                                                    <span
                                                        key={app.id}
                                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20"
                                                    >
                                                        <Building2 className="size-3" />
                                                        {app.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">
                                                    Belum ada aplikasi yang diberikan
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenEdit(user)}
                                        className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                                    >
                                        <Edit2 className="size-3.5" />
                                        <span>Edit</span>
                                    </Button>

                                    {!isSelf && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setUserToDelete(user);
                                                setIsDeleteOpen(true);
                                            }}
                                            className="h-8 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer gap-1.5"
                                        >
                                            <Trash2 className="size-3.5" />
                                            <span>Hapus</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CREATE / EDIT DIALOG */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            {editingUser ? (
                                <>
                                    <Edit2 className="size-4 text-primary" />
                                    <span>Edit Pengguna & Hak Akses</span>
                                </>
                            ) : (
                                <>
                                    <UserPlusIcon className="size-4 text-primary" />
                                    <span>Tambah Pengguna Baru</span>
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {editingUser
                                ? 'Perbarui informasi pengguna, role wewenang, dan daftar aplikasi yang diizinkan.'
                                : 'Buat akun staf atau admin baru. Operator CS hanya dapat membalas chat pada aplikasi yang dipilih.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        {/* NAMA */}
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-xs font-semibold">
                                Nama Lengkap
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="misal: Rahma / Diana"
                                required
                                className="rounded-xl h-9 text-xs"
                            />
                            {errors.name && (
                                <p className="text-[11px] text-destructive">{errors.name}</p>
                            )}
                        </div>

                        {/* EMAIL */}
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs font-semibold">
                                Alamat Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="operator@perusahaan.com"
                                required
                                className="rounded-xl h-9 text-xs"
                            />
                            {errors.email && (
                                <p className="text-[11px] text-destructive">{errors.email}</p>
                            )}
                        </div>

                        {/* PASSWORD */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs font-semibold">
                                    Kata Sandi (Password)
                                </Label>
                                {editingUser && (
                                    <span className="text-[10px] text-muted-foreground">
                                        Kosongkan jika tidak ingin diubah
                                    </span>
                                )}
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={editingUser ? '••••••••' : 'Minimal 8 karakter'}
                                required={!editingUser}
                                className="rounded-xl h-9 text-xs font-mono"
                            />
                            {errors.password && (
                                <p className="text-[11px] text-destructive">{errors.password}</p>
                            )}
                        </div>

                        {/* ROLE SELECTION */}
                        <div className="space-y-2 pt-1">
                            <Label className="text-xs font-semibold">Role & Hak Akses</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* OPERATOR CS */}
                                <div
                                    onClick={() => setRole('operator')}
                                    className={`flex flex-col gap-1 p-3 rounded-xl border cursor-pointer transition-all ${
                                        role === 'operator'
                                            ? 'border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500'
                                            : 'border-border bg-card/50 hover:bg-muted/50 text-muted-foreground'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                            <Headphones className="size-3.5 text-emerald-500" />
                                            <span>Operator CS</span>
                                        </div>
                                        {role === 'operator' && (
                                            <Check className="size-3.5 text-emerald-500" />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-snug">
                                        Hanya balas chat pada aplikasi yang dipilih. Tidak bisa tambah/hapus bot.
                                    </p>
                                </div>

                                {/* ADMIN UTAMA */}
                                <div
                                    onClick={() => setRole('admin')}
                                    className={`flex flex-col gap-1 p-3 rounded-xl border cursor-pointer transition-all ${
                                        role === 'admin'
                                            ? 'border-indigo-500 bg-indigo-500/10 text-foreground ring-1 ring-indigo-500'
                                            : 'border-border bg-card/50 hover:bg-muted/50 text-muted-foreground'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                            <ShieldCheck className="size-3.5 text-indigo-500" />
                                            <span>Admin Utama</span>
                                        </div>
                                        {role === 'admin' && (
                                            <Check className="size-3.5 text-indigo-500" />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-snug">
                                        Akses penuh: buat/hapus bot, kelola pengguna lain, dan akses semua chat.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ASSIGNED APPLICATIONS (Only shown if operator) */}
                        {role === 'operator' && (
                            <div className="space-y-2 pt-2 border-t border-border/60">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">
                                        Pilih Aplikasi yang Boleh Dikelola
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllApps}
                                            className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                                        >
                                            Pilih Semua
                                        </button>
                                        <span className="text-muted-foreground text-xs">•</span>
                                        <button
                                            type="button"
                                            onClick={handleDeselectAllApps}
                                            className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
                                        >
                                            Hapus Semua
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                    {applications.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic py-2">
                                            Belum ada aplikasi yang dibuat di sistem.
                                        </p>
                                    ) : (
                                        applications.map((app) => {
                                            const isChecked = assignedApps.includes(app.id);
                                            return (
                                                <div
                                                    key={app.id}
                                                    onClick={() => toggleAppAssignment(app.id)}
                                                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                                                        isChecked
                                                            ? 'border-emerald-500/40 bg-emerald-500/5'
                                                            : 'border-border bg-card hover:bg-muted/40'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onCheckedChange={() => toggleAppAssignment(app.id)}
                                                        />
                                                        <div>
                                                            <div className="text-xs font-bold text-foreground">
                                                                {app.name}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground font-mono">
                                                                {app.app_id}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] py-0 px-1.5 font-normal"
                                                    >
                                                        {app.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </Badge>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                {errors.assigned_application_ids && (
                                    <p className="text-[11px] text-destructive">
                                        {errors.assigned_application_ids}
                                    </p>
                                )}
                            </div>
                        )}

                        <DialogFooter className="pt-4 border-t border-border/60">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                className="rounded-xl text-xs font-semibold cursor-pointer"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs cursor-pointer"
                            >
                                {processing
                                    ? 'Menyimpan...'
                                    : editingUser
                                      ? 'Perbarui Pengguna'
                                      : 'Simpan Pengguna'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* CONFIRM DELETE DIALOG */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <ShieldAlert className="size-5 text-destructive" />
                            <span>Hapus Pengguna</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Apakah Anda yakin ingin menghapus akun{' '}
                            <strong className="text-foreground">{userToDelete?.name}</strong> (
                            {userToDelete?.email})? Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="pt-4 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteOpen(false)}
                            className="rounded-xl text-xs font-semibold cursor-pointer"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={processing}
                            onClick={handleDelete}
                            className="rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                            {processing ? 'Menghapus...' : 'Ya, Hapus Pengguna'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function UserPlusIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
        </svg>
    );
}
