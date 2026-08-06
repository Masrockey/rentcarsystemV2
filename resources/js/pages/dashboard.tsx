import { Head, Link } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Car,
    CalendarDays,
    Users,
    DollarSign,
    ClipboardCheck,
    CheckCircle2,
    Play,
    Wrench,
    Percent,
    Clock,
    AlertCircle,
    Calendar,
    TrendingUp
} from 'lucide-react';
import { index as bookingsIndex } from '@/routes/bookings';
import { index as carsIndex } from '@/routes/cars';
import { index as customersIndex } from '@/routes/customers';
import { index as usersIndex } from '@/routes/users';

type DashboardProps = {
    roles: string[];
    stats: any;
};

export default function Dashboard({ roles = [], stats }: DashboardProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending':
                return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/25';
            case 'Confirmed':
                return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25';
            case 'On Trip':
                return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25';
            case 'Returned':
                return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25';
            case 'Completed':
                return 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25';
            default:
                return 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/25';
        }
    };

    const hasRole = (r: string) => roles.includes(r) || roles.includes('Super Admin');

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back! {roles.map((r) => (
                            <Badge key={r} className="ml-1 select-none">{r}</Badge>
                        ))}.
                    </p>
                </div>

                {/* --- ADMIN PANEL --- */}
                {hasRole('Admin') && stats.admin && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2">Admin Panel</h2>
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                            {/* 1. Total Mobil */}
                            <Card className="shadow-xs transition-all hover:shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Mobil</CardTitle>
                                    <Car className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.admin.total_cars}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Jumlah seluruh armada</p>
                                </CardContent>
                            </Card>

                            {/* 2. Mobil Ready */}
                            <Card className="shadow-xs transition-all hover:shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Mobil Ready</CardTitle>
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.admin.cars_ready}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Tersedia untuk disewa</p>
                                </CardContent>
                            </Card>

                            {/* 3. Sedang Disewa */}
                            <Card className="shadow-xs transition-all hover:shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Sedang Disewa</CardTitle>
                                    <Play className="h-4 w-4 text-purple-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.admin.cars_not_ready}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Unit aktif di jalan (trip)</p>
                                </CardContent>
                            </Card>

                            {/* 4. Sedang Service */}
                            <Card className="shadow-xs transition-all hover:shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Sedang Service</CardTitle>
                                    <Wrench className="h-4 w-4 text-orange-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.admin.cars_service}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Unit dalam perawatan</p>
                                </CardContent>
                            </Card>

                            {/* 5. Booking Hari Ini */}
                            <Card className="shadow-xs transition-all hover:shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Booking Hari Ini</CardTitle>
                                    <CalendarDays className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.admin.bookings_today}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Pesanan masuk hari ini</p>
                                </CardContent>
                            </Card>

                            {/* 6. Pendapatan Hari Ini */}
                            <Card className="shadow-xs transition-all hover:shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Pendapatan Hari Ini</CardTitle>
                                    <DollarSign className="h-4 w-4 text-emerald-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.admin.revenue_today)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Total transaksi hari ini</p>
                                </CardContent>
                            </Card>

                            {/* 7. Pendapatan Bulan Ini */}
                            <Card className="shadow-xs transition-all hover:shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Pendapatan Bulan Ini</CardTitle>
                                    <DollarSign className="h-4 w-4 text-indigo-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(stats.admin.revenue_month)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Akumulasi bulan berjalan</p>
                                </CardContent>
                            </Card>

                            {/* 8. Utilization Rate */}
                            <Card className="shadow-xs transition-all hover:shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Utilization Rate</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-cyan-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.admin.utilization_rate}%</div>
                                    <p className="text-xs text-muted-foreground mt-1">Tingkat utilitas armada</p>
                                </CardContent>
                            </Card>

                            {/* 9. Mobil Telat Kembali */}
                            <Card className="shadow-xs transition-all hover:shadow-sm border-red-200 bg-red-50/10 dark:bg-red-950/5">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Mobil Telat Kembali</CardTitle>
                                    <Clock className="h-4 w-4 text-red-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.admin.overdue_returns}</div>
                                    <p className="text-xs text-red-500/80 dark:text-red-400/80 mt-1">Melewati estimasi kembali</p>
                                </CardContent>
                            </Card>

                            {/* 10. Pajak Hampir Habis */}
                            <Card className="shadow-xs transition-all hover:shadow-sm border-amber-200 bg-amber-50/10 dark:bg-amber-950/5">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Pajak Hampir Habis</CardTitle>
                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.admin.tax_expiring_soon}</div>
                                    <p className="text-xs text-amber-500/80 dark:text-amber-400/80 mt-1">Jatuh tempo &lt; 30 hari</p>
                                </CardContent>
                            </Card>

                            {/* 11. Service Jatuh Tempo */}
                            <Card className="shadow-xs transition-all hover:shadow-sm border-amber-200 bg-amber-50/10 dark:bg-amber-950/5">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Service Jatuh Tempo</CardTitle>
                                    <Calendar className="h-4 w-4 text-amber-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.admin.service_due}</div>
                                    <p className="text-xs text-amber-500/80 dark:text-amber-400/80 mt-1">Jadwal service terdekat (&lt; 14 hari)</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Recent Bookings</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Mobile Cards View */}
                                    <div className="space-y-3 md:hidden">
                                        {stats.admin.recent_bookings.length === 0 ? (
                                            <div className="text-center py-6 text-muted-foreground text-sm">
                                                No bookings recorded yet.
                                            </div>
                                        ) : (
                                            stats.admin.recent_bookings.map((booking: any) => (
                                                <div key={booking.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-card text-card-foreground shadow-xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-sm">{booking.customer?.name}</span>
                                                        <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                            {booking.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        <div>Mobil: {booking.car_type} {booking.car ? `(${booking.car.plate_number})` : ''}</div>
                                                        <div>Tanggal: {booking.booking_date}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block relative overflow-x-auto rounded-lg border">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3">Customer</th>
                                                    <th className="px-4 py-3">Car Type</th>
                                                    <th className="px-4 py-3">Booking Date</th>
                                                    <th className="px-4 py-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {stats.admin.recent_bookings.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                                            No bookings recorded yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    stats.admin.recent_bookings.map((booking: any) => (
                                                        <tr key={booking.id} className="hover:bg-muted/50">
                                                            <td className="px-4 py-3 font-medium">{booking.customer?.name}</td>
                                                            <td className="px-4 py-3">{booking.car_type} {booking.car ? `(${booking.car.plate_number})` : ''}</td>
                                                            <td className="px-4 py-3">{booking.booking_date}</td>
                                                            <td className="px-4 py-3">
                                                                <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                                    {booking.status}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4">
                                        <Link href={bookingsIndex().url}>
                                            <Button variant="outline" className="w-full">
                                                View All Bookings
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Fleet Status</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <span className="text-sm font-medium">Ready for Rent</span>
                                        <Badge className="bg-green-500 hover:bg-green-600">{stats.admin.cars_ready}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <span className="text-sm font-medium">Out with Customer</span>
                                        <Badge className="bg-purple-500 hover:bg-purple-600">{stats.admin.cars_not_ready}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between pb-2">
                                        <span className="text-sm font-medium">Requires Wash</span>
                                        <Badge className="bg-amber-500 hover:bg-amber-600">{stats.admin.cars_belum_dicuci}</Badge>
                                    </div>
                                    <Link href={carsIndex().url}>
                                        <Button className="w-full mt-4">Manage Fleet</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* --- MARKETING PANEL --- */}
                {hasRole('Marketing') && stats.marketing && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2 mt-6">Marketing Panel</h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="shadow-xs transition-all hover:shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Customers Managed</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.marketing.total_customers}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Available for rental allocation</p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-xs transition-all hover:shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.marketing.total_bookings}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Created bookings</p>
                                </CardContent>
                            </Card>

                            <Card className="flex flex-col justify-center p-6 bg-primary text-primary-foreground">
                                <h3 className="font-semibold text-lg mb-2">New Rental Request?</h3>
                                <p className="text-sm text-primary-foreground/80 mb-4">Quickly input booking details from customers.</p>
                                <Link href={bookingsIndex().url}>
                                    <Button variant="secondary" className="w-full">Create Booking</Button>
                                </Link>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Bookings Created</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative overflow-x-auto rounded-lg border">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-3">Customer</th>
                                                <th className="px-4 py-3">Car Type</th>
                                                <th className="px-4 py-3">Booking Date</th>
                                                <th className="px-4 py-3">Payment Method</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {stats.marketing.recent_bookings.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                        No bookings created yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                stats.marketing.recent_bookings.map((booking: any) => (
                                                    <tr key={booking.id} className="hover:bg-muted/50">
                                                        <td className="px-4 py-3 font-medium">{booking.customer?.name}</td>
                                                        <td className="px-4 py-3">{booking.car_type}</td>
                                                        <td className="px-4 py-3">{booking.booking_date}</td>
                                                        <td className="px-4 py-3">{booking.payment_method}</td>
                                                        <td className="px-4 py-3">
                                                            <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                                {booking.status}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* --- PELUNCUR PANEL --- */}
                {hasRole('Peluncur') && stats.peluncur && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2 mt-6">Peluncur Duties</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ClipboardCheck className="h-5 w-5 text-blue-500" />
                                        Assigned Deliveries (Checklist Pengeluaran)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                    {stats.peluncur.assigned_deliveries.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No pending car deliveries assigned.
                                        </div>
                                    ) : (
                                        stats.peluncur.assigned_deliveries.map((booking: any) => (
                                            <div key={booking.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-all">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold">{booking.customer?.name}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Car: {booking.car?.name} ({booking.car?.plate_number})
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">Date: {booking.booking_date}</span>
                                                </div>
                                                <Link href={`/bookings/${booking.id}/checklist`}>
                                                    <Button size="sm" className="flex items-center gap-1">
                                                        <Play className="h-3.5 w-3.5 fill-current" /> Delivery Checklist
                                                    </Button>
                                                </Link>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-purple-500" />
                                        Assigned Returns (Checklist Pengembalian)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                    {stats.peluncur.assigned_returns.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No active bookings requiring return checklist.
                                        </div>
                                    ) : (
                                        stats.peluncur.assigned_returns.map((booking: any) => (
                                            <div key={booking.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-all">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold">{booking.customer?.name}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Car: {booking.car?.name} ({booking.car?.plate_number})
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">Date: {booking.booking_date}</span>
                                                </div>
                                                <Link href={`/bookings/${booking.id}/checklist`}>
                                                    <Button size="sm" variant="secondary" className="flex items-center gap-1">
                                                        <Play className="h-3.5 w-3.5 fill-current" /> Return Checklist
                                                    </Button>
                                                </Link>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* --- PETUGAS CUCI PANEL --- */}
                {hasRole('Petugas Cuci') && stats.petugas_cuci && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2 mt-6">Cleaning Duties</h2>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Car className="h-5 w-5 text-amber-500" />
                                    Pending Car Washing Tasks
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                {stats.petugas_cuci.assigned_wash.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No pending car washes assigned. Excellent work!
                                    </div>
                                ) : (
                                    stats.petugas_cuci.assigned_wash.map((booking: any) => (
                                        <div key={booking.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-all">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-semibold">{booking.car?.name}</span>
                                                <span className="text-sm text-muted-foreground font-mono">
                                                    Plate Number: {booking.car?.plate_number}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Returned by customer: {booking.customer?.name}
                                                </span>
                                            </div>
                                            <Link href={bookingsIndex().url}>
                                                <Button size="sm" variant="outline">
                                                    Complete Wash
                                                </Button>
                                            </Link>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
