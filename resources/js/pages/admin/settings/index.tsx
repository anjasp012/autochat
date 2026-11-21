import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    Bot,
    CheckCircle2,
    Eye,
    Flame,
    Gamepad2,
    Globe,
    Headphones,
    HelpCircle,
    Home as HomeIcon,
    Image as ImageIcon,
    Layout,
    MessageSquare,
    Palette,
    Send,
    ShieldCheck,
    Sliders,
    Sparkles,
    Trophy,
    Users,
} from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'design' | 'system'>('design');

    // Default chat settings values
    const currentSettings = application.chat_settings || {};

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

        // Kustomisasi Tampilan Livechat
        chat_settings: {
            bg_color: currentSettings.bg_color || '#FFF9E6',
            header_color: currentSettings.header_color || '#FFD200',
            icon_type: currentSettings.icon_type || 'sparkles',
            favicon_url: currentSettings.favicon_url || '',
            splash_title: currentSettings.splash_title || `Selamat Datang di Livechat ${application.name} 😊`,
            splash_subtitle: currentSettings.splash_subtitle || `CHAT DENGAN TIM ${application.name.toUpperCase()}`,
            splash_description: currentSettings.splash_description || 'Ada yang Bisa Kami Bantu, Bosku?',
            header_title: currentSettings.header_title || application.name,
            avatar_1:
                currentSettings.avatar_1 ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            avatar_2:
                currentSettings.avatar_2 ||
                'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
            avatar_3:
                currentSettings.avatar_3 ||
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
            banner_badge: currentSettings.banner_badge || 'OFFICIAL 24/7 SUPPORT',
            banner_title: currentSettings.banner_title || application.name,
            banner_description:
                currentSettings.banner_description ||
                'Pusat Bantuan Resmi & Layanan Member 24 Jam Nonstop. Proses Deposit & WD Tercepat, Promo & Event Menarik!',
            banner_image_url: currentSettings.banner_image_url || '',
            btn_1_title: currentSettings.btn_1_title || 'Prediksi Togel',
            btn_1_query:
                currentSettings.btn_1_query || 'Halo CS, bisa berikan bocoran prediksi togel dan pasaran hari ini?',
            btn_2_title: currentSettings.btn_2_title || 'Rtp Slot Gacor',
            btn_2_query:
                currentSettings.btn_2_query || 'Halo CS, apa saja daftar RTP slot yang lagi gacor hari ini?',
            btn_3_title: currentSettings.btn_3_title || 'Download APK',
            btn_3_query:
                currentSettings.btn_3_query || 'Bagaimana cara download dan instal aplikasi APK versi terbaru?',
            btn_4_title: currentSettings.btn_4_title || 'Promosi',
            btn_4_query:
                currentSettings.btn_4_query ||
                'Bisa jelaskan promo dan bonus deposit / new member terbaru yang sedang aktif?',
            welcome_opening:
                currentSettings.welcome_opening ||
                application.welcome_message ||
                `Selamat Datang di ${application.name} Link ANTI NAWALA ${application.name}\n️ [https://kiamkiam.site/cvtogel1](https://kiamkiam.site/cvtogel1) ️ [https://kiamkiam.site/cvtogel2](https://kiamkiam.site/cvtogel2) WHATSAPP ️ [https://kiamkiam.site/wacvtogel](https://kiamkiam.site/wacvtogel) TELEGRAM ️ [https://kiamkiam.site/telecvtogel](https://kiamkiam.site/telecvtogel) ( WAJIB DI SIMPAN )`,
        },
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

    const updateChatSetting = (key: string, value: any) => {
        setData('chat_settings', {
            ...data.chat_settings,
            [key]: value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Sinkronkan juga welcome_message dengan welcome_opening
        data.welcome_message = data.chat_settings.welcome_opening;
        put(`/admin/applications/${application.id}`);
    };

    // Render icon helper untuk preview
    const renderIcon = (type: string, className = 'size-5') => {
        switch (type) {
            case 'bot':
                return <Bot className={className} />;
            case 'headphones':
                return <Headphones className={className} />;
            case 'gamepad':
                return <Gamepad2 className={className} />;
            case 'trophy':
                return <Trophy className={className} />;
            case 'flame':
                return <Flame className={className} />;
            case 'shield':
                return <ShieldCheck className={className} />;
            default:
                return <Sparkles className={className} />;
        }
    };

    return (
        <>
            <Head title={`Pengaturan ${application.name} - Admin`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 overflow-y-auto">
                {/* Header Tanpa Tombol Kembali */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Bot</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Perbarui konfigurasi, desain tampilan livechat, dan system prompt untuk{' '}
                            <strong>{application.name}</strong>.
                        </p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex items-center gap-1 rounded-xl bg-muted p-1 border border-border/80 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setActiveTab('design')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                activeTab === 'design'
                                    ? 'bg-background text-foreground shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Palette className="size-3.5" />
                            <span>Tampilan & Desain Livechat</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('system')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                activeTab === 'system'
                                    ? 'bg-background text-foreground shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Sliders className="size-3.5" />
                            <span>Konfigurasi Bot & AI</span>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ========================================================================= */}
                    {/* TAB 1: KUSTOMISASI DESAIN LIVECHAT DENGAN LIVE PREVIEW */}
                    {/* ========================================================================= */}
                    {activeTab === 'design' && (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                            {/* KOLOM KIRI: FORM PENGATURAN KOMPONEN (7 COLS) */}
                            <div className="xl:col-span-7 space-y-6">
                                {/* CARD 1: WARNA, IKON & FAVICON */}
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Palette className="size-4 text-amber-500" />
                                            <span>Warna, Ikon & Favicon Brand</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Sesuaikan tema warna latar belakang, warna bar header, favicon tab browser, dan ikon badge.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">Warna Background Layar</Label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={data.chat_settings.bg_color}
                                                        onChange={(e) => updateChatSetting('bg_color', e.target.value)}
                                                        className="size-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background"
                                                    />
                                                    <Input
                                                        value={data.chat_settings.bg_color}
                                                        onChange={(e) => updateChatSetting('bg_color', e.target.value)}
                                                        className="font-mono text-xs uppercase"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">Warna Header & Aksen</Label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={data.chat_settings.header_color}
                                                        onChange={(e) => updateChatSetting('header_color', e.target.value)}
                                                        className="size-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background"
                                                    />
                                                    <Input
                                                        value={data.chat_settings.header_color}
                                                        onChange={(e) => updateChatSetting('header_color', e.target.value)}
                                                        className="font-mono text-xs uppercase"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 pt-2">
                                            <Label className="text-xs font-semibold">Ikon Badge Brand</Label>
                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                {[
                                                    { id: 'sparkles', label: 'Sparkles', icon: Sparkles },
                                                    { id: 'bot', label: 'Bot AI', icon: Bot },
                                                    { id: 'headphones', label: 'Headset', icon: Headphones },
                                                    { id: 'trophy', label: 'Trophy', icon: Trophy },
                                                    { id: 'flame', label: 'Gacor', icon: Flame },
                                                    { id: 'shield', label: 'Resmi', icon: ShieldCheck },
                                                ].map((ic) => {
                                                    const IconComp = ic.icon;
                                                    const isSelected = data.chat_settings.icon_type === ic.id;
                                                    return (
                                                        <button
                                                            key={ic.id}
                                                            type="button"
                                                            onClick={() => updateChatSetting('icon_type', ic.id)}
                                                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                                                                isSelected
                                                                    ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 font-bold'
                                                                    : 'border-border hover:bg-muted text-muted-foreground'
                                                            }`}
                                                        >
                                                            <IconComp className="size-4" />
                                                            <span className="text-[10px]">{ic.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Favicon URL */}
                                        <div className="space-y-1.5 pt-2">
                                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                                <Globe className="size-3.5 text-amber-500" />
                                                <span>URL Favicon Tab Browser (Opsional)</span>
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                {data.chat_settings.favicon_url ? (
                                                    <img
                                                        src={data.chat_settings.favicon_url}
                                                        alt="Favicon"
                                                        className="size-8 rounded-md border border-border object-contain p-1 shrink-0 bg-background"
                                                        onError={(e) => {
                                                            (e.target as any).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="size-8 rounded-md border border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0 text-[10px]">
                                                        Icon
                                                    </div>
                                                )}
                                                <Input
                                                    value={data.chat_settings.favicon_url}
                                                    onChange={(e) => updateChatSetting('favicon_url', e.target.value)}
                                                    placeholder="https://... URL icon favicon (.ico / .png / .svg)"
                                                    className="text-xs font-mono h-9"
                                                />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                Favicon ini akan otomatis muncul pada tab browser pengunjung saat membuka livechat aplikasi ini.
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* CARD 2: TITLE & SUBTITLE */}
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Layout className="size-4 text-amber-500" />
                                            <span>Judul & Subtitle Sambutan</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Teks yang tampil di kolom kiri dan header atas obrolan.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3.5">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Tagline Atas (Huruf Kapital)</Label>
                                            <Input
                                                value={data.chat_settings.splash_subtitle}
                                                onChange={(e) => updateChatSetting('splash_subtitle', e.target.value)}
                                                placeholder="Contoh: CHAT DENGAN TIM CVTOGEL"
                                                className="text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Judul Utama (Title)</Label>
                                            <Input
                                                value={data.chat_settings.splash_title}
                                                onChange={(e) => updateChatSetting('splash_title', e.target.value)}
                                                placeholder="Contoh: Selamat Datang di Livechat CVTOGEL 😊"
                                                className="text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Subtitle / Pertanyaan Pembuka</Label>
                                            <Input
                                                value={data.chat_settings.splash_description}
                                                onChange={(e) => updateChatSetting('splash_description', e.target.value)}
                                                placeholder="Contoh: Ada yang Bisa Kami Bantu, Bosku?"
                                                className="text-xs"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* CARD 3: 3 FOTO PROFIL CS (AVATARS) */}
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Users className="size-4 text-amber-500" />
                                            <span>Foto Profil 3 CS (Overlapping Avatars)</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            3 foto customer service yang ditampilkan bertumpuk di header kanan atas.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[
                                            { key: 'avatar_1', label: 'Foto CS 1' },
                                            { key: 'avatar_2', label: 'Foto CS 2' },
                                            { key: 'avatar_3', label: 'Foto CS 3' },
                                        ].map((av, idx) => (
                                            <div key={av.key} className="flex items-center gap-3">
                                                <img
                                                    src={(data.chat_settings as any)[av.key]}
                                                    alt={`CS ${idx + 1}`}
                                                    className="size-9 rounded-full ring-2 ring-amber-400 object-cover shrink-0 shadow-2xs"
                                                    onError={(e) => {
                                                        (e.target as any).src =
                                                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                                                    }}
                                                />
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-[11px] font-semibold">{av.label} (URL Gambar)</Label>
                                                    <Input
                                                        value={(data.chat_settings as any)[av.key]}
                                                        onChange={(e) => updateChatSetting(av.key, e.target.value)}
                                                        placeholder="https://... URL foto profil"
                                                        className="text-xs font-mono h-8"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* CARD 4: BANNER PROMOSI */}
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <ImageIcon className="size-4 text-amber-500" />
                                            <span>Kartu Banner Promosi (Beranda)</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Banner utama yang tampil di beranda sebelum pengunjung memulai chat.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold">Teks Badge Banner</Label>
                                                <Input
                                                    value={data.chat_settings.banner_badge}
                                                    onChange={(e) => updateChatSetting('banner_badge', e.target.value)}
                                                    placeholder="Contoh: OFFICIAL 24/7 SUPPORT"
                                                    className="text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold">Judul Brand Banner</Label>
                                                <Input
                                                    value={data.chat_settings.banner_title}
                                                    onChange={(e) => updateChatSetting('banner_title', e.target.value)}
                                                    placeholder="Contoh: CVTOGEL"
                                                    className="text-xs font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Deskripsi Banner Promosi</Label>
                                            <Textarea
                                                value={data.chat_settings.banner_description}
                                                onChange={(e) => updateChatSetting('banner_description', e.target.value)}
                                                rows={2}
                                                placeholder="Pusat Bantuan Resmi & Layanan Member 24 Jam Nonstop..."
                                                className="text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">
                                                URL Gambar Banner (Opsional - menggantikan background gelap)
                                            </Label>
                                            <Input
                                                value={data.chat_settings.banner_image_url}
                                                onChange={(e) => updateChatSetting('banner_image_url', e.target.value)}
                                                placeholder="https://... URL gambar banner (opsional)"
                                                className="text-xs font-mono"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* CARD 5: 4 TOMBOL CEPAT */}
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <ArrowUpRight className="size-4 text-amber-500" />
                                            <span>4 Tombol Cepat (Grid 2×2 Beranda)</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Tombol pilihan cepat di halaman awal. Pengunjung cukup klik untuk mengirim pertanyaan.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {[
                                            {
                                                num: 1,
                                                titleKey: 'btn_1_title',
                                                queryKey: 'btn_1_query',
                                                defaultTitle: 'Prediksi Togel',
                                            },
                                            {
                                                num: 2,
                                                titleKey: 'btn_2_title',
                                                queryKey: 'btn_2_query',
                                                defaultTitle: 'Rtp Slot Gacor',
                                            },
                                            {
                                                num: 3,
                                                titleKey: 'btn_3_title',
                                                queryKey: 'btn_3_query',
                                                defaultTitle: 'Download APK',
                                            },
                                            {
                                                num: 4,
                                                titleKey: 'btn_4_title',
                                                queryKey: 'btn_4_query',
                                                defaultTitle: 'Promosi',
                                            },
                                        ].map((btn) => (
                                            <div key={btn.num} className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-foreground">
                                                        Tombol {btn.num}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        Grid Kolom {btn.num <= 2 ? 'Atas' : 'Bawah'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <div className="sm:col-span-1 space-y-1">
                                                        <Label className="text-[11px] font-medium">Judul Tombol</Label>
                                                        <Input
                                                            value={(data.chat_settings as any)[btn.titleKey]}
                                                            onChange={(e) => updateChatSetting(btn.titleKey, e.target.value)}
                                                            placeholder={btn.defaultTitle}
                                                            className="text-xs font-semibold h-8"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2 space-y-1">
                                                        <Label className="text-[11px] font-medium">Pesan Otomatis Dikirim</Label>
                                                        <Input
                                                            value={(data.chat_settings as any)[btn.queryKey]}
                                                            onChange={(e) => updateChatSetting(btn.queryKey, e.target.value)}
                                                            placeholder="Pertanyaan yang diajukan ke bot..."
                                                            className="text-xs h-8"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* CARD 6: OPENING / PESAN PEMBUKA */}
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <MessageSquare className="size-4 text-amber-500" />
                                            <span>Pesan Pembuka (Opening / Anti-Nawala)</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Pesan awal yang langsung ditampilkan di formulir dan di ruang chat. Mendukung format Markdown link.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Textarea
                                            value={data.chat_settings.welcome_opening}
                                            onChange={(e) => {
                                                updateChatSetting('welcome_opening', e.target.value);
                                                setData('welcome_message', e.target.value);
                                            }}
                                            rows={6}
                                            placeholder="Selamat Datang di CVTOGEL Link ANTI NAWALA..."
                                            className="font-mono text-xs leading-relaxed"
                                        />
                                        <span className="text-[11px] text-muted-foreground block">
                                            Gunakan format <code>[Judul Link](https://link-anda.com)</code> untuk membuat link yang dapat langsung diklik oleh pengguna.
                                        </span>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* KOLOM KANAN: LIVE PREVIEW DARI SISI ADMIN (5 COLS - STICKY) */}
                            <div className="xl:col-span-5 sticky top-6 space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                        <Eye className="size-4 text-amber-500" />
                                        <span>Pratinjau Langsung (Live Preview)</span>
                                    </div>
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="size-3" /> Real-time
                                    </span>
                                </div>

                                {/* MOCKUP CONTAINER 50/50 SPLIT */}
                                <div
                                    className="rounded-3xl border-2 border-border shadow-xl overflow-hidden flex flex-col select-none transition-colors"
                                    style={{ backgroundColor: data.chat_settings.bg_color }}
                                >
                                    {/* MOCKUP DESKTOP SPLIT VIEW (50% Kiri & 50% Kanan) */}
                                    <div className="flex flex-row h-[490px] w-full overflow-hidden">
                                        {/* KIRI 50%: SPLASH SCREEN */}
                                        <div className="w-1/2 p-5 flex flex-col justify-center space-y-3 text-neutral-900 border-r border-amber-200/50">
                                            <div
                                                className="flex size-9 items-center justify-center rounded-full text-neutral-950 shadow-xs"
                                                style={{ backgroundColor: data.chat_settings.header_color }}
                                            >
                                                {renderIcon(data.chat_settings.icon_type, 'size-4')}
                                            </div>

                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-600 block line-clamp-1">
                                                    {data.chat_settings.splash_subtitle}
                                                </span>
                                                <h4 className="text-sm font-extrabold leading-tight text-neutral-900 line-clamp-2">
                                                    {data.chat_settings.splash_title}
                                                </h4>
                                                <p className="text-[10px] text-neutral-700 font-medium pt-0.5 line-clamp-1">
                                                    {data.chat_settings.splash_description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* KANAN 50%: LIVECHAT WIDGET INTERAKTIF */}
                                        <div className="w-1/2 bg-white flex flex-col h-full overflow-hidden shadow-md">
                                            {/* HEADER ATAS */}
                                            <div
                                                className="px-3 py-2.5 text-neutral-950 shrink-0 border-b border-amber-300"
                                                style={{ backgroundColor: data.chat_settings.header_color }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-amber-300">
                                                            {renderIcon(data.chat_settings.icon_type, 'size-3')}
                                                        </div>
                                                        <span className="font-extrabold text-[11px] truncate uppercase">
                                                            {data.chat_settings.header_title}
                                                        </span>
                                                    </div>

                                                    {/* 3 FOTO AVATAR CS */}
                                                    <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                                        <img
                                                            className="inline-block size-5 rounded-full ring-1.5 ring-white object-cover"
                                                            src={data.chat_settings.avatar_1}
                                                            alt="CS 1"
                                                        />
                                                        <img
                                                            className="inline-block size-5 rounded-full ring-1.5 ring-white object-cover"
                                                            src={data.chat_settings.avatar_2}
                                                            alt="CS 2"
                                                        />
                                                        <img
                                                            className="inline-block size-5 rounded-full ring-1.5 ring-white object-cover"
                                                            src={data.chat_settings.avatar_3}
                                                            alt="CS 3"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-1.5">
                                                    <p className="text-[8px] font-medium text-neutral-800 line-clamp-1">
                                                        {data.chat_settings.splash_title}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-neutral-950 line-clamp-1">
                                                        {data.chat_settings.splash_description}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* BODY BERANDA DENGAN BANNER & 4 TOMBOL */}
                                            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 bg-slate-50/70">
                                                {/* BANNER PROMOSI */}
                                                <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-neutral-950 via-neutral-900 to-amber-950 p-2.5 text-white shadow-2xs border border-amber-500/30 text-center">
                                                    {data.chat_settings.banner_image_url ? (
                                                        <img
                                                            src={data.chat_settings.banner_image_url}
                                                            alt="Banner"
                                                            className="w-full h-16 object-cover rounded-lg mb-1"
                                                        />
                                                    ) : (
                                                        <>
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold text-amber-300 border border-amber-500/30">
                                                                <Sparkles className="size-2" />
                                                                {data.chat_settings.banner_badge}
                                                            </span>
                                                            <h5 className="text-xs font-black tracking-wide text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-yellow-400 to-amber-200 mt-1 uppercase">
                                                                {data.chat_settings.banner_title}
                                                            </h5>
                                                            <p className="text-[8px] text-neutral-300 line-clamp-2 mt-0.5">
                                                                {data.chat_settings.banner_description}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>

                                                {/* 4 TOMBOL CEPAT (GRID 2x2) */}
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {[
                                                        data.chat_settings.btn_1_title,
                                                        data.chat_settings.btn_2_title,
                                                        data.chat_settings.btn_3_title,
                                                        data.chat_settings.btn_4_title,
                                                    ].map((t, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-2 text-left shadow-2xs"
                                                        >
                                                            <span className="text-[9px] font-bold text-neutral-800 truncate">
                                                                {t || `Tombol ${idx + 1}`}
                                                            </span>
                                                            <ArrowUpRight className="size-2.5 text-neutral-400 shrink-0" />
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* TOMBOL KIRIM PESAN */}
                                                <div
                                                    className="w-full flex items-center justify-center gap-1.5 rounded-lg text-neutral-950 font-bold py-1.5 text-[10px] shadow-2xs"
                                                    style={{ backgroundColor: data.chat_settings.header_color }}
                                                >
                                                    <span>Kirim Pesan</span>
                                                    <ArrowRight className="size-3" />
                                                </div>
                                            </div>

                                            {/* BOTTOM NAV TABS */}
                                            <div className="border-t border-neutral-200 bg-white px-3 py-1 shrink-0 flex items-center justify-around text-[8px] text-neutral-500 font-medium">
                                                <div className="flex flex-col items-center text-amber-600 font-bold">
                                                    <HomeIcon className="size-3" />
                                                    <span>Beranda</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <MessageSquare className="size-3" />
                                                    <span>Pesan</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <HelpCircle className="size-3" />
                                                    <span>Bantuan</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[11px] text-muted-foreground text-center">
                                    Setiap perubahan warna, teks, banner, dan tombol langsung terupdate pada preview di atas.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 2: KONFIGURASI BOT & AI */}
                    {/* ========================================================================= */}
                    {activeTab === 'system' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
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
                                                onChange={(e) => {
                                                    setData('name', e.target.value);
                                                    updateChatSetting('header_title', e.target.value);
                                                }}
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
                                            <Label htmlFor="description">Deskripsi Singkat (Opsional)</Label>
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

                                {/* Active Status */}
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
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Kolom Kanan: System Prompt */}
                            <div className="space-y-6">
                                <Card className="h-full flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="text-base">System Prompt AI</CardTitle>
                                        <CardDescription>
                                            Instruksi inti yang memandu kepribadian, aturan, dan jawaban asisten AI.
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
                        </div>
                    )}

                    {/* Tombol Simpan Perubahan Sticky Bottom */}
                    <div className="flex items-center justify-between border-t border-border pt-4 bg-background">
                        <span className="text-xs text-muted-foreground">
                            Perubahan konfigurasi akan langsung diterapkan pada livechat pengunjung.
                        </span>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="gap-2 cursor-pointer shadow-xs min-w-44 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            {processing && <Spinner />}
                            Simpan Perubahan
                        </Button>
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
