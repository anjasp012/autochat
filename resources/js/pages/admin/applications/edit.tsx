import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';
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

export default function ApplicationsEdit({ application }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: application.name,
        app_id: application.app_id,
        description: application.description || '',
        system_prompt: application.system_prompt,
        model: application.model || 'Qwen3 1.7B Q4 GGUF',
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

    const promptPresets = [
        {
            title: 'Customer Support',
            prompt: 'Anda adalah asisten Customer Support yang ramah, sopan, dan solutif. Jawab pertanyaan pengguna secara akurat berdasarkan informasi knowledge base yang diberikan.',
        },
        {
            title: 'Sales & Product AI',
            prompt: 'Anda adalah Sales Representative yang persuasif dan informatif. Bantu pengguna memahami keunggulan produk dan rekomendasikan opsi terbaik untuk kebutuhan mereka.',
        },
        {
            title: 'Tutor / Edukasi',
            prompt: 'Anda adalah seorang edukator yang sabar dan jelas. Jelaskan konsep rumit dengan bahasa yang mudah dipahami disertai contoh yang relevan.',
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/admin/applications/${application.id}`);
    };

    return (
        <>
            <Head title={`Edit ${application.name} - Admin`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" asChild className="size-9 rounded-xl">
                            <Link href="/dashboard">
                                <ArrowLeft className="size-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Edit Aplikasi</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Perbarui konfigurasi dan prompt untuk {application.name}.
                            </p>
                        </div>
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
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Sparkles className="size-3 text-primary" /> Template cepat:
                                    </span>
                                    {promptPresets.map((preset) => (
                                        <button
                                            key={preset.title}
                                            type="button"
                                            onClick={() => setData('system_prompt', preset.prompt)}
                                            className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                                        >
                                            {preset.title}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid gap-2 flex-1">
                                    <Textarea
                                        id="system_prompt"
                                        value={data.system_prompt}
                                        onChange={(e) => setData('system_prompt', e.target.value)}
                                        rows={12}
                                        required
                                        className="font-mono text-xs leading-relaxed flex-1 min-h-64"
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

ApplicationsEdit.layout = {
    breadcrumbs: [
        {
            title: 'Edit Aplikasi',
            href: '/admin/applications',
        },
    ],
};
