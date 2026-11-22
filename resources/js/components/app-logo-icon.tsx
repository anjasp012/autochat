import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/favicon.png"
            alt="AutoChat Logo"
            {...props}
            className={`object-contain ${props.className || 'size-6'}`}
        />
    );
}
