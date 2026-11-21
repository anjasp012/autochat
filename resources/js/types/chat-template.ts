export interface ChatTemplate {
    id: string;
    topic: string;
    bot_reply: string;
    form_type?: 'none' | 'deposit_status' | 'withdraw_status';
}

export interface PresetAvatar {
    id: string;
    url: string;
    name: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
    {
        id: 'cs1',
        url: '/images/avatars/cs-1.png',
        name: 'Rahma',
    },
    {
        id: 'cs2',
        url: '/images/avatars/cs-2.png',
        name: 'Nindy',
    },
    {
        id: 'cs3',
        url: '/images/avatars/cs-3.png',
        name: 'Rosa',
    },
    {
        id: 'cs4',
        url: '/images/avatars/cs-4.png',
        name: 'Intan',
    },
];

export const DEFAULT_CHAT_TEMPLATES: ChatTemplate[] = [
    {
        id: 'tpl-1',
        topic: 'Deposit',
        bot_reply: 'Silakan isi data di form yang muncul ya Bosku, biar saya cek status depositnya.',
        form_type: 'deposit_status',
    },
    {
        id: 'tpl-2',
        topic: 'Withdraw',
        bot_reply: 'Silakan isi data di form yang muncul ya Bosku, biar saya cek status withdraw-nya.',
        form_type: 'withdraw_status',
    },
    {
        id: 'tpl-3',
        topic: 'Klaim Bonus & Promo',
        bot_reply: 'Hallo bosku 👋 {waktu}, ada yang bisa dibantu terkait klaim bonus atau promonya, Bosku?',
        form_type: 'none',
    },
    {
        id: 'tpl-4',
        topic: 'Kendala Login & Akun',
        bot_reply: 'Hallo bosku 👋 {waktu}, ada kendala saat login atau lupa password akunnya, Bosku? Mohon infokan kendalanya ya.',
        form_type: 'none',
    },
    {
        id: 'tpl-5',
        topic: 'Prediksi & Pasaran Togel',
        bot_reply: 'Hallo bosku 👋 {waktu}, ingin info prediksi pasaran togel apa hari ini, Bosku?',
        form_type: 'none',
    },
    {
        id: 'tpl-6',
        topic: 'Bocoran Slot Gacor',
        bot_reply: 'Hallo bosku 👋 {waktu}, sedang mencari bocoran slot gacor provider apa hari ini, Bosku?',
        form_type: 'none',
    },
    {
        id: 'tpl-7',
        topic: 'Lainnya',
        bot_reply: 'Hallo bosku 👋 {waktu}, ada yang bisa kami bantu hari ini, Bosku?',
        form_type: 'none',
    },
];
