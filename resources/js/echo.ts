import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

window.Pusher = Pusher;

// Deteksi otomatis apakah berjalan di localhost/Laragon (.to, .test) atau di domain VPS publik
const isBrowser = typeof window !== 'undefined';
const isHttps = isBrowser && window.location.protocol === 'https:';
const hostname = isBrowser ? window.location.hostname : 'localhost';
const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.to') ||
    hostname.endsWith('.test');

// Pada lingkungan lokal / Laragon, Reverb berjalan di HTTP port 8085 (plain ws).
// Browser mengizinkan koneksi ws://127.0.0.1:8085 meskipun diakses via https://autochat.to karena 127.0.0.1 adalah trustworthy origin.
const reverbHost = isLocal
    ? '127.0.0.1'
    : import.meta.env.VITE_REVERB_HOST &&
        import.meta.env.VITE_REVERB_HOST !== 'localhost' &&
        import.meta.env.VITE_REVERB_HOST !== '127.0.0.1'
      ? import.meta.env.VITE_REVERB_HOST
      : hostname;

const reverbPort = isLocal
    ? Number(import.meta.env.VITE_REVERB_PORT ?? 8085)
    : isHttps
      ? Number(import.meta.env.VITE_REVERB_PORT ?? 443)
      : Number(import.meta.env.VITE_REVERB_PORT ?? 8085);

// On local / Laragon, Reverb runs on plain HTTP (ws://127.0.0.1:8085).
// We must restrict enabledTransports to ['ws'] on local so Pusher does not attempt TLS (wss://) on a plain port.
const enabledTransports = isLocal ? ['ws'] : isHttps ? ['wss'] : ['ws', 'wss'];
const forceTLS = !isLocal && isHttps;

export const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: reverbHost,
    wsPort: reverbPort,
    wssPort: reverbPort,
    forceTLS: forceTLS,
    enabledTransports: enabledTransports,
});
