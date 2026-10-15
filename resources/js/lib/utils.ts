import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

export function maskPhoneNumber(phone: string | null | undefined): string {
    if (!phone) return '-';
    const trimmed = String(phone).trim();
    if (trimmed.length <= 4) return '****';
    return trimmed.slice(0, -4) + '****';
}

export function maskPrintPhone(phone: string | null | undefined): string {
    if (!phone) return '-';
    const trimmed = String(phone).trim();
    if (!trimmed) return '-';

    const lastDash = trimmed.lastIndexOf('-');
    const lastSpace = trimmed.lastIndexOf(' ');
    const sepIndex = Math.max(lastDash, lastSpace);

    if (sepIndex > 0 && sepIndex >= trimmed.length - 6) {
        return trimmed.slice(0, sepIndex + 1) + 'XXXXXX';
    }

    if (trimmed.length <= 5) return 'XXXXXX';
    return trimmed.slice(0, -5) + 'XXXXXX';
}

