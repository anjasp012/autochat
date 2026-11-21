import { useEffect, useRef, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    Bot,
    Check,
    CheckCircle2,
    Eye,
    Globe,
    HelpCircle,
    Home as HomeIcon,
    Image as ImageIcon,
    Layout,
    MessageSquare,
    Palette,
    Sliders,
    Sparkles,
    Trash2,
    Upload,
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

// Galeri pilihan foto avatar Customer Service profesional
const PRESET_AVATARS = [
    {
        id: 'cs1',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        name: 'Sarah',
    },
    {
        id: 'cs2',
        url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        name: 'Jessica',
    },
    {
        id: 'cs3',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        name: 'David',
    },
    {
        id: 'cs4',
        url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        name: 'Maya',
    },
    {
        id: 'cs5',
        url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        name: 'Lisa',
    },
    {
        id: 'cs6',
        url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        name: 'Kevin',
    },
    {
        id: 'cs7',
        url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        name: 'Ryan',
    },
    {
        id: 'cs8',
        url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
        name: 'Dian',
    },
    {
        id: 'cs9',
        url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        name: 'Putri',
    },
    {
        id: 'cs10',
        url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80',
        name: 'Alex',
    },
];

export default function AdminSettings({ application }: Props) {
    const currentSettings = application.chat_settings || {};

    // Inisialisasi 3 avatar yang dipilih
    const initialAvatars: string[] = Array.isArray(currentSettings.selected_avatars) && currentSettings.selected_avatars.length === 3
        ? currentSettings.selected_avatars
        : [
              currentSettings.avatar_1 || PRESET_AVATARS[0].url,
              currentSettings.avatar_2 || PRESET_AVATARS[1].url,
              currentSettings.avatar_3 || PRESET_AVATARS[2].url,
          ];

    const iconInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

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

        // Kustomisasi Lengkap Tampilan Livechat
        chat_settings: {
            bg_color: currentSettings.bg_color || '#FFF9E6',
            text_color: currentSettings.text_color || '#171717',
            header_color: currentSettings.header_color || '#FFD200',
            custom_icon_url: currentSettings.custom_icon_url || '',
            favicon_url: currentSettings.favicon_url || '',
            splash_title: currentSettings.splash_title || `Selamat Datang di Livechat ${application.name} 😊`,
            splash_subtitle: currentSettings.splash_subtitle || `CHAT DENGAN TIM ${application.name.toUpperCase()}`,
            splash_description: currentSettings.splash_description || 'Ada yang Bisa Kami Bantu, Bosku?',
            header_title: currentSettings.header_title || application.name,
            selected_avatars: initialAvatars,
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

    // Toggle pilihan avatar (maksimal 3 avatar)
    const handleToggleAvatar = (url: string) => {
        const currentList: string[] = [...(data.chat_settings.selected_avatars || [])];
        const index = currentList.indexOf(url);

        if (index > -1) {
            // Jangan biarkan kurang dari 1
            if (currentList.length <= 1) return;
            currentList.splice(index, 1);
        } else {
            if (currentList.length >= 3) {
                // Gantikan yang pertama jika sudah 3
                currentList.shift();
            }
            currentList.push(url);
        }

        updateChatSetting('selected_avatars', currentList);
    };

    // Handle upload file ke base64 Data URL untuk Icon, Favicon, Banner
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, settingKey: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            updateChatSetting(settingKey, base64);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Sinkronkan welcome_message dengan welcome_opening
        data.welcome_message = data.chat_settings.welcome_opening;
        put(`/admin/applications/${application.id}`);
    };

    const currentAvatars = data.chat_settings.selected_avatars || initialAvatars;

    return (
        <>
            <Head title={`Pengaturan ${application.name} - Admin`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 overflow-y-auto">
                {/* Header Tanpa Tombol Kembali */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Bot</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Konfigurasi lengkap tampilan livechat pengunjung dan pengaturan sistem AI untuk{' '}
                            <strong>{application.name}</strong>.
                        </p>
                    </div>

                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={processing}
                        className="gap-2 cursor-pointer shadow-xs min-w-40 bg-emerald-600 hover:bg-emerald-700 text-white font-bold self-start sm:self-auto"
                    >
                        {processing && <Spinner />}
                        Simpan Perubahan
                    </Button>
                </div>

                {/* FORM TAMPILAN DAN KONFIGURASI JADI SATU DENGAN LIVE PREVIEW */}
                <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* KOLOM KIRI: SEMUA PENGATURAN (7 COLS) */}
                    <div className="xl:col-span-7 space-y-6">
                        {/* 1. INFORMASI UTAMA & STATUS BOT */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Sliders className="size-4 text-emerald-600" />
                                    <span>Identitas & Status Chatbot</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Nama aplikasi, alamat URL unik, dan status aktif.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="name" className="text-xs font-semibold">Nama Chatbot</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => {
                                                setData('name', e.target.value);
                                                updateChatSetting('header_title', e.target.value);
                                            }}
                                            required
                                            className="text-xs"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="app_id" className="text-xs font-semibold">
                                            App ID (Slug URL /chat)
                                        </Label>
                                        <Input
                                            id="app_id"
                                            value={data.app_id}
                                            onChange={(e) => setData('app_id', slugify(e.target.value))}
                                            required
                                            className="font-mono text-xs"
                                        />
                                        <span className="text-[10px] text-muted-foreground block">
                                            URL Chatbot: <code className="font-mono">/chat/{data.app_id}</code>
                                        </span>
                                        <InputError message={errors.app_id} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="description" className="text-xs font-semibold">
                                        Deskripsi Singkat (Opsional)
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={2}
                                        className="text-xs"
                                    />
                                    <InputError message={errors.description} />
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-3">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="is_active" className="text-xs font-bold">Status Chatbot</Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            {data.is_active ? 'Aplikasi aktif & dapat diakses publik.' : 'Aplikasi offline (nonaktif).'}
                                        </p>
                                    </div>
                                    <Switch
                                        id="is_active"
                                        checked={data.is_active}
                                        onCheckedChange={(checked) => setData('is_active', checked)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. WARNA, TEKS & FILE IKON / FAVICON */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Palette className="size-4 text-amber-500" />
                                    <span>Warna, Ikon & Favicon Brand</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Warna background, warna teks sambutan, warna bar header, serta file icon dan favicon.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Warna Background */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Warna Background</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={data.chat_settings.bg_color}
                                                onChange={(e) => updateChatSetting('bg_color', e.target.value)}
                                                className="size-8 rounded-lg border border-border cursor-pointer p-0.5 bg-background shrink-0"
                                            />
                                            <Input
                                                value={data.chat_settings.bg_color}
                                                onChange={(e) => updateChatSetting('bg_color', e.target.value)}
                                                className="font-mono text-xs uppercase h-8"
                                            />
                                        </div>
                                    </div>

                                    {/* Warna Teks Sebelah */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Warna Teks Sambutan</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={data.chat_settings.text_color}
                                                onChange={(e) => updateChatSetting('text_color', e.target.value)}
                                                className="size-8 rounded-lg border border-border cursor-pointer p-0.5 bg-background shrink-0"
                                            />
                                            <Input
                                                value={data.chat_settings.text_color}
                                                onChange={(e) => updateChatSetting('text_color', e.target.value)}
                                                className="font-mono text-xs uppercase h-8"
                                            />
                                        </div>
                                    </div>

                                    {/* Warna Header */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Warna Bar Header</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={data.chat_settings.header_color}
                                                onChange={(e) => updateChatSetting('header_color', e.target.value)}
                                                className="size-8 rounded-lg border border-border cursor-pointer p-0.5 bg-background shrink-0"
                                            />
                                            <Input
                                                value={data.chat_settings.header_color}
                                                onChange={(e) => updateChatSetting('header_color', e.target.value)}
                                                className="font-mono text-xs uppercase h-8"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
                                    {/* Upload File Icon Brand */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold flex items-center justify-between">
                                            <span>File Ikon Brand (Logo)</span>
                                            {data.chat_settings.custom_icon_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => updateChatSetting('custom_icon_url', '')}
                                                    className="text-[10px] text-destructive hover:underline cursor-pointer flex items-center gap-0.5"
                                                >
                                                    <Trash2 className="size-2.5" /> Hapus
                                                </button>
                                            )}
                                        </Label>
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-10 rounded-xl border border-border flex items-center justify-center p-1 bg-muted/30 shrink-0">
                                                {data.chat_settings.custom_icon_url ? (
                                                    <img
                                                        src={data.chat_settings.custom_icon_url}
                                                        alt="Icon"
                                                        className="size-full object-contain"
                                                    />
                                                ) : (
                                                    <Sparkles className="size-5 text-amber-500" />
                                                )}
                                            </div>
                                            <input
                                                ref={iconInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileUpload(e, 'custom_icon_url')}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => iconInputRef.current?.click()}
                                                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                                            >
                                                <Upload className="size-3" />
                                                <span>Pilih File Ikon</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Upload File Favicon */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold flex items-center justify-between">
                                            <span>Favicon Tab Browser</span>
                                            {data.chat_settings.favicon_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => updateChatSetting('favicon_url', '')}
                                                    className="text-[10px] text-destructive hover:underline cursor-pointer flex items-center gap-0.5"
                                                >
                                                    <Trash2 className="size-2.5" /> Hapus
                                                </button>
                                            )}
                                        </Label>
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-10 rounded-xl border border-border flex items-center justify-center p-1 bg-muted/30 shrink-0">
                                                {data.chat_settings.favicon_url ? (
                                                    <img
                                                        src={data.chat_settings.favicon_url}
                                                        alt="Favicon"
                                                        className="size-full object-contain"
                                                    />
                                                ) : (
                                                    <Globe className="size-5 text-neutral-400" />
                                                )}
                                            </div>
                                            <input
                                                ref={faviconInputRef}
                                                type="file"
                                                accept="image/*,.ico"
                                                onChange={(e) => handleFileUpload(e, 'favicon_url')}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => faviconInputRef.current?.click()}
                                                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                                            >
                                                <Upload className="size-3" />
                                                <span>Pilih File Favicon</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. JUDUL & SUBTITLE SAMBUTAN */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Layout className="size-4 text-amber-500" />
                                    <span>Judul & Subtitle Sambutan</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Teks yang tampil di kolom kiri dan header atas livechat.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
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

                        {/* 4. GALERI FOTO PROFIL CS (CENTANG PILIH 3 GAMBAR) */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Users className="size-4 text-amber-500" />
                                        <span>Foto Profil 3 CS (Pilih dari Galeri)</span>
                                    </CardTitle>
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
                                        Terpilih: {currentAvatars.length} / 3 Foto
                                    </span>
                                </div>
                                <CardDescription className="text-xs">
                                    Cukup klik foto avatar di bawah untuk memilih 3 Customer Service yang akan ditampilkan di header livechat.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-5 gap-3">
                                    {PRESET_AVATARS.map((av) => {
                                        const isSelected = currentAvatars.includes(av.url);
                                        const selectedIndex = currentAvatars.indexOf(av.url);

                                        return (
                                            <button
                                                key={av.id}
                                                type="button"
                                                onClick={() => handleToggleAvatar(av.url)}
                                                className={`group relative flex flex-col items-center gap-1.5 p-1.5 rounded-2xl border-2 transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm scale-102'
                                                        : 'border-border/70 hover:border-amber-400 bg-card opacity-70 hover:opacity-100'
                                                }`}
                                            >
                                                <div className="relative size-12 sm:size-14 rounded-full overflow-hidden ring-2 ring-background">
                                                    <img
                                                        src={av.url}
                                                        alt={av.name}
                                                        className="size-full object-cover"
                                                    />
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-emerald-900/40 flex items-center justify-center">
                                                            <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                                                                <Check className="size-3 stroke-3" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <span className="text-[10px] font-semibold truncate max-w-full">
                                                    {av.name}
                                                </span>

                                                {isSelected && (
                                                    <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-bold shadow-2xs">
                                                        #{selectedIndex + 1}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 5. KARTU BANNER PROMOSI */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <ImageIcon className="size-4 text-amber-500" />
                                    <span>Kartu Banner Promosi (Beranda)</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Banner utama pada halaman beranda sebelum pengunjung memulai percakapan.
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

                                <div className="space-y-1.5 pt-1">
                                    <Label className="text-xs font-semibold flex items-center justify-between">
                                        <span>File Gambar Banner (Opsional)</span>
                                        {data.chat_settings.banner_image_url && (
                                            <button
                                                type="button"
                                                onClick={() => updateChatSetting('banner_image_url', '')}
                                                className="text-[10px] text-destructive hover:underline cursor-pointer flex items-center gap-0.5"
                                            >
                                                <Trash2 className="size-2.5" /> Hapus Gambar
                                            </button>
                                        )}
                                    </Label>
                                    <div className="flex items-center gap-3">
                                        {data.chat_settings.banner_image_url && (
                                            <img
                                                src={data.chat_settings.banner_image_url}
                                                alt="Banner"
                                                className="h-10 w-24 object-cover rounded-lg border border-border"
                                            />
                                        )}
                                        <input
                                            ref={bannerInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'banner_image_url')}
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => bannerInputRef.current?.click()}
                                            className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                                        >
                                            <Upload className="size-3" />
                                            <span>Upload File Banner</span>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 6. 4 TOMBOL CEPAT (GRID 2x2) */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <ArrowUpRight className="size-4 text-amber-500" />
                                    <span>4 Tombol Cepat (Grid 2×2 Beranda)</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Tombol pilihan di beranda. Pengunjung cukup klik untuk mengirim pertanyaan.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3.5">
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
                                                Kolom {btn.num <= 2 ? 'Atas' : 'Bawah'}
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

                        {/* 7. OPENING / PESAN PEMBUKA */}
                        <Card>
                            <CardHeader className="pb-3">
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
                                    rows={5}
                                    placeholder="Selamat Datang di CVTOGEL Link ANTI NAWALA..."
                                    className="font-mono text-xs leading-relaxed"
                                />
                                <span className="text-[10px] text-muted-foreground block">
                                    Gunakan format <code>[Judul Link](https://link-anda.com)</code> untuk membuat link yang dapat langsung diklik oleh pengguna.
                                </span>
                            </CardContent>
                        </Card>

                        {/* 8. SYSTEM PROMPT AI */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Bot className="size-4 text-emerald-600" />
                                    <span>System Prompt Bot AI</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Instruksi inti yang memandu kepribadian, basis pengetahuan, dan cara AI menjawab pertanyaan.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Textarea
                                    id="system_prompt"
                                    value={data.system_prompt}
                                    onChange={(e) => setData('system_prompt', e.target.value)}
                                    rows={10}
                                    required
                                    className="font-mono text-xs leading-relaxed min-h-60"
                                />
                                <InputError message={errors.system_prompt} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* KOLOM KANAN: LIVE PREVIEW DARI SISI ADMIN (5 COLS - STICKY TOP-6) */}
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
                            <div className="flex flex-row h-[520px] w-full overflow-hidden">
                                {/* KIRI 50%: SPLASH SCREEN */}
                                <div
                                    className="w-1/2 p-5 flex flex-col justify-center space-y-3 border-r border-black/10 transition-colors"
                                    style={{ color: data.chat_settings.text_color }}
                                >
                                    <div
                                        className="flex size-10 items-center justify-center rounded-full text-neutral-950 shadow-xs"
                                        style={{ backgroundColor: data.chat_settings.header_color }}
                                    >
                                        {data.chat_settings.custom_icon_url ? (
                                            <img
                                                src={data.chat_settings.custom_icon_url}
                                                alt="Icon"
                                                className="size-5 object-contain"
                                            />
                                        ) : (
                                            <Sparkles className="size-5" />
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-75 block line-clamp-1">
                                            {data.chat_settings.splash_subtitle}
                                        </span>
                                        <h4 className="text-sm font-extrabold leading-tight line-clamp-2">
                                            {data.chat_settings.splash_title}
                                        </h4>
                                        <p className="text-[10px] font-medium pt-0.5 opacity-85 line-clamp-1">
                                            {data.chat_settings.splash_description}
                                        </p>
                                    </div>
                                </div>

                                {/* KANAN 50%: LIVECHAT WIDGET INTERAKTIF */}
                                <div className="w-1/2 bg-white flex flex-col h-full overflow-hidden shadow-md">
                                    {/* HEADER ATAS */}
                                    <div
                                        className="px-3 py-2.5 text-neutral-950 shrink-0 border-b border-black/10"
                                        style={{ backgroundColor: data.chat_settings.header_color }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-amber-300">
                                                    {data.chat_settings.custom_icon_url ? (
                                                        <img
                                                            src={data.chat_settings.custom_icon_url}
                                                            alt="Icon"
                                                            className="size-3.5 object-contain"
                                                        />
                                                    ) : (
                                                        <Sparkles className="size-3" />
                                                    )}
                                                </div>
                                                <span className="font-extrabold text-[11px] truncate uppercase">
                                                    {data.chat_settings.header_title}
                                                </span>
                                            </div>

                                            {/* 3 FOTO AVATAR CS YANG TERPILIH */}
                                            <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                                {currentAvatars.slice(0, 3).map((url, idx) => (
                                                    <img
                                                        key={idx}
                                                        className="inline-block size-5 rounded-full ring-1.5 ring-white object-cover"
                                                        src={url}
                                                        alt={`CS ${idx + 1}`}
                                                    />
                                                ))}
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
                            Setiap perubahan warna, teks, foto CS, banner, dan tombol langsung tampil pada preview di atas secara real-time.
                        </p>
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
