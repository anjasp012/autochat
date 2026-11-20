import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ApplicationDetail } from '@/types/application';

interface Props {
    application: ApplicationDetail;
}

export default function AdminSettings({ application }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: application.name,
        app_id: application.app_id,
        description: application.description || '',
        welcome_message: application.welcome_message || '',
        system_prompt: application.system_prompt,
        model: application.model || 'openai/gpt-oss-120b',
        temperature: application.temperature ?? 0.70,
        max_tokens: application.max_tokens ?? 2048,
        is_active: application.is_active,
    });

    const slugify = (text: string) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/admin/applications/${application.id}`);
    };

    return (
        <>
            <Head title={`Pengaturan ${application.name} - Admin`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="size-9 rounded-xl">
                        <Link href="/dashboard">
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Bot</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Perbarui konfigurasi dan system prompt untuk <strong>{application.name}</strong>.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
                    {/* Kolom Kiri: Informasi Utama & Status */}
                    <div className="space-y-6 flex flex-col justify-between">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Informasi Utama</CardTitle>
                                <CardDescription>
                                    Identitas aplikasi dan slug unik.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nama Chatbot</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="app_id">
                                        App ID (Slug Unik untuk URL /chat)
                                    </Label>
                                    <Input
                                        id="app_id"
                                        value={data.app_id}
                                        onChange={(e) => setData('app_id', slugify(e.target.value))}
                                        required
                                        className="font-mono text-sm"
                                    />
                                    <span className="text-[11px] text-muted-foreground">
                                        URL Chatbot: <code className="font-mono">/chat/{data.app_id}</code>
                                    </span>
                                    <InputError message={errors.app_id} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Deskripsi (Opsional)</Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={3}
                                    />
                                    <InputError message={errors.description} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="welcome_message">
                                        Pesan Pembuka Otomatis (Link / Promo Awal)
                                    </Label>
                                    <Textarea
                                        id="welcome_message"
                                        value={data.welcome_message}
                                        onChange={(e) => setData('welcome_message', e.target.value)}
                                        rows={5}
                                        placeholder="Pesan yang langsung muncul saat visitor membuka chat..."
                                    />
                                    <span className="text-[11px] text-muted-foreground">
                                        Mendukung Markdown (contoh: link <code>[Nama](https://...)</code> atau daftar text).
                                    </span>
                                    <InputError message={errors.welcome_message} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Active Status & Submit */}
                        <Card>
                            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
                                <div className="space-y-0.5">
                                    <Label htmlFor="is_active" className="text-sm font-medium">Status Chatbot</Label>
                                    <p className="text-xs text-muted-foreground">
                                        {data.is_active ? 'Aplikasi aktif dan dapat diakses pengunjung.' : 'Aplikasi nonaktif (offline).'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Switch
                                        id="is_active"
                                        checked={data.is_active}
                                        onCheckedChange={(checked) => setData('is_active', checked)}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="gap-2 cursor-pointer shadow-xs min-w-36"
                                    >
                                        {processing && <Spinner />}
                                        Simpan Perubahan
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Kolom Kanan: System Prompt */}
                    <div className="space-y-6">
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-base">System Prompt</CardTitle>
                                <CardDescription>
                                    Instruksi inti yang memandu kepribadian dan respons AI.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1 flex flex-col">
                                <div className="grid gap-2 flex-1">
                                    <Textarea
                                        id="system_prompt"
                                        value={data.system_prompt}
                                        onChange={(e) => setData('system_prompt', e.target.value)}
                                        rows={14}
                                        required
                                        className="font-mono text-xs leading-relaxed flex-1 min-h-72"
                                    />
                                    <InputError message={errors.system_prompt} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </form>
            </div>
        </>
    );
}

AdminSettings.layout = {
    breadcrumbs: [
        {
            title: 'Pengaturan Bot',
            href: '/admin/settings',
        },
    ],
};
