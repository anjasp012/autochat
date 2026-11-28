import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/favicon.png?v=20261128b"
            alt="AutoChat Logo"
            {...props}
            className={`object-cover ${props.className || 'size-6'}`}
        />
    );
}
