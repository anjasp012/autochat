import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* AutoChat Speech Bubble with Automation Lightning Bolt Cutout */}
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 6C5.58172 6 2 9.58172 2 14V25C2 29.4183 5.58172 33 10 33H13V38.2C13 38.98 13.92 39.42 14.54 38.92L21.4 33H30C34.4183 33 38 29.4183 38 25V14C38 9.58172 34.4183 6 30 6H10ZM21.5 10.5L14 21H19.5L17.5 28.5L26 18H20.5L22.5 10.5H21.5Z"
                fill="currentColor"
            />
        </svg>
    );
}
