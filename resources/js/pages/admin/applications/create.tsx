import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface Props {
    defaults: {
        model: string;
        temperature: number;
        max_tokens: number;
        system_prompt: string;
    };
}

export default function ApplicationsCreate({ defaults }: Props) {
    const [manualAppId, setManualAppId] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        app_id: '',
        description: '',
        system_prompt: defaults.system_prompt,
        model: defaults.model || 'Qwen3 1.7B Q4 GGUF',
        temperature: defaults.temperature ?? 0.70,
        max_tokens: defaults.max_tokens ?? 2048,
        is_active: true,
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

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setData((prev) => ({
            ...prev,
            name: val,
            app_id: manualAppId ? prev.app_id : slugify(val),
        }));
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
        post('/admin/applications');
    };

    return (
        <>
            <Head title="Tambah Aplikasi - Admin" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="size-9 rounded-xl">
                        <Link href="/dashboard">
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Tambah Aplikasi Chatbot</h1>
                        <p className="text-sm text-muted-foreground">
                            Buat chatbot baru dengan nama dan instruksi sistem prompt tersendiri.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
                    {/* General Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Informasi Utama</CardTitle>
                            <CardDescription>
                                Identitas chatbot yang membedakannya dengan chatbot lain.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama Chatbot</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={handleNameChange}
                                    placeholder="Contoh: Customer Support Bot"
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
                                    onChange={(e) => {
                                        setManualAppId(true);
                                        setData('app_id', slugify(e.target.value));
                                    }}
                                    placeholder="contoh: customer-support"
                                    required
                                    className="font-mono text-sm"
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    URL Chatbot: <code className="font-mono">/chat/{data.app_id || 'app-id'}</code>
                                </span>
                                <InputError message={errors.app_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Jelaskan peran dan tujuan chatbot ini..."
                                    rows={2}
                                />
                                <InputError message={errors.description} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Prompt */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">System Prompt</CardTitle>
                            <CardDescription>
                                Instruksi inti yang memandu kepribadian dan gaya bahasa AI saat menjawab pengguna.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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

                            <div className="grid gap-2">
                                <Textarea
                                    id="system_prompt"
                                    value={data.system_prompt}
                                    onChange={(e) => setData('system_prompt', e.target.value)}
                                    rows={7}
                                    required
                                    className="font-mono text-xs leading-relaxed"
                                />
                                <InputError message={errors.system_prompt} />
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
                                    Simpan Aplikasi
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </>
    );
}

ApplicationsCreate.layout = {
    breadcrumbs: [
        {
            title: 'Tambah Aplikasi',
            href: '/admin/applications/create',
        },
    ],
};
