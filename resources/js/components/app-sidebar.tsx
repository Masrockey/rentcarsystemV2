import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid, CalendarDays, Car, Users, UserSquare2, BarChart3,
    Truck, CreditCard, Wrench, Shield, FileText, ClipboardList,
    CheckCircle2, Play, Sparkles, ChevronRight, KeyRound, RotateCcw, ShieldAlert,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarGroup,
    SidebarGroupLabel,
} from '@/components/ui/sidebar';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { dashboard, reports } from '@/routes';
import { index as allocationsIndex } from '@/routes/allocations';
import { index as blacklistsIndex } from '@/routes/blacklists';
import { index as bookingsIndex } from '@/routes/bookings';
import { index as carsIndex } from '@/routes/cars';
import { index as customersIndex } from '@/routes/customers';
import { index as driversIndex } from '@/routes/drivers';
import { index as insurancesIndex } from '@/routes/insurances';
import { index as paymentsIndex } from '@/routes/payments';
import { index as rentalsIndex } from '@/routes/rentals';
import { index as returnsIndex } from '@/routes/returns';
import { index as servicesIndex } from '@/routes/services';
import { index as usersIndex } from '@/routes/users';
import { index as vehicleTaxesIndex } from '@/routes/vehicle-taxes';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const page = usePage();
    const { auth } = page.props;
    const { isCurrentUrl } = useCurrentUrl();
    const user = auth?.user as any;
    const roles: string[] = user?.roles || [];
    const hasRole = (r: string) => roles.includes(r) || roles.includes('Super Admin');

    const coreItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
    ];

    const operationalItems: NavItem[] = [];
    const fleetItems: NavItem[] = [];
    const adminItems: NavItem[] = [];

    // Data Mobil & status checking is hidden for Marketing role
    if (!roles.includes('Marketing') || hasRole('Admin')) {
        fleetItems.push({
            title: 'Data Mobil',
            href: carsIndex(),
            icon: Car,
            items: [
                { title: 'Semua Mobil', href: '/cars', icon: Car },
                { title: 'Mobil Ready', href: '/cars?status=Ready', icon: CheckCircle2 },
                { title: 'Mobil Sedang Disewa', href: '/cars?status=Not+Ready', icon: Play },
                { title: 'Mobil Perlu Dicuci', href: '/cars?status=Belum+Dicuci', icon: Sparkles },
                { title: 'Mobil Service', href: '/cars?status=Service', icon: Wrench },
            ],
        });
    }

    if (hasRole('Admin')) {
        operationalItems.push({ title: 'Data Booking', href: bookingsIndex(), icon: CalendarDays });
        operationalItems.push({ title: 'Alokasi Mobil', href: allocationsIndex(), icon: KeyRound });
        operationalItems.push({ title: 'Serah Terima', href: rentalsIndex(), icon: ClipboardList });
        operationalItems.push({ title: 'Unit Kembali', href: returnsIndex(), icon: RotateCcw });
        operationalItems.push({ title: 'Pembayaran', href: paymentsIndex(), icon: CreditCard });

        fleetItems.push({ title: 'Data Supir', href: driversIndex(), icon: Truck });
        fleetItems.push({ title: 'Servis Mobil', href: servicesIndex(), icon: Wrench });
        fleetItems.push({ title: 'Asuransi', href: insurancesIndex(), icon: Shield });
        fleetItems.push({ title: 'Pajak & STNK', href: vehicleTaxesIndex(), icon: FileText });

        adminItems.push({ title: 'Data Pelanggan', href: customersIndex(), icon: UserSquare2 });
        adminItems.push({ title: 'Blacklist Konsumen', href: blacklistsIndex(), icon: ShieldAlert });
        if (roles.includes('Super Admin')) {
            adminItems.push({ title: 'Manajemen User', href: usersIndex(), icon: Users });
        }
        coreItems.push({ title: 'Laporan', href: reports(), icon: BarChart3 });
    } else if (hasRole('Marketing')) {
        operationalItems.push({ title: 'Data Booking', href: bookingsIndex(), icon: CalendarDays });
        adminItems.push({ title: 'Data Pelanggan', href: customersIndex(), icon: UserSquare2 });
        adminItems.push({ title: 'Blacklist Konsumen', href: blacklistsIndex(), icon: ShieldAlert });
    } else if (hasRole('Peluncur') || hasRole('Petugas Cuci')) {
        operationalItems.push({ title: 'Daftar Tugas Saya', href: bookingsIndex(), icon: CalendarDays });
    }

    const getKey = (item: NavItem) => {
        if (typeof item.href === 'string') return item.href;
        if (typeof item.href === 'function') return String((item.href as any)());
        if (item.href && typeof (item.href as any).url === 'string') return (item.href as any).url;
        return item.title;
    };

    const deduplicate = (items: NavItem[]) => {
        const seen = new Set<string>();
        return items.filter((item) => {
            const key = getKey(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const groups = [
        { label: 'Ringkasan', items: deduplicate(coreItems) },
        { label: 'Transaksi & Operasional', items: deduplicate(operationalItems) },
        { label: 'Manajemen Armada', items: deduplicate(fleetItems) },
        { label: 'Administrasi', items: deduplicate(adminItems) },
    ].filter(g => g.items.length > 0);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="space-y-4 py-2">
                {groups.map((group) => (
                    <SidebarGroup key={group.label} className="px-2 py-0">
                        <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                            {group.label}
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {group.items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    {item.items && item.items.length > 0 ? (
                                        <Collapsible defaultOpen className="group/collapsible">
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton
                                                    isActive={isCurrentUrl(item.href)}
                                                    tooltip={{ children: item.title }}
                                                >
                                                    <Link href={item.href} prefetch className="flex items-center gap-2 w-full">
                                                        {item.icon && <item.icon />}
                                                        <span>{item.title}</span>
                                                    </Link>
                                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub className="my-1 space-y-0.5">
                                                    {item.items.map((subItem) => {
                                                        const subHref = typeof subItem.href === 'string' ? subItem.href : (subItem.href as any)?.url;
                                                        const isSubActive = page.url === subHref || (subHref === '/cars' && page.url === '/cars');
                                                        return (
                                                            <SidebarMenuSubItem key={subItem.title}>
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    isActive={isSubActive}
                                                                >
                                                                    <Link href={subItem.href} prefetch className="flex items-center gap-2 text-xs">
                                                                        {subItem.icon && <subItem.icon className="h-3.5 w-3.5" />}
                                                                        <span>{subItem.title}</span>
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        );
                                                    })}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ) : (
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isCurrentUrl(item.href)}
                                            tooltip={{ children: item.title }}
                                        >
                                            <Link href={item.href} prefetch>
                                                {item.icon && <item.icon />}
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    )}
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
