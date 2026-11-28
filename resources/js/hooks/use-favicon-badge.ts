import { useEffect, useRef } from 'react';

const BASE_FAVICON_URL = '/favicon.png?v=20261128b';

function drawRoundedPill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function updateFaviconLinks(href: string) {
    let links = Array.from(
        document.querySelectorAll<HTMLLinkElement>("link[rel*='icon'], link[rel='apple-touch-icon']"),
    );

    if (links.length === 0) {
        ['icon', 'shortcut icon'].forEach((rel) => {
            const link = document.createElement('link');
            link.rel = rel;
            link.type = 'image/png';
            document.head.appendChild(link);
            links.push(link);
        });
    }

    links.forEach((link) => {
        link.type = 'image/png';
        link.href = href;
    });
}

export function useFaviconBadge(count: number) {
    const baseImageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const safeCount = Math.max(0, Math.floor(count || 0));

        if (safeCount === 0) {
            updateFaviconLinks(BASE_FAVICON_URL);
            return;
        }

        let isCancelled = false;

        const renderBadge = (img: HTMLImageElement) => {
            if (isCancelled) return;

            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);

            const label = safeCount > 99 ? '99+' : String(safeCount);
            const badgeHeight = 34;
            const badgeWidth = label.length >= 3 ? 50 : label.length === 2 ? 42 : 34;
            const radius = badgeHeight / 2;
            const right = size - 1;
            const top = 1;
            const left = right - badgeWidth;
            const centerX = left + badgeWidth / 2;
            const centerY = top + badgeHeight / 2;

            // Crisp white border for contrast on dark/light browser tabs
            drawRoundedPill(ctx, left - 1.5, top - 1.5, badgeWidth + 3, badgeHeight + 3, radius + 1.5);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();

            // Red badge fill
            drawRoundedPill(ctx, left + 1, top + 1, badgeWidth - 2, badgeHeight - 2, radius - 1);
            ctx.fillStyle = '#EF4444';
            ctx.fill();

            // Bold numeric text
            const fontSize = label.length >= 3 ? 19 : label.length === 2 ? 22 : 24;
            ctx.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, centerX, centerY + 1);

            try {
                updateFaviconLinks(canvas.toDataURL('image/png'));
            } catch {
                // Ignore canvas taint/export failure
            }
        };

        if (baseImageRef.current && baseImageRef.current.complete && baseImageRef.current.naturalWidth > 0) {
            renderBadge(baseImageRef.current);
        } else {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                baseImageRef.current = img;
                renderBadge(img);
            };
            img.onerror = () => {
                updateFaviconLinks(BASE_FAVICON_URL);
            };
            img.src = BASE_FAVICON_URL;
        }

        return () => {
            isCancelled = true;
        };
    }, [count]);
}
