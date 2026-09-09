import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    const { className, ...rest } = props;

    return (
        <img
            {...rest}
            className={`block object-contain ${className ?? ''}`.trim()}
            src="/logo.svg"
            alt="PT Cahaya Auto Nusantara"
            width={32}
            height={32}
        />
    );
}
