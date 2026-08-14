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
                        Selamat datang kembali, {roles.map((r) => (
                            <Badge key={r} className="ml-1 select-none">{r}</Badge>
                        ))}.
                    </p>
                </div>

                {/* --- ADMIN PANEL --- */}
                {hasRole('Admin') && stats.admin && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2">Panel Admin</h2>
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                            {/* 1. Total Mobil */}
                            <Link href="/cars" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-neutral-200/80 dark:border-neutral-800">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Mobil</CardTitle>
                                        <Car className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.admin.total_cars}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Jumlah seluruh armada</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 2. Mobil Ready */}
                            <Link href="/cars?status=Ready" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-green-200/80 hover:border-green-400 dark:border-green-950">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Mobil Ready</CardTitle>
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.admin.cars_ready}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Tersedia untuk disewa</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 3. Sedang Disewa */}
                            <Link href="/cars?status=Not+Ready" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-purple-200/80 hover:border-purple-400 dark:border-purple-950">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Sedang Disewa</CardTitle>
                                        <Play className="h-4 w-4 text-purple-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.admin.cars_not_ready}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Unit aktif di jalan (trip)</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 4. Sedang Service */}
                            <Link href="/services" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-orange-200/80 hover:border-orange-400 dark:border-orange-950">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Sedang Service</CardTitle>
                                        <Wrench className="h-4 w-4 text-orange-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.admin.cars_service}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Unit dalam perawatan</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 5. Booking Hari Ini */}
                            <Link href="/bookings" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-blue-200/80 hover:border-blue-400 dark:border-blue-950">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Booking Hari Ini</CardTitle>
                                        <CalendarDays className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.admin.bookings_today}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Pesanan masuk hari ini</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 6. Pendapatan Hari Ini */}
                            <Link href="/payments" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-950">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Pendapatan Hari Ini</CardTitle>
                                        <DollarSign className="h-4 w-4 text-emerald-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.admin.revenue_today)}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Total transaksi hari ini</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 7. Pendapatan Bulan Ini */}
                            <Link href="/reports" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-indigo-200/80 hover:border-indigo-400 dark:border-indigo-950">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Pendapatan Bulan Ini</CardTitle>
                                        <DollarSign className="h-4 w-4 text-indigo-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(stats.admin.revenue_month)}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Akumulasi bulan berjalan</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 8. Utilization Rate */}
                            <Link href="/reports" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-cyan-200/80 hover:border-cyan-400 dark:border-cyan-950">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Persentase Utilitas Armada</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-cyan-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.admin.utilization_rate}%</div>
                                        <p className="text-xs text-muted-foreground mt-1">Tingkat utilitas armada</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 9. Mobil Telat Kembali */}
                            <Link href="/rentals" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-red-300 hover:border-red-500 bg-red-50/10 dark:bg-red-950/5">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Mobil Telat Kembali</CardTitle>
                                        <Clock className="h-4 w-4 text-red-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.admin.overdue_returns}</div>
                                        <p className="text-xs text-red-500/80 dark:text-red-400/80 mt-1">Melewati estimasi kembali</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 10. Pajak Hampir Habis */}
                            <Link href="/vehicle-taxes" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-amber-300 hover:border-amber-500 bg-amber-50/10 dark:bg-amber-950/5">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Pajak Hampir Habis</CardTitle>
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.admin.tax_expiring_soon}</div>
                                        <p className="text-xs text-amber-500/80 dark:text-amber-400/80 mt-1">Jatuh tempo &lt; 30 hari</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 11. Service Jatuh Tempo */}
                            <Link href="/services" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-amber-300 hover:border-amber-500 bg-amber-50/10 dark:bg-amber-950/5">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Service Jatuh Tempo</CardTitle>
                                        <Calendar className="h-4 w-4 text-amber-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.admin.service_due}</div>
                                        <p className="text-xs text-amber-500/80 dark:text-amber-400/80 mt-1">Jadwal service terdekat (&lt; 14 hari)</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Booking Terbaru</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Mobile Cards View */}
                                    <div className="space-y-3 md:hidden">
                                        {stats.admin.recent_bookings.length === 0 ? (
                                            <div className="text-center py-6 text-muted-foreground text-sm">
                                                Belum ada booking tercatat.
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
                                                    <th className="px-4 py-3">Pelanggan</th>
                                                    <th className="px-4 py-3">Tipe Mobil</th>
                                                    <th className="px-4 py-3">Tanggal Booking</th>
                                                    <th className="px-4 py-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {stats.admin.recent_bookings.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                                            Belum ada booking tercatat.
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
                                                Lihat Semua Booking
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Status Armada Mobil</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-3">
                                    <Link href="/cars?status=Ready" className="flex items-center justify-between border-b pb-2.5 hover:bg-muted/50 p-2 rounded-md transition-all cursor-pointer">
                                        <span className="text-sm font-medium">Ready (Siap Sewa)</span>
                                        <Badge className="bg-green-500 hover:bg-green-600">{stats.admin.cars_ready}</Badge>
                                    </Link>
                                    <Link href="/cars?status=Not+Ready" className="flex items-center justify-between border-b pb-2.5 hover:bg-muted/50 p-2 rounded-md transition-all cursor-pointer">
                                        <span className="text-sm font-medium">Sedang Disewa (On Trip)</span>
                                        <Badge className="bg-purple-500 hover:bg-purple-600">{stats.admin.cars_not_ready}</Badge>
                                    </Link>
                                    <Link href="/cars?status=Belum+Dicuci" className="flex items-center justify-between pb-1 hover:bg-muted/50 p-2 rounded-md transition-all cursor-pointer">
                                        <span className="text-sm font-medium">Perlu Dicuci</span>
                                        <Badge className="bg-amber-500 hover:bg-amber-600">{stats.admin.cars_belum_dicuci}</Badge>
                                    </Link>
                                    <Link href={carsIndex().url}>
                                        <Button className="w-full mt-3">Kelola Armada Mobil</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* --- MARKETING PANEL --- */}
                {hasRole('Marketing') && stats.marketing && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2 mt-6">Panel Marketing</h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Link href="/customers" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-neutral-200/80 dark:border-neutral-800">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Pelanggan</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.marketing.total_customers}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Tersedia untuk alokasi sewa</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/bookings" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-neutral-200/80 dark:border-neutral-800">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Booking</CardTitle>
                                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.marketing.total_bookings}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Booking yang telah dibuat</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Card className="flex flex-col justify-center p-6 bg-primary text-primary-foreground">
                                <h3 className="font-semibold text-lg mb-2">Ada Pesanan Sewa Baru?</h3>
                                <p className="text-sm text-primary-foreground/80 mb-4">Input detail pemesanan dari pelanggan secara cepat.</p>
                                <Link href={bookingsIndex().url}>
                                    <Button variant="secondary" className="w-full">Buat Booking Baru</Button>
                                </Link>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Booking Terbaru yang Dibuat</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative overflow-x-auto rounded-lg border">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-3">Pelanggan</th>
                                                <th className="px-4 py-3">Tipe Mobil</th>
                                                <th className="px-4 py-3">Tanggal Booking</th>
                                                <th className="px-4 py-3">Metode Pembayaran</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {stats.marketing.recent_bookings.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                        Belum ada booking yang dibuat.
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
                        <h2 className="text-xl font-semibold border-b pb-2 mt-6">Tugas Peluncur</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ClipboardCheck className="h-5 w-5 text-blue-500" />
                                        Tugas Penyerahan Mobil (Checklist Pengeluaran)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                    {stats.peluncur.assigned_deliveries.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            Tidak ada penyerahan mobil yang ditugaskan.
                                        </div>
                                    ) : (
                                        stats.peluncur.assigned_deliveries.map((booking: any) => (
                                            <div key={booking.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-all">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold">{booking.customer?.name}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Mobil: {booking.car?.name} ({booking.car?.plate_number})
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">Tanggal: {booking.booking_date}</span>
                                                </div>
                                                <Link href={`/bookings/${booking.id}/checklist`}>
                                                    <Button size="sm" className="flex items-center gap-1">
                                                        <Play className="h-3.5 w-3.5 fill-current" /> Checklist Penyerahan
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
                                        Tugas Pengembalian Mobil (Checklist Pengembalian)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                    {stats.peluncur.assigned_returns.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            Tidak ada pengembalian mobil yang aktif.
                                        </div>
                                    ) : (
                                        stats.peluncur.assigned_returns.map((booking: any) => (
                                            <div key={booking.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-all">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold">{booking.customer?.name}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Mobil: {booking.car?.name} ({booking.car?.plate_number})
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">Tanggal: {booking.booking_date}</span>
                                                </div>
                                                <Link href={`/bookings/${booking.id}/checklist`}>
                                                    <Button size="sm" variant="secondary" className="flex items-center gap-1">
                                                        <Play className="h-3.5 w-3.5 fill-current" /> Checklist Pengembalian
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
                        <h2 className="text-xl font-semibold border-b pb-2 mt-6">Tugas Cuci Mobil</h2>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Car className="h-5 w-5 text-amber-500" />
                                    Daftar Mobil Perlu Dicuci
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                {stats.petugas_cuci.assigned_wash.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        Tidak ada mobil yang perlu dicuci saat ini. Kerja bagus!
                                    </div>
                                ) : (
                                    stats.petugas_cuci.assigned_wash.map((booking: any) => (
                                        <div key={booking.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-all">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-semibold">{booking.car?.name}</span>
                                                <span className="text-sm text-muted-foreground font-mono">
                                                    Plat Nomor: {booking.car?.plate_number}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Dikembalikan oleh pelanggan: {booking.customer?.name}
                                                </span>
                                            </div>
                                            <Link href={bookingsIndex().url}>
                                                <Button size="sm" variant="outline">
                                                    Selesaikan Pencucian
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
