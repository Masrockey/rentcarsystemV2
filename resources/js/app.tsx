import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

// Prevent mouse wheel from accidentally changing number input values across the whole app
if (typeof window !== 'undefined') {
    document.addEventListener(
        'wheel',
        (e) => {
            const activeElement = document.activeElement as HTMLInputElement | null;
            if (activeElement && activeElement.tagName === 'INPUT' && activeElement.type === 'number') {
                activeElement.blur();
            }
        },
        { passive: true }
    );
}

// Register the PWA worker only for production builds.
if (
    import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator
) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}

