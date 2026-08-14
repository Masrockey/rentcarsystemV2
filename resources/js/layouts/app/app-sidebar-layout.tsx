import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { Link, usePage } from '@inertiajs/react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import {
    LayoutGrid, CalendarDays, ClipboardList, Car, UserSquare2, CreditCard,
    Users, BarChart3, Truck, Wrench, Shield, FileText, Menu, KeyRound, LogOut, Settings, RotateCcw, ShieldAlert
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { dashboard, reports, logout } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import { index as allocationsIndex } from '@/routes/allocations';
import { index as blacklistsIndex } from '@/routes/blacklists';
import { index as bookingsIndex } from '@/routes/bookings';
import { index as rentalsIndex } from '@/routes/rentals';
import { index as returnsIndex } from '@/routes/returns';
import { index as carsIndex } from '@/routes/cars';
import { index as customersIndex } from '@/routes/customers';
import { index as paymentsIndex } from '@/routes/payments';
import { index as driversIndex } from '@/routes/drivers';
import { index as servicesIndex } from '@/routes/services';
import { index as insurancesIndex } from '@/routes/insurances';
import { index as vehicleTaxesIndex } from '@/routes/vehicle-taxes';
import { index as usersIndex } from '@/routes/users';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { auth } = usePage().props;
    const { isCurrentUrl } = useCurrentUrl();
    const user = auth?.user as any;
    const roles: string[] = user?.roles || [];
    const hasRole = (r: string) => roles.includes(r) || roles.includes('Super Admin');

    // Build all available navigation items dynamically based on roles
    const allItems = [];

    if (hasRole('Admin')) {
        allItems.push({ title: 'Home', href: dashboard(), icon: LayoutGrid });
        allItems.push({ title: 'Bookings', href: bookingsIndex(), icon: CalendarDays });
        allItems.push({ title: 'Alokasi', href: allocationsIndex(), icon: KeyRound });
        allItems.push({ title: 'Serah Terima', href: rentalsIndex(), icon: ClipboardList });
        allItems.push({ title: 'Unit Kembali', href: returnsIndex(), icon: RotateCcw });
        allItems.push({ title: 'Armada', href: carsIndex(), icon: Car });
        allItems.push({ title: 'Drivers', href: driversIndex(), icon: Truck });
        allItems.push({ title: 'Payments', href: paymentsIndex(), icon: CreditCard });
        allItems.push({ title: 'Service', href: servicesIndex(), icon: Wrench });
        allItems.push({ title: 'Asuransi', href: insurancesIndex(), icon: Shield });
        allItems.push({ title: 'Pajak / STNK', href: vehicleTaxesIndex(), icon: FileText });
        allItems.push({ title: 'Customers', href: customersIndex(), icon: UserSquare2 });
        allItems.push({ title: 'Blacklist', href: blacklistsIndex(), icon: ShieldAlert });
        if (roles.includes('Super Admin')) {
            allItems.push({ title: 'Users', href: usersIndex(), icon: Users });
        }
        allItems.push({ title: 'Reports', href: reports(), icon: BarChart3 });
    } else if (hasRole('Marketing')) {
        allItems.push({ title: 'Home', href: dashboard(), icon: LayoutGrid });
        allItems.push({ title: 'Bookings', href: bookingsIndex(), icon: CalendarDays });
        allItems.push({ title: 'Armada', href: carsIndex(), icon: Car });
        allItems.push({ title: 'Customers', href: customersIndex(), icon: UserSquare2 });
    } else if (hasRole('Peluncur') || hasRole('Petugas Cuci')) {
        allItems.push({ title: 'Home', href: dashboard(), icon: LayoutGrid });
        allItems.push({ title: 'Worklist', href: bookingsIndex(), icon: CalendarDays });
        allItems.push({ title: 'Serah Terima', href: rentalsIndex(), icon: ClipboardList });
        allItems.push({ title: 'Unit Kembali', href: returnsIndex(), icon: RotateCcw });
        allItems.push({ title: 'Armada', href: carsIndex(), icon: Car });
    }

    const getKey = (item: any) => {
        if (typeof item.href === 'string') return item.href;
        if (typeof item.href === 'function') return String((item.href as any)());
        if (item.href && typeof (item.href as any).url === 'string') return (item.href as any).url;
        return item.title;
    };

    // Deduplicate items based on route URL
    const deduplicatedAllItems = Array.from(
        new Map(allItems.map((item) => [getKey(item), item])).values()
    );

    // Split bottom tabs (top 4) and leftover items inside the 'Other' menu sheet
    const bottomTabs = deduplicatedAllItems.slice(0, 4);
    const otherItems = deduplicatedAllItems.slice(4);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden pb-20 md:pb-0">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>

            {/* Premium Mobile Bottom Nav Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t h-16 md:hidden flex items-center justify-around px-2 shadow-md border-muted">
                {bottomTabs.map((tab) => {
                    const active = isCurrentUrl(tab.href);
                    return (
                        <Link
                            key={tab.title}
                            href={tab.href}
                            prefetch
                            className={`flex flex-col items-center justify-center flex-1 py-1 px-3 text-center transition-all ${active
                                    ? 'text-primary font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {tab.icon && <tab.icon className={`h-5 w-5 mb-1 ${active ? 'scale-110' : ''}`} />}
                            <span className="text-[10px] tracking-wide">{tab.title}</span>
                        </Link>
                    );
                })}

                <Sheet>
                    <SheetTrigger className="flex flex-col items-center justify-center flex-1 py-1 px-3 text-center transition-all text-muted-foreground hover:text-foreground cursor-pointer">
                        <Menu className="h-5 w-5 mb-1" />
                        <span className="text-[10px] tracking-wide">Other</span>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 pb-8 border-t">
                        <SheetHeader className="pb-3 border-b mb-4 flex flex-row items-center justify-between">
                            <div>
                                <SheetTitle className="text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground/75">
                                    Menu Lainnya
                                </SheetTitle>
                                {user && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {user.name} ({roles.join(', ')})
                                    </p>
                                )}
                            </div>
                        </SheetHeader>

                        {otherItems.length > 0 && (
                            <div className="grid grid-cols-3 gap-3">
                                {otherItems.map((item) => {
                                    const active = isCurrentUrl(item.href);
                                    return (
                                        <SheetTrigger key={item.title} asChild>
                                            <Link
                                                href={item.href}
                                                prefetch
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${active
                                                        ? 'bg-primary/10 text-primary border-primary/25 font-medium'
                                                        : 'bg-muted/30 hover:bg-muted/65 text-muted-foreground border-muted hover:text-foreground'
                                                    }`}
                                            >
                                                {item.icon && <item.icon className="h-6 w-6 mb-2" />}
                                                <span className="text-[11px] font-medium leading-none">{item.title}</span>
                                            </Link>
                                        </SheetTrigger>
                                    );
                                })}
                            </div>
                        )}

                        <div className="pt-4 mt-4 border-t space-y-2">
                            <SheetTrigger asChild>
                                <Link
                                    href={editProfile()}
                                    className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border bg-muted/40 text-foreground font-medium text-xs hover:bg-muted transition-all"
                                >
                                    <Settings className="h-4 w-4" />
                                    <span>Pengaturan Akun</span>
                                </Link>
                            </SheetTrigger>
                            <SheetTrigger asChild>
                                <Link
                                    href={logout()}
                                    as="button"
                                    className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/50 font-medium text-xs hover:bg-red-100 dark:hover:bg-red-900/30 transition-all cursor-pointer"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Keluar (Logout)</span>
                                </Link>
                            </SheetTrigger>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </AppShell>
    );
}
