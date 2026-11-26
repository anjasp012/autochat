let sharedAudioContext: AudioContext | null = null;
let lastChimePlayedAt = 0;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!sharedAudioContext) {
        sharedAudioContext = new AudioCtx();
    }

    return sharedAudioContext;
}

export function unlockNotificationAudio(): void {
    try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            void ctx.resume().catch(() => {});
        }
    } catch {
        // Ignore browser audio errors
    }
}

export function playNotificationChime(): void {
    const nowMs = Date.now();
    // Hindari nada berulang bertumpuk jika beberapa event masuk bersamaan (misal MessageSent + Escalation)
    if (nowMs - lastChimePlayedAt < 1500) {
        return;
    }

    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            void ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;

        // Nada notif dua ketukan lembut (D5 -> A5)
        const notes = [
            { freq: 587.33, start: 0, duration: 0.14 },
            { freq: 880.0, start: 0.11, duration: 0.28 },
        ];

        notes.forEach(({ freq, start, duration }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + start);

            gain.gain.setValueAtTime(0.001, now + start);
            gain.gain.exponentialRampToValueAtTime(0.16, now + start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + start);
            osc.stop(now + start + duration + 0.02);
        });

        lastChimePlayedAt = nowMs;
    } catch {
        // Browser may block autoplay before first user gesture
    }
}
