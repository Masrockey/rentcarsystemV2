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

