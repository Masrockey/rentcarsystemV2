import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid, CalendarDays, Car, Users, UserSquare2, BarChart3,
    Truck, CreditCard, Wrench, Shield, FileText, ClipboardList,
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
    SidebarGroup,
    SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { dashboard, reports } from '@/routes';
import { index as bookingsIndex } from '@/routes/bookings';
import { index as carsIndex } from '@/routes/cars';
import { index as customersIndex } from '@/routes/customers';
import { index as driversIndex } from '@/routes/drivers';
import { index as insurancesIndex } from '@/routes/insurances';
import { index as paymentsIndex } from '@/routes/payments';
import { index as rentalsIndex } from '@/routes/rentals';
import { index as servicesIndex } from '@/routes/services';
import { index as usersIndex } from '@/routes/users';
import { index as vehicleTaxesIndex } from '@/routes/vehicle-taxes';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { auth } = usePage().props;
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

    if (hasRole('Admin')) {
        operationalItems.push({ title: 'Bookings', href: bookingsIndex(), icon: CalendarDays });
        operationalItems.push({ title: 'Serah Terima', href: rentalsIndex(), icon: ClipboardList });
        operationalItems.push({ title: 'Payments', href: paymentsIndex(), icon: CreditCard });

        fleetItems.push({ title: 'Cars', href: carsIndex(), icon: Car });
        fleetItems.push({ title: 'Drivers', href: driversIndex(), icon: Truck });
        fleetItems.push({ title: 'Service', href: servicesIndex(), icon: Wrench });
        fleetItems.push({ title: 'Asuransi', href: insurancesIndex(), icon: Shield });
        fleetItems.push({ title: 'Pajak / STNK', href: vehicleTaxesIndex(), icon: FileText });

        adminItems.push({ title: 'Customers', href: customersIndex(), icon: UserSquare2 });
        adminItems.push({ title: 'Users', href: usersIndex(), icon: Users });
        coreItems.push({ title: 'Reports', href: reports(), icon: BarChart3 });
    }

    if (hasRole('Marketing')) {
        operationalItems.push({ title: 'Bookings', href: bookingsIndex(), icon: CalendarDays });
        operationalItems.push({ title: 'Payments', href: paymentsIndex(), icon: CreditCard });
        adminItems.push({ title: 'Customers', href: customersIndex(), icon: UserSquare2 });
    }

    if (hasRole('Peluncur') || hasRole('Petugas Cuci')) {
        operationalItems.push({ title: 'My Worklist', href: bookingsIndex(), icon: CalendarDays });
    }

    const deduplicate = (items: NavItem[]) => {
        const seen = new Set<string>();
        return items.filter((item) => {
            const key = typeof item.href === 'string' ? item.href : (item.href as any)?.url || String(item.href);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const groups = [
        { label: 'Overview', items: deduplicate(coreItems) },
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
