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
    Plus,
    Save,
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

interface QuickButton {
    id?: string;
    title: string;
    type: 'query' | 'link';
    value: string;
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
        name: 'Amanda',
    },
    {
        id: 'cs5',
        url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        name: 'Rian',
    },
    {
        id: 'cs6',
        url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        name: 'Bella',
    },
    {
        id: 'cs7',
        url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        name: 'Kevin',
    },
    {
        id: 'cs8',
        url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
        name: 'Maya',
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
    const initialAvatars: string[] =
        Array.isArray(currentSettings.selected_avatars) && currentSettings.selected_avatars.length === 3
            ? currentSettings.selected_avatars
            : [
                  currentSettings.avatar_1 || PRESET_AVATARS[0].url,
                  currentSettings.avatar_2 || PRESET_AVATARS[1].url,
                  currentSettings.avatar_3 || PRESET_AVATARS[2].url,
              ];

    // Inisialisasi tombol cepat dinamis
    const initialQuickButtons: QuickButton[] =
        Array.isArray(currentSettings.quick_buttons) && currentSettings.quick_buttons.length > 0
            ? currentSettings.quick_buttons
            : [
                  {
                      id: 'btn-1',
                      title: currentSettings.btn_1_title || 'Prediksi Togel',
                      type: 'query',
                      value:
                          currentSettings.btn_1_query ||
                          'Halo CS, bisa berikan bocoran prediksi togel dan pasaran hari ini?',
                  },
                  {
                      id: 'btn-2',
                      title: currentSettings.btn_2_title || 'Rtp Slot Gacor',
                      type: 'query',
                      value:
                          currentSettings.btn_2_query ||
                          'Halo CS, apa saja daftar RTP slot yang lagi gacor hari ini?',
                  },
                  {
                      id: 'btn-3',
                      title: currentSettings.btn_3_title || 'Download APK',
                      type: 'link',
                      value: currentSettings.btn_3_query || 'https://kiamkiam.site/cvtogel1',
                  },
                  {
                      id: 'btn-4',
                      title: currentSettings.btn_4_title || 'Promosi',
                      type: 'query',
                      value:
                          currentSettings.btn_4_query ||
                          'Bisa jelaskan promo dan bonus deposit / new member terbaru yang sedang aktif?',
                  },
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
        temperature: application.temperature ?? 0.7,
        max_tokens: application.max_tokens ?? 2048,
        is_active: application.is_active,

        // Kustomisasi Lengkap Tampilan Livechat
        chat_settings: {
            bg_color: currentSettings.bg_color || '#FFF9E6',
            text_color: currentSettings.text_color || '#171717',
            header_color: currentSettings.header_color || '#FFD200',
            header_text_color: currentSettings.header_text_color || '#0a0a0a',
            custom_icon_url: currentSettings.custom_icon_url || '',
            favicon_url: currentSettings.favicon_url || '',
            splash_title: currentSettings.splash_title || `Selamat Datang di Livechat ${application.name} 😊`,
            splash_subtitle: currentSettings.splash_subtitle || `CHAT DENGAN TIM ${application.name.toUpperCase()}`,
            splash_description: currentSettings.splash_description || 'Ada yang Bisa Kami Bantu, Bosku?',
            header_title: currentSettings.header_title || application.name,
            selected_avatars: initialAvatars,
            banner_type: currentSettings.banner_type || (currentSettings.banner_image_url ? 'image' : 'text'),
            banner_badge: currentSettings.banner_badge || 'OFFICIAL 24/7 SUPPORT',
            banner_title: currentSettings.banner_title || application.name,
            banner_description:
                currentSettings.banner_description ||
                'Pusat Bantuan Resmi & Layanan Member 24 Jam Nonstop. Proses Deposit & WD Tercepat, Promo & Event Menarik!',
            banner_image_url: currentSettings.banner_image_url || '',
            quick_buttons: initialQuickButtons,
            welcome_opening:
                currentSettings.welcome_opening ||
                application.welcome_message ||
                `Selamat Datang di ${application.name} Link ANTI NAWALA ${application.name}\n[https://kiamkiam.site/cvtogel1](https://kiamkiam.site/cvtogel1)\n[https://kiamkiam.site/cvtogel2](https://kiamkiam.site/cvtogel2)\nWHATSAPP [https://kiamkiam.site/wacvtogel](https://kiamkiam.site/wacvtogel)\nTELEGRAM [https://kiamkiam.site/telecvtogel](https://kiamkiam.site/telecvtogel)\n( WAJIB DI SIMPAN )`,
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
            if (currentList.length <= 1) return;
            currentList.splice(index, 1);
        } else {
            if (currentList.length >= 3) {
                currentList.shift();
            }
            currentList.push(url);
        }

        updateChatSetting('selected_avatars', currentList);
    };

    // Handler Tambah, Hapus, dan Edit Tombol Cepat Dinamis
    const handleAddButton = () => {
        const list = [...(data.chat_settings.quick_buttons || [])];
        list.push({
            id: `btn-${Date.now()}`,
            title: '',
            type: 'query',
            value: '',
        });
        updateChatSetting('quick_buttons', list);
    };

    const handleRemoveButton = (index: number) => {
        const list = [...(data.chat_settings.quick_buttons || [])];
        list.splice(index, 1);
        updateChatSetting('quick_buttons', list);
    };

    const handleUpdateButton = (index: number, key: 'title' | 'type' | 'value', val: string) => {
        const list = [...(data.chat_settings.quick_buttons || [])];
        list[index] = {
            ...list[index],
            [key]: val,
        };
        updateChatSetting('quick_buttons', list);
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
    const currentQuickButtons = data.chat_settings.quick_buttons || initialQuickButtons;
    const isImageBannerActive =
        (data.chat_settings.banner_type === 'image' || (!data.chat_settings.banner_type && Boolean(data.chat_settings.banner_image_url))) &&
        Boolean(data.chat_settings.banner_image_url);

    return (
        <>
            <Head title={`Pengaturan ${application.name} - Admin`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 overflow-y-auto">
                {/* Header Tanpa Tombol Kembali */}
                <div className="border-b border-border pb-4">
                    <h1 className="text-2xl font-bold tracking-tight">Pengaturan Bot</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Konfigurasi lengkap tampilan livechat pengunjung dan pengaturan sistem AI untuk{' '}
                        <strong>{application.name}</strong>.
                    </p>
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

                        {/* 2. WARNA (KIRI & KANAN), FILE IKON & FAVICON */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Palette className="size-4 text-amber-500" />
                                    <span>Warna, Ikon & Favicon Brand</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Atur warna background kiri, teks kiri, bar header kanan, teks kanan, serta file ikon & favicon.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Warna Background (Kiri) */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Warna Background (Kiri)</Label>
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

                                    {/* Warna Teks Kiri (Splash) */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Warna Teks Kiri (Splash)</Label>
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

                                    {/* Warna Bar Header (Kanan) */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Warna Header (Kanan)</Label>
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

                                    {/* Warna Teks Kanan (Header) */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Warna Teks Kanan (Header)</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={data.chat_settings.header_text_color}
                                                onChange={(e) => updateChatSetting('header_text_color', e.target.value)}
                                                className="size-8 rounded-lg border border-border cursor-pointer p-0.5 bg-background shrink-0"
                                            />
                                            <Input
                                                value={data.chat_settings.header_text_color}
                                                onChange={(e) => updateChatSetting('header_text_color', e.target.value)}
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
                                    Cukup klik foto avatar di bawah untuk memilih 3 Customer Service yang akan ditampilkan rapi berjejer di header livechat.
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

                        {/* 5. KARTU BANNER PROMOSI (PILIH GAMBAR ATAU TEKS) */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <ImageIcon className="size-4 text-amber-500" />
                                    <span>Banner Promosi Beranda</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Pilih jenis banner yang ingin ditampilkan pada halaman beranda pengunjung: Foto banner penuh atau teks promosi.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* PILIHAN JENIS BANNER: GAMBAR ATAU TEKS */}
                                <div className="flex rounded-lg bg-muted p-1 gap-1 border border-border/60">
                                    <button
                                        type="button"
                                        onClick={() => updateChatSetting('banner_type', 'image')}
                                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                            data.chat_settings.banner_type === 'image' || (!data.chat_settings.banner_type && data.chat_settings.banner_image_url)
                                                ? 'bg-background text-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <ImageIcon className="size-3.5" />
                                        <span>Gunakan Foto / Gambar Banner</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateChatSetting('banner_type', 'text')}
                                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                            data.chat_settings.banner_type === 'text' || (!data.chat_settings.banner_type && !data.chat_settings.banner_image_url)
                                                ? 'bg-background text-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Layout className="size-3.5" />
                                        <span>Gunakan Teks & Badge Promosi</span>
                                    </button>
                                </div>

                                {/* KONTEN SESUAI PILIHAN BANNER */}
                                {data.chat_settings.banner_type === 'image' || (!data.chat_settings.banner_type && data.chat_settings.banner_image_url) ? (
                                    /* PILIHAN 1: HANYA FORM FOTO BANNER */
                                    <div className="space-y-3 pt-1">
                                        {data.chat_settings.banner_image_url ? (
                                            <div className="relative rounded-2xl overflow-hidden border border-border shadow-xs group">
                                                <img
                                                    src={data.chat_settings.banner_image_url}
                                                    alt="Banner Preview"
                                                    className="w-full h-44 object-cover"
                                                />
                                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => bannerInputRef.current?.click()}
                                                        className="h-8 text-xs font-semibold gap-1.5 cursor-pointer bg-white/90 hover:bg-white text-neutral-900 shadow-sm"
                                                    >
                                                        <Upload className="size-3" /> Ganti Foto
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => updateChatSetting('banner_image_url', '')}
                                                        className="h-8 text-xs gap-1 cursor-pointer shadow-sm"
                                                    >
                                                        <Trash2 className="size-3" /> Hapus
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => bannerInputRef.current?.click()}
                                                className="border-2 border-dashed border-border/80 hover:border-amber-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-amber-50/20 space-y-2"
                                            >
                                                <div className="flex size-10 items-center justify-center rounded-full bg-muted mx-auto text-muted-foreground">
                                                    <Upload className="size-5" />
                                                </div>
                                                <p className="text-xs font-bold text-foreground">Upload Foto Banner Penuh</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Klik untuk memilih gambar banner (JPG, PNG, WebP). Banner akan tampil penuh tanpa border/card.
                                                </p>
                                            </div>
                                        )}
                                        <input
                                            ref={bannerInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'banner_image_url')}
                                            className="hidden"
                                        />
                                    </div>
                                ) : (
                                    /* PILIHAN 2: HANYA FORM TEKS & BADGE PROMOSI */
                                    <div className="space-y-3.5 pt-1">
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
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 6. TOMBOL CEPAT DINAMIS BERANDA (BISA 1, 2, ATAU BANYAK, TIPE PERTANYAAN / LINK) */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <ArrowUpRight className="size-4 text-amber-500" />
                                        <span>Tombol Cepat Beranda ({currentQuickButtons.length} Tombol)</span>
                                    </CardTitle>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddButton}
                                        className="h-8 text-xs font-semibold gap-1.5 cursor-pointer text-emerald-600 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                    >
                                        <Plus className="size-3.5" />
                                        <span>Tambah Tombol</span>
                                    </Button>
                                </div>
                                <CardDescription className="text-xs">
                                    Atur tombol di beranda secara fleksibel (bisa 1, 2, atau berapapun). Tiap tombol bisa berupa pesan otomatis ke chat atau link eksternal (WA, Telegram, APK, web).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3.5">
                                {currentQuickButtons.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-border rounded-xl space-y-2">
                                        <p className="text-xs text-muted-foreground">Belum ada tombol cepat.</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddButton}
                                            className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                                        >
                                            <Plus className="size-3.5" />
                                            <span>Tambah Tombol Sekarang</span>
                                        </Button>
                                    </div>
                                ) : (
                                    currentQuickButtons.map((btn: any, idx: number) => (
                                        <div
                                            key={btn.id || idx}
                                            className="rounded-xl border border-border/80 bg-muted/10 p-3 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                                                        {idx + 1}
                                                    </span>
                                                    <span>Tombol #{idx + 1}</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveButton(idx)}
                                                    className="text-muted-foreground hover:text-destructive text-xs cursor-pointer p-1 rounded-md transition-colors"
                                                    title="Hapus tombol ini"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-semibold text-muted-foreground">
                                                        Judul / Label Tombol
                                                    </Label>
                                                    <Input
                                                        value={btn.title}
                                                        onChange={(e) => handleUpdateButton(idx, 'title', e.target.value)}
                                                        placeholder="Contoh: Prediksi Togel atau WhatsApp CS"
                                                        className="text-xs"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-semibold text-muted-foreground">
                                                        Aksi Saat Diklik
                                                    </Label>
                                                    <div className="flex rounded-lg bg-muted p-0.5 gap-0.5 border border-border/60 h-9">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateButton(idx, 'type', 'query')}
                                                            className={`flex-1 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                btn.type === 'query'
                                                                    ? 'bg-background text-foreground shadow-xs'
                                                                    : 'text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        >
                                                            <MessageSquare className="size-3" />
                                                            <span>Pertanyaan</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateButton(idx, 'type', 'link')}
                                                            className={`flex-1 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                btn.type === 'link'
                                                                    ? 'bg-background text-foreground shadow-xs'
                                                                    : 'text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        >
                                                            <Globe className="size-3" />
                                                            <span>Link URL</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                                    {btn.type === 'link' ? (
                                                        <>
                                                            <Globe className="size-3 text-emerald-600" />
                                                            <span>Alamat URL Tujuan (Buka di Tab Baru)</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <MessageSquare className="size-3 text-amber-500" />
                                                            <span>Pesan / Pertanyaan Otomatis (Dikirim ke Chat)</span>
                                                        </>
                                                    )}
                                                </Label>
                                                <Input
                                                    value={btn.value}
                                                    onChange={(e) => handleUpdateButton(idx, 'value', e.target.value)}
                                                    placeholder={
                                                        btn.type === 'link'
                                                            ? 'https://wa.me/628123456789 atau https://kiamkiam.site/...'
                                                            : 'Halo CS, saya mau informasi bocoran pasaran hari ini...'
                                                    }
                                                    className={`text-xs ${btn.type === 'link' ? 'font-mono' : ''}`}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* 7. PESAN PEMBUKA & LINK ANTI NAWALA */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <MessageSquare className="size-4 text-amber-500" />
                                    <span>Pesan Pembuka & Link Resmi Anti Nawala</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Pesan selamat datang yang muncul pertama kali di kartu informasi livechat.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Textarea
                                    value={data.chat_settings.welcome_opening}
                                    onChange={(e) => updateChatSetting('welcome_opening', e.target.value)}
                                    rows={5}
                                    className="font-mono text-xs leading-relaxed"
                                    placeholder="Selamat Datang di Link Alternatif Resmi..."
                                />
                                <span className="text-[11px] text-muted-foreground block">
                                    Format Markdown didukung: <code className="font-mono text-emerald-600">[Link Teks](https://url)</code>.
                                </span>
                            </CardContent>
                        </Card>

                        {/* 8. PENGATURAN MODEL AI & SYSTEM PROMPT */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Bot className="size-4 text-emerald-600" />
                                    <span>Instruksi AI (System Prompt) & Model</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Atur perilaku, nada bicara, serta model AI untuk menjawab chat secara otomatis.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="model" className="text-xs font-semibold">Model AI</Label>
                                        <Input
                                            id="model"
                                            value={data.model}
                                            onChange={(e) => setData('model', e.target.value)}
                                            required
                                            className="font-mono text-xs"
                                        />
                                        <InputError message={errors.model} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="temperature" className="text-xs font-semibold">
                                            Temperature ({data.temperature})
                                        </Label>
                                        <Input
                                            id="temperature"
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            max="2"
                                            value={data.temperature}
                                            onChange={(e) => setData('temperature', parseFloat(e.target.value))}
                                            className="text-xs"
                                        />
                                        <InputError message={errors.temperature} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="max_tokens" className="text-xs font-semibold">
                                            Max Tokens
                                        </Label>
                                        <Input
                                            id="max_tokens"
                                            type="number"
                                            step="128"
                                            min="128"
                                            max="8192"
                                            value={data.max_tokens}
                                            onChange={(e) => setData('max_tokens', parseInt(e.target.value))}
                                            className="text-xs"
                                        />
                                        <InputError message={errors.max_tokens} />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="system_prompt" className="text-xs font-semibold">
                                        System Prompt (Karakter & Instruksi Bot)
                                    </Label>
                                    <Textarea
                                        id="system_prompt"
                                        value={data.system_prompt}
                                        onChange={(e) => setData('system_prompt', e.target.value)}
                                        rows={10}
                                        required
                                        className="font-mono text-xs leading-relaxed"
                                        placeholder="Kamu adalah asisten customer support profesional..."
                                    />
                                    <InputError message={errors.system_prompt} />
                                </div>
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
                                    <div className="flex items-center">
                                        {data.chat_settings.custom_icon_url ? (
                                            <img
                                                src={data.chat_settings.custom_icon_url}
                                                alt="Logo"
                                                className="h-9 w-auto max-w-[140px] object-contain drop-shadow-xs"
                                            />
                                        ) : (
                                            <Sparkles className="size-6" style={{ color: data.chat_settings.header_color }} />
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
                                        className="px-3 py-2.5 shrink-0 border-b border-black/10 transition-colors"
                                        style={{
                                            backgroundColor: data.chat_settings.header_color,
                                            color: data.chat_settings.header_text_color || '#0a0a0a',
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="flex items-center shrink-0">
                                                    {data.chat_settings.custom_icon_url ? (
                                                        <img
                                                            src={data.chat_settings.custom_icon_url}
                                                            alt="Icon"
                                                            className="h-5 w-auto max-w-[80px] object-contain"
                                                        />
                                                    ) : (
                                                        <Sparkles className="size-3" />
                                                    )}
                                                </div>
                                                <span
                                                    className="font-extrabold text-[11px] truncate uppercase"
                                                    style={{ color: data.chat_settings.header_text_color || '#0a0a0a' }}
                                                >
                                                    {data.chat_settings.header_title}
                                                </span>
                                            </div>

                                            {/* 3 FOTO AVATAR CS YANG TERPILIH (RAPI BERJEJER) */}
                                            <div className="flex items-center -space-x-1.5 overflow-visible pl-0.5 shrink-0">
                                                {currentAvatars.slice(0, 3).map((url, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="relative size-6 rounded-full ring-1.5 ring-white shadow-2xs overflow-hidden shrink-0 bg-neutral-200"
                                                        style={{ zIndex: 10 - idx }}
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={`CS ${idx + 1}`}
                                                            className="size-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-1.5">
                                            <p
                                                className="text-[8px] font-medium line-clamp-1 opacity-80"
                                                style={{ color: data.chat_settings.header_text_color || '#0a0a0a' }}
                                            >
                                                {data.chat_settings.splash_title}
                                            </p>
                                            <p
                                                className="text-[9px] font-bold line-clamp-1"
                                                style={{ color: data.chat_settings.header_text_color || '#0a0a0a' }}
                                            >
                                                {data.chat_settings.splash_description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* BODY BERANDA DENGAN BANNER & TOMBOL DINAMIS */}
                                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 bg-slate-50/70">
                                        {/* BANNER PROMOSI (FOTO PENUH ATAU KARTU TEKS) */}
                                        {isImageBannerActive ? (
                                            <div className="relative overflow-hidden rounded-xl shadow-2xs w-full">
                                                <img
                                                    src={data.chat_settings.banner_image_url}
                                                    alt="Banner Preview"
                                                    className="w-full h-auto rounded-xl block"
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-neutral-950 via-neutral-900 to-amber-950 p-2.5 text-white shadow-2xs border border-amber-500/30 text-center">
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
                                            </div>
                                        )}

                                        {/* TOMBOL CEPAT DINAMIS (PREVIEW) */}
                                        {currentQuickButtons.length > 0 && (
                                            <div
                                                className={`grid gap-1.5 ${
                                                    currentQuickButtons.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                                                }`}
                                            >
                                                {currentQuickButtons.map((btn: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-2 text-left shadow-2xs"
                                                    >
                                                        <span className="text-[9px] font-bold text-neutral-800 truncate">
                                                            {btn.title || `Tombol ${idx + 1}`}
                                                        </span>
                                                        {btn.type === 'link' ? (
                                                            <Globe className="size-2.5 text-emerald-600 shrink-0" />
                                                        ) : (
                                                            <ArrowUpRight className="size-2.5 text-neutral-400 shrink-0" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* TOMBOL KIRIM PESAN */}
                                        <div
                                            className="w-full flex items-center justify-center gap-1.5 rounded-lg font-bold py-1.5 text-[10px] shadow-2xs"
                                            style={{
                                                backgroundColor: data.chat_settings.header_color,
                                                color: data.chat_settings.header_text_color || '#0a0a0a',
                                            }}
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

                        {/* TOMBOL SIMPAN PERUBAHAN DI BAWAH PREVIEW (SESUAI REQUEST USER) */}
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={processing}
                            className="w-full py-5 text-sm font-bold gap-2 cursor-pointer shadow-md bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all"
                        >
                            {processing && <Spinner />}
                            <Save className="size-4" />
                            Simpan Perubahan
                        </Button>

                        <p className="text-[11px] text-muted-foreground text-center">
                            Setiap perubahan warna, teks kiri/kanan, foto CS, banner, dan tombol cepat langsung tampil pada preview di atas secara real-time.
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
