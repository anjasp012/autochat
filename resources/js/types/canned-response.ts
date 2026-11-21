export interface CannedResponse {
    id: string;
    shortcut: string; // e.g. "marketing", "telegram", "rekening"
    content: string;
    scope: 'shared' | 'private';
    created_by?: string;
    updated_at?: string;
}

export const DEFAULT_CANNED_RESPONSES: CannedResponse[] = [
    {
        id: 'cr-1',
        shortcut: 'marketing',
        content: `Untuk Segala bentuk penawaran IKLAN / YOUTUBE / FB UNTUK SITUS CV TOGEL
Silakan add WA marketing kami di bawah ini :
WA : +62 819-7426-404

Terima kasih.`,
        scope: 'shared',
        created_by: 'CS2 - CVTOGEL',
        updated_at: '14 November 2026',
    },
    {
        id: 'cr-2',
        shortcut: 'telegram',
        content: `Informasi kepada seluruh Membersetia CVTOGEL
📢 TELEGRAM RESMI CS CVTOGEL
https://kiamkiam.site/telecvtogel

Terima kasih atas perhatian dan kepercayaannya.`,
        scope: 'shared',
        created_by: 'CS2 - CVTOGEL',
        updated_at: '14 November 2026',
    },
    {
        id: 'cr-3',
        shortcut: 'rekening',
        content: `Halo Bosku, untuk tujuan rekening deposit aktif silakan selalu cek di menu Deposit pada website resmi sebelum melakukan transfer ya Bosku. Terima kasih.`,
        scope: 'shared',
        created_by: 'Admin CVTOGEL',
        updated_at: '15 November 2026',
    },
    {
        id: 'cr-4',
        shortcut: 'deposit-kendala',
        content: `Mohon maaf atas ketidaknyamanannya Bosku. Boleh dibantu kirimkan bukti transfer yang jelas (struk/mutasi) agar segera kami bantu koordinasikan dengan bagian keuangan kami ya Bosku.`,
        scope: 'shared',
        created_by: 'Admin CVTOGEL',
        updated_at: '16 November 2026',
    },
    {
        id: 'cr-5',
        shortcut: 'terima-kasih',
        content: `Sama-sama Bosku. Senang bisa membantu Bosku hari ini. Jika ada hal lain yang ingin ditanyakan, jangan ragu untuk menghubungi kami kembali ya. Semoga beruntung dan salam jackpot selalu! 🍀`,
        scope: 'shared',
        created_by: 'Admin CVTOGEL',
        updated_at: '18 November 2026',
    },
    {
        id: 'cr-6',
        shortcut: 'akunlimit',
        content: `Halo Bosku, terkait kendala akun limit, silakan infokan User ID Bosku terlebih dahulu ya. Batas limit taruhan atau limit akun dapat ditinjau kembali oleh tim terkait setelah pengecekan data akun. Mohon ditunggu sebentar ya Bosku 🙏`,
        scope: 'shared',
        created_by: 'Admin CVTOGEL',
        updated_at: '21 November 2026',
    },
];
