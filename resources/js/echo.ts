import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

window.Pusher = Pusher;

// Deteksi otomatis apakah berjalan di localhost atau di domain VPS publik
const isBrowser = typeof window !== 'undefined';
const isHttps = isBrowser && window.location.protocol === 'https:';
const currentHost = isBrowser ? window.location.hostname : 'localhost';

// Di VPS / domain publik, gunakan hostname saat ini agar tidak salah mengarah ke localhost user
const reverbHost =
    import.meta.env.VITE_REVERB_HOST &&
    import.meta.env.VITE_REVERB_HOST !== 'localhost' &&
    import.meta.env.VITE_REVERB_HOST !== '127.0.0.1'
        ? import.meta.env.VITE_REVERB_HOST
        : currentHost;

const reverbPort = isHttps
    ? Number(import.meta.env.VITE_REVERB_PORT ?? 443)
    : Number(import.meta.env.VITE_REVERB_PORT ?? 8085);

export const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: reverbHost,
    wsPort: reverbPort,
    wssPort: reverbPort,
    forceTLS: isHttps || (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
});
