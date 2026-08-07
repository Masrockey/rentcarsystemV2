import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Link href={home()} className="flex items-center gap-2 font-medium">
                        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 p-1">
                            <AppLogoIcon className="size-6 object-contain" />
                        </div>
                        <span className="font-semibold text-lg">{name || 'Rent A Car System'}</span>
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        {title && (
                            <div className="flex flex-col items-center gap-1 text-center mb-6">
                                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                                {description && (
                                    <p className="text-sm text-balance text-muted-foreground">
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}
                        {children}
                    </div>
                </div>
            </div>
            <div className="relative hidden bg-muted lg:block">
                <img
                    src="/login-image.jpg"
                    alt="Rent Car Image"
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.3] dark:grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-10">
                    <blockquote className="space-y-2 text-white">
                        <p className="text-lg font-medium">PT. CAHAYA AUTO NUSANTARA</p>
                        <footer className="text-sm text-zinc-300">&mdash; Rent A Car System</footer>
                    </blockquote>
                </div>
            </div>
        </div>
    );
}
