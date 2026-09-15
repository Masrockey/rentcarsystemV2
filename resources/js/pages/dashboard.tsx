import { useState, useEffect, useMemo } from 'react';
import { Head, Link, router, usePoll } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    TrendingUp,
    Filter,
    RotateCcw,
    Search,
    Sparkles,
    MapPin,
} from 'lucide-react';
import { index as bookingsIndex } from '@/routes/bookings';
import { index as carsIndex } from '@/routes/cars';
import { index as customersIndex } from '@/routes/customers';
import { index as usersIndex } from '@/routes/users';

type DashboardProps = {
    roles: string[];
    stats: any;
    filters?: {
        start_date: string;
        end_date: string;
        preset: string;
        is_filtered: boolean;
    };
};

export default function Dashboard({ roles = [], stats, filters }: DashboardProps) {
    const [startDate, setStartDate] = useState(filters?.start_date || '');
    const [endDate, setEndDate] = useState(filters?.end_date || '');
    const [carSearch, setCarSearch] = useState('');
    const [carStatusFilter, setCarStatusFilter] = useState<'all' | 'rented' | 'confirmed' | 'pending'>('all');

    useEffect(() => {
        setStartDate(filters?.start_date || '');
        setEndDate(filters?.end_date || '');
    }, [filters?.start_date, filters?.end_date]);

    const formatLocalDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getTodayStr = () => formatLocalDate(new Date());
    const getTomorrowStr = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return formatLocalDate(d);
    };
    const getThisWeekRange = () => {
        const now = new Date();
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const start = new Date(now);
        start.setDate(now.getDate() + diffToMonday);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
            start: formatLocalDate(start),
            end: formatLocalDate(end),
        };
    };
    const getThisMonthRange = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            start: formatLocalDate(start),
            end: formatLocalDate(end),
        };
    };

    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();
    const thisWeek = getThisWeekRange();
    const thisMonth = getThisMonthRange();

    const isTodayActive = filters?.preset === 'today' || (startDate === todayStr && endDate === todayStr);
    const isTomorrowActive = filters?.preset === 'tomorrow' || (startDate === tomorrowStr && endDate === tomorrowStr);
    const isThisWeekActive = filters?.preset === 'this_week' || (startDate === thisWeek.start && endDate === thisWeek.end);
    const isThisMonthActive = filters?.preset === 'this_month' || (startDate === thisMonth.start && endDate === thisMonth.end);
    const isAllActive = !filters?.is_filtered || filters?.preset === 'all' || (!startDate && !endDate);

    const applyFilter = (start: string, end: string, presetName: string = 'custom') => {
        router.get(
            '/dashboard',
            {
                start_date: start,
                end_date: end,
                preset: presetName,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleFilterAll = () => {
        setStartDate('');
        setEndDate('');
        applyFilter('', '', 'all');
    };

    const handleFilterToday = () => {
        setStartDate(todayStr);
        setEndDate(todayStr);
        applyFilter(todayStr, todayStr, 'today');
    };

    const handleFilterTomorrow = () => {
        setStartDate(tomorrowStr);
        setEndDate(tomorrowStr);
        applyFilter(tomorrowStr, tomorrowStr, 'tomorrow');
    };

    const handleFilterThisWeek = () => {
        setStartDate(thisWeek.start);
        setEndDate(thisWeek.end);
        applyFilter(thisWeek.start, thisWeek.end, 'this_week');
    };

    const handleFilterThisMonth = () => {
        setStartDate(thisMonth.start);
        setEndDate(thisMonth.end);
        applyFilter(thisMonth.start, thisMonth.end, 'this_month');
    };

    const handleCustomFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter(startDate, endDate, 'custom');
    };

    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        applyFilter('', '', 'all');
    };

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

    const getCarBookingStatusBadge = (car: any) => {
        if (car.status === 'Service') {
            return (
                <Badge variant="outline" className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25">
                    Service
                </Badge>
            );
        }
        if (car.status === 'Belum Dicuci') {
            return (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25">
                    Perlu Dicuci
                </Badge>
            );
        }
        if (car.active_booking) {
            if (car.active_booking.status === 'On Trip' || car.status === 'Not Ready') {
                return (
                    <Badge variant="outline" className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25">
                        Sedang Disewa (On Trip)
                    </Badge>
                );
            }
            if (car.active_booking.status === 'Confirmed') {
                return (
                    <Badge variant="outline" className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25">
                        Booked (Terkonfirmasi)
                    </Badge>
                );
            }
            if (car.active_booking.status === 'Pending') {
                return (
                    <Badge variant="outline" className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/25">
                        Booking Pending
                    </Badge>
                );
            }
        }
        if (car.status === 'Ready') {
            return (
                <Badge variant="outline" className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25">
                    Ready (Siap Sewa)
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/25">
                {car.status}
            </Badge>
        );
    };

    const formatShortDate = (dStr?: string | null) => {
        if (!dStr) return '-';
        return dStr.includes('T') ? dStr.split('T')[0] : dStr.substring(0, 10);
    };

    const formatShortTime = (tStr?: string | null) => {
        if (!tStr) return '';
        if (tStr.includes(':')) {
            const parts = tStr.split(':');
            if (parts.length >= 2) {
                return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            }
        }
        return tStr.substring(0, 5);
    };

    const getReturnUrgency = (b: any): { level: 'overdue' | 'due-soon' | 'normal'; label?: string } => {
        // Return urgency only applies to active rentals that have return_date and are currently active (On Trip / Confirmed)
        if (!b || !b.return_date || b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Returned' || b.status === 'Pending') {
            return { level: 'normal' };
        }

        const cleanDate = typeof b.return_date === 'string' ? b.return_date.substring(0, 10) : '';
        if (!cleanDate) return { level: 'normal' };

        const returnTimeStr = b.return_time
            ? (typeof b.return_time === 'string' ? b.return_time.substring(0, 5) : '23:59')
            : (b.pickup_time ? (typeof b.pickup_time === 'string' ? b.pickup_time.substring(0, 5) : '23:59') : '23:59');

        const targetDate = new Date(`${cleanDate}T${returnTimeStr}:00`);
        if (isNaN(targetDate.getTime())) return { level: 'normal' };

        const now = new Date();
        const diffMs = targetDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffMs < 0) {
            return { level: 'overdue', label: '⚠️ Lewat Batas Kembali' };
        }

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

        // Hari Ini (H-0)
        if (cleanDate === todayStr) {
            if (diffHours <= 12) {
                return { level: 'due-soon', label: `⏳ Kembali dlm ${Math.max(1, Math.round(diffHours))} jam` };
            }
            return { level: 'due-soon', label: '⏳ Harus Kembali Hari Ini' };
        }

        // H-1 (Besok / mendekati kembali hanya pada H-1)
        if (cleanDate === tomorrowStr || (diffHours > 0 && diffHours <= 24)) {
            return { level: 'due-soon', label: '⏳ Mendekati Tanggal Kembali' };
        }

        return { level: 'normal' };
    };

    const getRowHighlightClass = (b: any) => {
        const { level } = getReturnUrgency(b);
        if (level === 'overdue') {
            return 'bg-red-50/75 hover:bg-red-100/90 dark:bg-red-950/35 dark:hover:bg-red-950/50 border-l-4 border-l-red-500 transition-colors';
        }
        if (level === 'due-soon') {
            return 'bg-amber-50/75 hover:bg-amber-100/90 dark:bg-amber-950/35 dark:hover:bg-amber-950/50 border-l-4 border-l-amber-500 transition-colors';
        }
        return 'hover:bg-muted/50 transition-colors';
    };

    const getCardHighlightClass = (b: any) => {
        const { level } = getReturnUrgency(b);
        if (level === 'overdue') {
            return 'border-l-4 border-l-red-500 border-red-300 bg-red-50/35 dark:border-red-900/50 dark:bg-red-950/20';
        }
        if (level === 'due-soon') {
            return 'border-l-4 border-l-amber-500 border-amber-300 bg-amber-50/35 dark:border-amber-900/50 dark:bg-amber-950/20';
        }
        return 'border bg-card text-card-foreground shadow-xs';
    };

    const filteredMarketingCars = useMemo(() => {
        const list = stats.marketing?.cars_status || [];
        return list.filter((car: any) => {
            const matchesSearch =
                !carSearch.trim() ||
                car.name?.toLowerCase().includes(carSearch.toLowerCase()) ||
                car.brand?.toLowerCase().includes(carSearch.toLowerCase()) ||
                car.plate_number?.toLowerCase().includes(carSearch.toLowerCase()) ||
                car.type?.toLowerCase().includes(carSearch.toLowerCase()) ||
                car.active_booking?.customer_name?.toLowerCase().includes(carSearch.toLowerCase()) ||
                car.active_booking?.booking_number?.toLowerCase().includes(carSearch.toLowerCase());

            if (!matchesSearch) return false;

            if (carStatusFilter === 'rented') {
                return car.status === 'Not Ready' || car.active_booking?.status === 'On Trip';
            }
            if (carStatusFilter === 'confirmed') {
                return car.active_booking?.status === 'Confirmed';
            }
            if (carStatusFilter === 'pending') {
                return car.active_booking?.status === 'Pending';
            }

            return true;
        });
    }, [stats.marketing?.cars_status, carSearch, carStatusFilter]);

    const hasRole = (r: string) => roles.includes(r) || roles.includes('Super Admin');

    // Auto-poll dashboard stats every 10 seconds in the background
    usePoll(10000, {
        only: ['stats'],
    });

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

                {/* --- DATE FILTER BAR --- */}
                <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">Filter Berdasarkan Tanggal</span>
                            {filters?.is_filtered && (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal bg-primary/10 text-primary border-primary/20">
                                    Filter Aktif: {filters.start_date ? filters.start_date : 'Awal'} s/d {filters.end_date ? filters.end_date : 'Sekarang'}
                                </Badge>
                            )}
                        </div>

                        {/* Quick Filter Presets */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                type="button"
                                variant={isAllActive ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 text-xs px-3"
                                onClick={handleFilterAll}
                            >
                                Semua
                            </Button>
                            <Button
                                type="button"
                                variant={isTodayActive ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 text-xs px-3"
                                onClick={handleFilterToday}
                            >
                                Hari Ini
                            </Button>
                            <Button
                                type="button"
                                variant={isTomorrowActive ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 text-xs px-3"
                                onClick={handleFilterTomorrow}
                            >
                                Besok
                            </Button>
                            <Button
                                type="button"
                                variant={isThisWeekActive ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 text-xs px-3"
                                onClick={handleFilterThisWeek}
                            >
                                Minggu Ini
                            </Button>
                            <Button
                                type="button"
                                variant={isThisMonthActive ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 text-xs px-3"
                                onClick={handleFilterThisMonth}
                            >
                                Bulan Ini
                            </Button>
                        </div>
                    </div>

                    {/* Custom Date Inputs */}
                    <form onSubmit={handleCustomFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-1 border-t">
                        <div className="sm:col-span-1 md:col-span-4 space-y-1">
                            <Label htmlFor="dashboard_start_date" className="text-xs text-muted-foreground font-medium">Dari Tanggal</Label>
                            <Input
                                id="dashboard_start_date"
                                type="date"
                                className="h-8 text-xs bg-background"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="sm:col-span-1 md:col-span-4 space-y-1">
                            <Label htmlFor="dashboard_end_date" className="text-xs text-muted-foreground font-medium">Sampai Tanggal</Label>
                            <Input
                                id="dashboard_end_date"
                                type="date"
                                className="h-8 text-xs bg-background"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <div className="sm:col-span-2 md:col-span-4 flex items-end gap-2">
                            <Button type="submit" size="sm" className="h-8 text-xs flex-1 gap-1">
                                <Filter className="h-3.5 w-3.5" /> Terapkan Filter
                            </Button>
                            {(startDate || endDate || filters?.is_filtered) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1"
                                    onClick={handleReset}
                                >
                                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                                </Button>
                            )}
                        </div>
                    </form>
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

                            {/* 5. Booking Hari Ini / Periode */}
                            <Link href="/bookings" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-blue-200/80 hover:border-blue-400 dark:border-blue-950">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            {filters?.is_filtered ? 'Booking (Periode)' : 'Booking Hari Ini'}
                                        </CardTitle>
                                        <CalendarDays className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {filters?.is_filtered ? stats.admin.period_bookings : stats.admin.bookings_today}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {filters?.is_filtered ? 'Pesanan dalam periode filter' : 'Pesanan masuk hari ini'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 6. Pendapatan Hari Ini / Periode */}
                            <Link href="/payments" className="block">
                                <Card className="shadow-xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer h-full border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-950">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            {filters?.is_filtered ? 'Pendapatan (Periode)' : 'Pendapatan Hari Ini'}
                                        </CardTitle>
                                        <DollarSign className="h-4 w-4 text-emerald-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(filters?.is_filtered ? stats.admin.period_revenue : stats.admin.revenue_today)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {filters?.is_filtered ? 'Total transaksi dalam periode' : 'Total transaksi hari ini'}
                                        </p>
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
                                    <CardTitle>
                                        {filters?.is_filtered ? 'Booking Periode Terpilih' : 'Booking Terbaru'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Mobile Cards View */}
                                    <div className="space-y-3 md:hidden">
                                        {stats.admin.recent_bookings.length === 0 ? (
                                            <div className="text-center py-6 text-muted-foreground text-sm">
                                                Belum ada booking tercatat.
                                            </div>
                                        ) : (
                                            stats.admin.recent_bookings.map((booking: any) => {
                                                const urgency = getReturnUrgency(booking);
                                                return (
                                                    <div key={booking.id} className={`flex flex-col gap-2 p-3 rounded-lg shadow-xs ${getCardHighlightClass(booking)}`}>
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className="font-semibold text-sm">{booking.customer?.name}</span>
                                                                {booking.booking_number && (
                                                                    <div className="text-[10px] font-mono text-muted-foreground">{booking.booking_number}</div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                {urgency.level === 'overdue' && (
                                                                    <span className="text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded border border-red-200">
                                                                        {urgency.label}
                                                                    </span>
                                                                )}
                                                                {urgency.level === 'due-soon' && (
                                                                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-200">
                                                                        {urgency.label}
                                                                    </span>
                                                                )}
                                                                <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                                    {booking.status}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground space-y-0.5">
                                                            <div>Mobil: <span className="font-medium text-foreground">{booking.car_type}</span> {booking.car ? `(${booking.car.plate_number})` : ''}</div>
                                                            <div>Tanggal Sewa: <span className="font-medium text-foreground">{formatShortDate(booking.booking_date)}</span> {booking.pickup_time ? `(${formatShortTime(booking.pickup_time)})` : ''}</div>
                                                            <div>Tanggal Kembali: <span className="font-medium text-foreground">{formatShortDate(booking.return_date)}</span> {booking.return_time ? `(${formatShortTime(booking.return_time)})` : ''}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block relative overflow-x-auto rounded-lg border">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3">Pelanggan</th>
                                                    <th className="px-4 py-3">Tipe Mobil</th>
                                                    <th className="px-4 py-3">Tanggal Sewa</th>
                                                    <th className="px-4 py-3">Tanggal Kembali</th>
                                                    <th className="px-4 py-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {stats.admin.recent_bookings.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                            Belum ada booking tercatat.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    stats.admin.recent_bookings.map((booking: any) => {
                                                        const urgency = getReturnUrgency(booking);
                                                        return (
                                                            <tr key={booking.id} className={getRowHighlightClass(booking)}>
                                                                <td className="px-4 py-3 font-medium">
                                                                    <div>{booking.customer?.name}</div>
                                                                    {booking.booking_number && (
                                                                        <div className="text-[10px] font-mono text-muted-foreground">{booking.booking_number}</div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium">{booking.car_type}</div>
                                                                    {booking.car && (
                                                                        <div className="text-xs text-muted-foreground">{booking.car.name} ({booking.car.plate_number})</div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                                    <div>{formatShortDate(booking.booking_date)}</div>
                                                                    {booking.pickup_time && <div className="text-muted-foreground">({formatShortTime(booking.pickup_time)})</div>}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs">
                                                                    <div className="whitespace-nowrap font-medium text-foreground">
                                                                        {formatShortDate(booking.return_date)} {booking.return_time ? `(${formatShortTime(booking.return_time)})` : ''}
                                                                    </div>
                                                                    {urgency.level === 'overdue' && (
                                                                        <div className="mt-1">
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                                                                                {urgency.label}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {urgency.level === 'due-soon' && (
                                                                        <div className="mt-1">
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                                                                {urgency.label}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                                        {booking.status}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 mt-6">
                            <div>
                                <h2 className="text-xl font-semibold">Panel Marketing</h2>
                                <p className="text-xs text-muted-foreground">Kelola pesanan pelanggan dan pantau ketersediaan armada mobil</p>
                            </div>
                            <Link href={bookingsIndex().url}>
                                <Button size="sm" className="gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5" /> Buat Booking Baru
                                </Button>
                            </Link>
                        </div>

                        {/* Marketing Summary Cards */}
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                            {/* Total Mobil */}
                            <Card className="shadow-xs border-neutral-200/80 dark:border-neutral-800">
                                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3 px-4">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">Total Mobil</CardTitle>
                                    <Car className="h-3.5 w-3.5 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="px-4 pb-3">
                                    <div className="text-xl font-bold">{stats.marketing.total_cars ?? 0}</div>
                                    <p className="text-[11px] text-muted-foreground">Seluruh unit</p>
                                </CardContent>
                            </Card>

                            {/* Mobil Ready */}
                            <Card className="shadow-xs border-green-200/80 dark:border-green-950">
                                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3 px-4">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">Mobil Ready</CardTitle>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                </CardHeader>
                                <CardContent className="px-4 pb-3">
                                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.marketing.cars_ready ?? 0}</div>
                                    <p className="text-[11px] text-muted-foreground">Siap disewa</p>
                                </CardContent>
                            </Card>

                            {/* Sedang Disewa */}
                            <Card className="shadow-xs border-purple-200/80 dark:border-purple-950">
                                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3 px-4">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">Sedang Disewa</CardTitle>
                                    <Play className="h-3.5 w-3.5 text-purple-500" />
                                </CardHeader>
                                <CardContent className="px-4 pb-3">
                                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.marketing.cars_not_ready ?? 0}</div>
                                    <p className="text-[11px] text-muted-foreground">Unit di jalan</p>
                                </CardContent>
                            </Card>

                            {/* Perlu Dicuci / Service */}
                            <Card className="shadow-xs border-amber-200/80 dark:border-amber-950">
                                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3 px-4">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">Cuci / Service</CardTitle>
                                    <Wrench className="h-3.5 w-3.5 text-amber-500" />
                                </CardHeader>
                                <CardContent className="px-4 pb-3">
                                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                        {(stats.marketing.cars_belum_dicuci ?? 0) + (stats.marketing.cars_service ?? 0)}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">Perawatan</p>
                                </CardContent>
                            </Card>

                            {/* Total Pelanggan */}
                            <Link href="/customers" className="block">
                                <Card className="shadow-xs hover:scale-[1.02] transition-all cursor-pointer border-neutral-200/80 dark:border-neutral-800">
                                    <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3 px-4">
                                        <CardTitle className="text-xs font-medium text-muted-foreground">Pelanggan</CardTitle>
                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent className="px-4 pb-3">
                                        <div className="text-xl font-bold">{stats.marketing.total_customers ?? 0}</div>
                                        <p className="text-[11px] text-muted-foreground">Data customer</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* Total Booking */}
                            <Link href="/bookings" className="block">
                                <Card className="shadow-xs hover:scale-[1.02] transition-all cursor-pointer border-blue-200/80 dark:border-blue-950">
                                    <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3 px-4">
                                        <CardTitle className="text-xs font-medium text-muted-foreground">
                                            {filters?.is_filtered ? 'Booking (P)' : 'Booking'}
                                        </CardTitle>
                                        <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                                    </CardHeader>
                                    <CardContent className="px-4 pb-3">
                                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                            {filters?.is_filtered ? stats.marketing.period_bookings : stats.marketing.total_bookings}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {filters?.is_filtered ? 'Periode filter' : 'Total order'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>

                        {/* --- STATUS MOBIL BERDASARKAN BOOKING (MARKETING SECTION) --- */}
                        <Card className="border-neutral-200/80 dark:border-neutral-800">
                            <CardHeader className="pb-3">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Car className="h-5 w-5 text-primary" />
                                            Status Mobil Berdasarkan Booking
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Menampilkan mobil yang memiliki data jadwal booking aktif
                                        </p>
                                    </div>

                                    {/* Search & Quick Filter Tabs */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="relative w-full sm:w-56">
                                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Cari mobil / plat / penyewa..."
                                                className="h-8 text-xs pl-8 bg-background"
                                                value={carSearch}
                                                onChange={(e) => setCarSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant={carStatusFilter === 'all' ? 'default' : 'outline'}
                                                size="sm"
                                                className="h-8 text-xs px-2.5"
                                                onClick={() => setCarStatusFilter('all')}
                                            >
                                                Semua ({stats.marketing.cars_status?.length || 0})
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={carStatusFilter === 'rented' ? 'default' : 'outline'}
                                                size="sm"
                                                className="h-8 text-xs px-2.5"
                                                onClick={() => setCarStatusFilter('rented')}
                                            >
                                                On Trip ({stats.marketing.cars_status?.filter((c: any) => c.active_booking?.status === 'On Trip' || c.status === 'Not Ready').length || 0})
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={carStatusFilter === 'confirmed' ? 'default' : 'outline'}
                                                size="sm"
                                                className="h-8 text-xs px-2.5"
                                                onClick={() => setCarStatusFilter('confirmed')}
                                            >
                                                Confirmed ({stats.marketing.cars_status?.filter((c: any) => c.active_booking?.status === 'Confirmed').length || 0})
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={carStatusFilter === 'pending' ? 'default' : 'outline'}
                                                size="sm"
                                                className="h-8 text-xs px-2.5"
                                                onClick={() => setCarStatusFilter('pending')}
                                            >
                                                Pending ({stats.marketing.cars_status?.filter((c: any) => c.active_booking?.status === 'Pending').length || 0})
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Mobile Cards View */}
                                <div className="space-y-3 md:hidden">
                                    {filteredMarketingCars.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            Tidak ada data mobil dengan jadwal booking aktif saat ini.
                                        </div>
                                    ) : (
                                        filteredMarketingCars.map((car: any) => (
                                            <div key={car.id} className="flex flex-col gap-2 p-3.5 rounded-lg border bg-card text-card-foreground shadow-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-sm">{car.name}</span>
                                                    {getCarBookingStatusBadge(car)}
                                                </div>
                                                <div className="text-xs text-muted-foreground space-y-0.5">
                                                    <div>Plat Nomor: <span className="font-mono font-medium text-foreground">{car.plate_number}</span> ({car.color})</div>
                                                    <div>Tipe: {car.type || car.brand || '-'}</div>
                                                </div>
                                                {car.active_booking && (
                                                    <div className="mt-1 p-2 rounded-md bg-muted/50 text-xs space-y-0.5 border">
                                                        <div className="font-medium text-foreground flex items-center justify-between">
                                                            <span>Penyewa: {car.active_booking.customer_name}</span>
                                                            <Badge variant="outline" className={getStatusColor(car.active_booking.status)}>
                                                                {car.active_booking.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-muted-foreground">
                                                            Jadwal: {formatShortDate(car.active_booking.booking_date)} s/d {formatShortDate(car.active_booking.return_date)}
                                                            {car.active_booking.pickup_time ? ` (${formatShortTime(car.active_booking.pickup_time)})` : ''}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="mt-2">
                                                    <Link href={bookingsIndex().url} className="w-full">
                                                        <Button size="sm" variant="outline" className="w-full text-xs h-7">
                                                            Lihat di Menu Booking
                                                        </Button>
                                                    </Link>
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
                                                <th className="px-4 py-3">Armada Mobil</th>
                                                <th className="px-4 py-3">Status Booking Mobil</th>
                                                <th className="px-4 py-3">Penyewa & Jadwal Sewa</th>
                                                <th className="px-4 py-3 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {filteredMarketingCars.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                                        Tidak ada data mobil dengan jadwal booking aktif saat ini.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredMarketingCars.map((car: any) => (
                                                    <tr key={car.id} className="hover:bg-muted/50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-foreground">{car.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                <span className="font-mono">{car.plate_number}</span> • {car.color} • {car.type || car.brand}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {getCarBookingStatusBadge(car)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {car.active_booking ? (
                                                                <div className="space-y-0.5">
                                                                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                                        <span>Penyewa: {car.active_booking.customer_name}</span>
                                                                        <Badge variant="outline" className={getStatusColor(car.active_booking.status)}>
                                                                            {car.active_booking.status}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {formatShortDate(car.active_booking.booking_date)} s/d {formatShortDate(car.active_booking.return_date)}
                                                                        {car.active_booking.pickup_time ? ` (${formatShortTime(car.active_booking.pickup_time)})` : ''}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Link href={bookingsIndex().url}>
                                                                <Button size="sm" variant="outline" className="h-7 text-xs">
                                                                    Lihat Booking
                                                                </Button>
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Bookings */}
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {filters?.is_filtered ? 'Booking Periode Terpilih yang Dibuat' : 'Booking Terbaru yang Dibuat'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Mobile Cards View */}
                                <div className="space-y-3 md:hidden">
                                    {stats.marketing.recent_bookings.length === 0 ? (
                                        <div className="text-center py-6 text-muted-foreground text-sm">
                                            Belum ada booking yang dibuat.
                                        </div>
                                    ) : (
                                        stats.marketing.recent_bookings.map((booking: any) => {
                                            const urgency = getReturnUrgency(booking);
                                            return (
                                                <div key={booking.id} className={`flex flex-col gap-2 p-3 rounded-lg shadow-xs ${getCardHighlightClass(booking)}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="font-semibold text-sm">{booking.customer?.name}</span>
                                                            {booking.booking_number && (
                                                                <div className="text-[10px] font-mono text-muted-foreground">{booking.booking_number}</div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {urgency.level === 'overdue' && (
                                                                <span className="text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded border border-red-200">
                                                                    {urgency.label}
                                                                </span>
                                                            )}
                                                            {urgency.level === 'due-soon' && (
                                                                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-200">
                                                                    {urgency.label}
                                                                </span>
                                                            )}
                                                            <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                                {booking.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                                        <div>Mobil: <span className="font-medium text-foreground">{booking.car_type}</span> {booking.car ? `(${booking.car.plate_number})` : ''}</div>
                                                        <div>Tanggal Sewa: <span className="font-medium text-foreground">{formatShortDate(booking.booking_date)}</span> {booking.pickup_time ? `(${formatShortTime(booking.pickup_time)})` : ''}</div>
                                                        <div>Tanggal Kembali: <span className="font-medium text-foreground">{formatShortDate(booking.return_date)}</span> {booking.return_time ? `(${formatShortTime(booking.return_time)})` : ''}</div>
                                                        <div>Pembayaran: {booking.payment_method}</div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block relative overflow-x-auto rounded-lg border">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-3">Pelanggan</th>
                                                <th className="px-4 py-3">Tipe Mobil</th>
                                                <th className="px-4 py-3">Tanggal Sewa</th>
                                                <th className="px-4 py-3">Tanggal Kembali</th>
                                                <th className="px-4 py-3">Metode Pembayaran</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {stats.marketing.recent_bookings.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                                        Belum ada booking yang dibuat.
                                                    </td>
                                                </tr>
                                            ) : (
                                                stats.marketing.recent_bookings.map((booking: any) => {
                                                    const urgency = getReturnUrgency(booking);
                                                    return (
                                                        <tr key={booking.id} className={getRowHighlightClass(booking)}>
                                                            <td className="px-4 py-3 font-medium">
                                                                <div>{booking.customer?.name}</div>
                                                                {booking.booking_number && (
                                                                    <div className="text-[10px] font-mono text-muted-foreground">{booking.booking_number}</div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="font-medium">{booking.car_type}</div>
                                                                {booking.car && (
                                                                    <div className="text-xs text-muted-foreground">{booking.car.name} ({booking.car.plate_number})</div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                                <div>{formatShortDate(booking.booking_date)}</div>
                                                                {booking.pickup_time && <div className="text-muted-foreground">({formatShortTime(booking.pickup_time)})</div>}
                                                            </td>
                                                            <td className="px-4 py-3 text-xs">
                                                                <div className="whitespace-nowrap font-medium text-foreground">
                                                                    {formatShortDate(booking.return_date)} {booking.return_time ? `(${formatShortTime(booking.return_time)})` : ''}
                                                                </div>
                                                                {urgency.level === 'overdue' && (
                                                                    <div className="mt-1">
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                                                                            {urgency.label}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {urgency.level === 'due-soon' && (
                                                                    <div className="mt-1">
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                                                            {urgency.label}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-xs">{booking.payment_method}</td>
                                                            <td className="px-4 py-3">
                                                                <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                                    {booking.status}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
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
                            <Card className="border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                                        <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                                        Tugas Penyerahan Mobil (Serah Terima) ({stats.peluncur.assigned_deliveries.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-3">
                                    {stats.peluncur.assigned_deliveries.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            Tidak ada penyerahan mobil yang ditugaskan.
                                        </div>
                                    ) : (
                                        stats.peluncur.assigned_deliveries.map((booking: any) => (
                                            <div
                                                key={booking.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-background p-3.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all border-l-4 border-l-emerald-500 shadow-xs"
                                            >
                                                <div className="space-y-1 text-xs flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold text-sm text-foreground">{booking.customer?.name}</span>
                                                        {booking.booking_number && (
                                                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                {booking.booking_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-medium text-emerald-600 dark:text-emerald-400">
                                                        Mobil: {booking.car ? `${booking.car.name} (${booking.car.plate_number})` : (booking.car_type || '-')}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground pt-0.5">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            <span>Tanggal: {booking.booking_date} {booking.return_date ? `s/d ${booking.return_date}` : ''}</span>
                                                        </span>
                                                        <span className="flex items-center gap-1 font-medium text-foreground">
                                                            <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                            <span>
                                                                Jam: {booking.pickup_time ? booking.pickup_time.substring(0, 5) : '-'}
                                                                {booking.return_time ? ` s/d ${booking.return_time.substring(0, 5)}` : ''}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-start gap-1 text-muted-foreground pt-0.5">
                                                        <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                                        <div className="leading-tight">
                                                            <span className="font-medium text-foreground">Lokasi:</span>{' '}
                                                            <span className="text-foreground">{booking.pickup_location || <span className="italic text-muted-foreground">Pool / Belum ditentukan</span>}</span>
                                                            {booking.dropoff_location && booking.dropoff_location !== booking.pickup_location && (
                                                                <span className="text-[11px] text-muted-foreground block mt-0.5">
                                                                    Kembali: {booking.dropoff_location}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 self-end sm:self-center pt-1 sm:pt-0">
                                                    <Link href={`/bookings/${booking.id}/checklist`}>
                                                        <Button size="sm" className="w-full sm:w-auto flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold text-xs">
                                                            <Play className="h-3.5 w-3.5 fill-current" /> Checklist Serah Terima
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                        <RotateCcw className="h-5 w-5 text-amber-600" />
                                        Tugas Pengembalian Mobil (Ambil Unit) ({stats.peluncur.assigned_returns.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-3">
                                    {stats.peluncur.assigned_returns.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            Tidak ada pengembalian mobil yang aktif.
                                        </div>
                                    ) : (
                                        stats.peluncur.assigned_returns.map((booking: any) => (
                                            <div
                                                key={booking.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-background p-3.5 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all border-l-4 border-l-amber-500 shadow-xs"
                                            >
                                                <div className="space-y-1 text-xs flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold text-sm text-foreground">{booking.customer?.name}</span>
                                                        {booking.booking_number && (
                                                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                {booking.booking_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-medium text-amber-600 dark:text-amber-400">
                                                        Mobil: {booking.car ? `${booking.car.name} (${booking.car.plate_number})` : (booking.car_type || '-')}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground pt-0.5">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            <span>Tgl Kembali: {booking.return_date || booking.booking_date}</span>
                                                        </span>
                                                        <span className="flex items-center gap-1 font-medium text-foreground">
                                                            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                            <span>
                                                                Jam Kembali: {booking.return_time ? booking.return_time.substring(0, 5) : (booking.pickup_time ? booking.pickup_time.substring(0, 5) : '-')}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-start gap-1 text-muted-foreground pt-0.5">
                                                        <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                        <div className="leading-tight">
                                                            <span className="font-medium text-foreground">Lokasi Ambil:</span>{' '}
                                                            <span className="text-foreground">{booking.dropoff_location || booking.pickup_location || <span className="italic text-muted-foreground">Pool / Belum ditentukan</span>}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 self-end sm:self-center pt-1 sm:pt-0">
                                                    <Link href={`/bookings/${booking.id}/checklist?type=return`}>
                                                        <Button size="sm" className="w-full sm:w-auto flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white shadow-xs font-semibold text-xs">
                                                            <Play className="h-3.5 w-3.5 fill-current" /> Checklist Ambil Unit
                                                        </Button>
                                                    </Link>
                                                </div>
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
