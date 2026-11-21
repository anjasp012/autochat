import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

window.Pusher = Pusher;

// Deteksi otomatis apakah berjalan di localhost atau di domain/IP VPS publik
const isBrowser = typeof window !== 'undefined';
const isHttps = isBrowser && window.location.protocol === 'https:';
const hostname = isBrowser ? window.location.hostname : 'localhost';
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

// Prioritaskan domain/IP tempat aplikasi diakses di browser pengguna,
// kecuali VITE_REVERB_HOST didefinisikan secara eksplisit ke domain eksternal khusus.
const reverbHost =
    import.meta.env.VITE_REVERB_HOST &&
    import.meta.env.VITE_REVERB_HOST !== 'localhost' &&
    import.meta.env.VITE_REVERB_HOST !== '127.0.0.1' &&
    import.meta.env.VITE_REVERB_HOST !== '0.0.0.0'
        ? import.meta.env.VITE_REVERB_HOST
        : hostname;

// Port logic:
// Pada HTTPS (VPS / Production dengan SSL):
// Jika menggunakan reverse proxy Nginx pada port 443 (standar Laravel Reverb),
// browser menghubungkan wss://domain:443/app.
// Jika port disetel manual selain 8085 (misal 443), gunakan nilai tersebut.
const envPort = import.meta.env.VITE_REVERB_PORT ? Number(import.meta.env.VITE_REVERB_PORT) : undefined;
const reverbPort = isHttps
    ? (envPort && envPort !== 8085 ? envPort : 443)
    : (envPort ?? 8085);

const forceTLS = isHttps || import.meta.env.VITE_REVERB_SCHEME === 'https';

// Di lokal HTTP development murni (http://localhost:8000), cegah Pusher memaksa wss:
if (isLocalhost && !isHttps && (Pusher as any).Runtime) {
    (Pusher as any).Runtime.getProtocol = () => 'http:';
}

export const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: reverbHost,
    wsPort: reverbPort,
    wssPort: reverbPort,
    forceTLS: forceTLS,
    enabledTransports: ['ws', 'wss'],
});

if (isBrowser) {
    window.Echo = echo;
    (Pusher as any).logToConsole = true;
}
