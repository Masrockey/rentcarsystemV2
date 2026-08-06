import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-sidebar-primary-foreground">
                <AppLogoIcon className="h-full w-full bg-transparent" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    Rent A Car System
                </span>
            </div>
        </>
    );
}
