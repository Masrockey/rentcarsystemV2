import { Head, router, Link } from '@inertiajs/react';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Truck,
    MapPin,
    Calendar,
    Clock,
    Search,
    Filter,
    X,
    LogIn,
    LogOut,
    CheckCircle2,
    Eye,
    ExternalLink,
    Car,
    User,
    Phone,
    RotateCcw,
    Route,
    Navigation,
} from 'lucide-react';
import Pagination, { PaginatedData } from '@/components/pagination';

type TripLogItem = {
    id: number;
    booking_id: number;
    booking: {
        id: number;
        customer_name?: string;
        customer_phone?: string;
        car_name?: string;
        booking_date?: string;
        return_date?: string;
        status?: string;
    } | null;
    driver_id: number;
    driver_name?: string;
    driver_phone?: string;
    driver_photo_url?: string | null;
    location_name: string;
    stop_order: number;
    status: 'Checked In' | 'Checked Out';
    checkin_at?: string;
    checkin_at_raw?: string;
    checkin_latitude?: number | null;
    checkin_longitude?: number | null;
    checkin_notes?: string | null;
    checkin_photo_url?: string | null;
    checkin_map_url?: string | null;
    checkout_at?: string;
    checkout_at_raw?: string;
    checkout_latitude?: number | null;
    checkout_longitude?: number | null;
    checkout_notes?: string | null;
    checkout_photo_url?: string | null;
    checkout_map_url?: string | null;
    created_at?: string;
};

type Props = {
    logs: PaginatedData<TripLogItem>;
    filters: {
        search: string;
        driver_id: string;
        status: string;
        start_date: string;
        end_date: string;
    };
    stats: {
        total_logs: number;
        active_checked_in: number;
        completed_checked_out: number;
        today_logs: number;
    };
    drivers: { id: number; name: string; phone: string }[];
};

const getOsmEmbedUrl = (lat: number, lng: number) => {
    const delta = 0.006;
    const minLng = (lng - delta).toFixed(6);
    const minLat = (lat - delta).toFixed(6);
    const maxLng = (lng + delta).toFixed(6);
    const maxLat = (lat + delta).toFixed(6);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
};

const getOsmViewUrl = (lat: number, lng: number) => {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
};

export default function DriverTripLogsIndex({ logs, filters, stats, drivers }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [driverId, setDriverId] = useState(filters.driver_id || 'all');
    const [status, setStatus] = useState(filters.status || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    // Modal Details & Image Zoom
    const [selectedLog, setSelectedLog] = useState<TripLogItem | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const applyFilters = (override: Partial<typeof filters> = {}) => {
        router.get(
            '/driver-trip-logs',
            {
                search: override.search !== undefined ? override.search : search,
                driver_id: override.driver_id !== undefined ? override.driver_id : (driverId === 'all' ? '' : driverId),
                status: override.status !== undefined ? override.status : (status === 'all' ? '' : status),
                start_date: override.start_date !== undefined ? override.start_date : startDate,
                end_date: override.end_date !== undefined ? override.end_date : endDate,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleResetFilters = () => {
        setSearch('');
        setDriverId('all');
        setStatus('all');
        setStartDate('');
        setEndDate('');
        router.get('/driver-trip-logs', {}, { preserveState: true, replace: true });
    };

    const setQuickDate = (type: 'today' | 'week' | 'month' | 'all') => {
        const now = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        if (type === 'today') {
            const str = formatDate(now);
            setStartDate(str);
            setEndDate(str);
            applyFilters({ start_date: str, end_date: str });
        } else if (type === 'week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            const startStr = formatDate(startOfWeek);
            const endStr = formatDate(now);
            setStartDate(startStr);
            setEndDate(endStr);
            applyFilters({ start_date: startStr, end_date: endStr });
        } else if (type === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startStr = formatDate(startOfMonth);
            const endStr = formatDate(now);
            setStartDate(startStr);
            setEndDate(endStr);
            applyFilters({ start_date: startStr, end_date: endStr });
        } else {
            setStartDate('');
            setEndDate('');
            applyFilters({ start_date: '', end_date: '' });
        }
    };

    return (
        <>
            <Head title="Log Perjalanan Driver" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Route className="h-6 w-6 text-primary" />
                            Log Perjalanan Driver
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Pantau riwayat check-in & check-out lokasi perhentian (multi-stop) seluruh supir armada.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-xs"
                        >
                            <Link href="/drivers">
                                <Truck className="h-3.5 w-3.5 mr-1.5" />
                                Kelola Data Supir
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* KPI Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-blue-500 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground">Total Riwayat Perhentian</CardTitle>
                            <MapPin className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_logs}</div>
                            <p className="text-[11px] text-muted-foreground mt-1">Keseluruhan titik perhentian tercatat</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground">Sedang Berada di Lokasi</CardTitle>
                            <LogIn className="h-4 w-4 text-emerald-500 animate-pulse" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {stats.active_checked_in}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">Status Checked In (Menunggu Check-out)</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-indigo-500 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground">Perhentian Selesai</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.completed_checked_out}</div>
                            <p className="text-[11px] text-muted-foreground mt-1">Sudah selesai Check-out</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground">Aktivitas Hari Ini</CardTitle>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {stats.today_logs}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">Perhentian check-in hari ini</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter & Search Bar */}
                <Card className="shadow-xs">
                    <CardContent className="p-4 space-y-3">
                        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari lokasi, supir, customer..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 text-xs h-9"
                                />
                            </div>

                            {/* Driver Select */}
                            <div>
                                <select
                                    value={driverId}
                                    onChange={(e) => {
                                        setDriverId(e.target.value);
                                        applyFilters({ driver_id: e.target.value });
                                    }}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                                >
                                    <option value="all">Semua Supir</option>
                                    {drivers.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name} ({d.phone})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Select */}
                            <div>
                                <select
                                    value={status}
                                    onChange={(e) => {
                                        setStatus(e.target.value);
                                        applyFilters({ status: e.target.value });
                                    }}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="Checked In">Sedang Di Lokasi (Checked In)</option>
                                    <option value="Checked Out">Selesai (Checked Out)</option>
                                </select>
                            </div>

                            {/* Start Date */}
                            <div>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="text-xs h-9"
                                />
                            </div>

                            {/* End Date */}
                            <div>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="text-xs h-9"
                                />
                            </div>
                        </form>

                        {/* Quick Date Filters and Filter Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-muted-foreground font-medium mr-1">Filter Cepat:</span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuickDate('today')}
                                    className="text-xs h-7 px-2"
                                >
                                    Hari Ini
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuickDate('week')}
                                    className="text-xs h-7 px-2"
                                >
                                    Minggu Ini
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuickDate('month')}
                                    className="text-xs h-7 px-2"
                                >
                                    Bulan Ini
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuickDate('all')}
                                    className="text-xs h-7 px-2"
                                >
                                    Semua Waktu
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetFilters}
                                    className="text-xs h-7 gap-1"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Reset
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => applyFilters()}
                                    className="text-xs h-7 gap-1"
                                >
                                    <Filter className="h-3 w-3" />
                                    Terapkan Filter
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table Card */}
                <Card className="shadow-xs overflow-hidden">
                    <CardHeader className="py-3 px-4 border-b bg-muted/20">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                Daftar Log Perjalanan Supir ({logs.total})
                            </CardTitle>
                        </div>
                    </CardHeader>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-b">
                                <tr>
                                    <th className="py-3 px-4">Stop & Lokasi</th>
                                    <th className="py-3 px-4">Supir Armada</th>
                                    <th className="py-3 px-4">Booking & Tamu</th>
                                    <th className="py-3 px-4">Check-in (Tiba)</th>
                                    <th className="py-3 px-4">Check-out (Berangkat)</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {logs.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <MapPin className="h-8 w-8 text-muted-foreground/40" />
                                                <p className="font-semibold text-sm">Tidak ada riwayat log perjalanan.</p>
                                                <p className="text-xs">Coba ubah kata kunci pencarian atau filter tanggal.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.data.map((log) => {
                                        const isCheckedIn = log.status === 'Checked In';
                                        return (
                                            <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                                {/* Lokasi & Stop */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-start gap-2">
                                                        <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
                                                            isCheckedIn
                                                                ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                                                                : 'bg-blue-500/15 text-blue-600 border border-blue-500/30'
                                                        }`}>
                                                            {log.stop_order}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-foreground flex items-center gap-1">
                                                                <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                                                <span>{log.location_name}</span>
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                                Pemberhentian ke-{log.stop_order}
                                                            </div>
                                                            {log.checkin_latitude && log.checkin_longitude && (
                                                                <a
                                                                    href={getOsmViewUrl(log.checkin_latitude, log.checkin_longitude)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline mt-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
                                                                >
                                                                    <Navigation className="h-2.5 w-2.5 text-emerald-600" />
                                                                    Buka di Browser
                                                                    <ExternalLink className="h-2 w-2" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Driver */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {log.driver_photo_url ? (
                                                            <img
                                                                src={log.driver_photo_url}
                                                                alt={log.driver_name || 'Driver'}
                                                                className="h-7 w-7 rounded-full object-cover border shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                                                {log.driver_name?.charAt(0) || 'D'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-semibold text-foreground">{log.driver_name || '-'}</div>
                                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                <Phone className="h-2.5 w-2.5" />
                                                                {log.driver_phone || '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Booking & Tamu */}
                                                <td className="py-3 px-4">
                                                    {log.booking ? (
                                                        <div>
                                                            <Link
                                                                href={`/bookings`}
                                                                className="font-bold text-primary hover:underline"
                                                            >
                                                                Booking #{log.booking_id}
                                                            </Link>
                                                            <div className="text-foreground font-medium mt-0.5">
                                                                {log.booking.customer_name || '-'}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                <Car className="h-3 w-3 text-blue-600" />
                                                                <span>{log.booking.car_name || '-'}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">Booking #{log.booking_id}</span>
                                                    )}
                                                </td>

                                                {/* Check-in */}
                                                <td className="py-3 px-4">
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                            <LogIn className="h-3 w-3" />
                                                            <span>{log.checkin_at || '-'}</span>
                                                        </div>
                                                        {log.checkin_notes && (
                                                            <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                                                "{log.checkin_notes}"
                                                            </p>
                                                        )}
                                                        {log.checkin_photo_url && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setZoomedImage(log.checkin_photo_url!)}
                                                                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                                                            >
                                                                <Eye className="h-2.5 w-2.5" /> Lihat Foto Tiba
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Check-out */}
                                                <td className="py-3 px-4">
                                                    {isCheckedIn ? (
                                                        <span className="text-muted-foreground italic text-[11px]">
                                                            Belum Check-out
                                                        </span>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <div className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                                <LogOut className="h-3 w-3" />
                                                                <span>{log.checkout_at || '-'}</span>
                                                            </div>
                                                            {log.checkout_notes && (
                                                                <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                                                    "{log.checkout_notes}"
                                                                </p>
                                                            )}
                                                            {log.checkout_photo_url && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setZoomedImage(log.checkout_photo_url!)}
                                                                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                                                                >
                                                                    <Eye className="h-2.5 w-2.5" /> Lihat Foto Berangkat
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            isCheckedIn
                                                                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 animate-pulse text-[10px]'
                                                                : 'bg-blue-500/15 text-blue-600 border-blue-500/25 text-[10px]'
                                                        }
                                                    >
                                                        {isCheckedIn ? 'Sedang Di Lokasi' : 'Selesai (Checked Out)'}
                                                    </Badge>
                                                </td>

                                                {/* Aksi */}
                                                <td className="py-3 px-4 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setSelectedLog(log)}
                                                        className="text-xs h-7 gap-1"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                        Detail
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {logs.data.length > 0 && (
                        <div className="p-4 border-t">
                            <Pagination data={logs} />
                        </div>
                    )}
                </Card>
            </div>

            {/* Modal Detail Log Perjalanan */}
            {selectedLog && (
                <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <Route className="h-5 w-5 text-primary" />
                                Detail Log Perjalanan: {selectedLog.location_name}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Pemberhentian ke-{selectedLog.stop_order} pada Booking #{selectedLog.booking_id}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2 text-xs">
                            {/* Supir & Booking Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
                                <div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Supir</div>
                                    <div className="font-bold text-sm text-foreground mt-0.5">{selectedLog.driver_name}</div>
                                    <div className="text-muted-foreground mt-0.5">{selectedLog.driver_phone}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Booking & Armada</div>
                                    <div className="font-bold text-foreground mt-0.5">
                                        Booking #{selectedLog.booking_id} - {selectedLog.booking?.customer_name}
                                    </div>
                                    <div className="text-muted-foreground mt-0.5">{selectedLog.booking?.car_name}</div>
                                </div>
                            </div>

                            {/* Check-in Block */}
                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-2">
                                <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
                                    <span className="flex items-center gap-1.5">
                                        <LogIn className="h-4 w-4" /> Check-in (Kedatangan)
                                    </span>
                                    <span className="font-mono text-xs">{selectedLog.checkin_at}</span>
                                </div>

                                {selectedLog.checkin_notes && (
                                    <p className="text-muted-foreground italic">"{selectedLog.checkin_notes}"</p>
                                )}

                                {selectedLog.checkin_latitude && selectedLog.checkin_longitude && (
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                Koordinat: {selectedLog.checkin_latitude.toFixed(6)}, {selectedLog.checkin_longitude.toFixed(6)}
                                            </span>
                                            <a
                                                href={getOsmViewUrl(selectedLog.checkin_latitude, selectedLog.checkin_longitude)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-sans text-[11px]"
                                            >
                                                Buka di Browser <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                        <div className="rounded-lg overflow-hidden border relative">
                                            <iframe
                                                title="OSM Checkin Detail"
                                                src={getOsmEmbedUrl(selectedLog.checkin_latitude, selectedLog.checkin_longitude)}
                                                className="w-full h-44 border-0"
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>
                                )}

                                {selectedLog.checkin_photo_url && (
                                    <div className="pt-1">
                                        <div className="text-[10px] text-muted-foreground font-semibold mb-1">Foto Bukti Check-in:</div>
                                        <img
                                            src={selectedLog.checkin_photo_url}
                                            alt="Foto Check-in"
                                            onClick={() => setZoomedImage(selectedLog.checkin_photo_url!)}
                                            className="h-28 w-44 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Check-out Block */}
                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2">
                                <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400">
                                    <span className="flex items-center gap-1.5">
                                        <LogOut className="h-4 w-4" /> Check-out (Keberangkatan)
                                    </span>
                                    <span className="font-mono text-xs">
                                        {selectedLog.checkout_at || 'Belum Check-out'}
                                    </span>
                                </div>

                                {selectedLog.status === 'Checked In' ? (
                                    <p className="text-muted-foreground italic">
                                        Supir saat ini masih berada di lokasi ini dan belum melakukan check-out.
                                    </p>
                                ) : (
                                    <>
                                        {selectedLog.checkout_notes && (
                                            <p className="text-muted-foreground italic">"{selectedLog.checkout_notes}"</p>
                                        )}

                                        {selectedLog.checkout_latitude && selectedLog.checkout_longitude && (
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-[10px] text-muted-foreground">
                                                        Koordinat: {selectedLog.checkout_latitude.toFixed(6)}, {selectedLog.checkout_longitude.toFixed(6)}
                                                    </span>
                                                    <a
                                                        href={getOsmViewUrl(selectedLog.checkout_latitude, selectedLog.checkout_longitude)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-amber-600 hover:underline inline-flex items-center gap-1 font-sans text-[11px]"
                                                    >
                                                        Buka di Browser <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                                <div className="rounded-lg overflow-hidden border relative">
                                                    <iframe
                                                        title="OSM Checkout Detail"
                                                        src={getOsmEmbedUrl(selectedLog.checkout_latitude, selectedLog.checkout_longitude)}
                                                        className="w-full h-44 border-0"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {selectedLog.checkout_photo_url && (
                                            <div className="pt-1">
                                                <div className="text-[10px] text-muted-foreground font-semibold mb-1">Foto Bukti Check-out:</div>
                                                <img
                                                    src={selectedLog.checkout_photo_url}
                                                    alt="Foto Check-out"
                                                    onClick={() => setZoomedImage(selectedLog.checkout_photo_url!)}
                                                    className="h-28 w-44 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Image Zoom Modal */}
            {zoomedImage && (
                <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
                    <DialogContent className="max-w-4xl p-2 bg-black/90 border-0 flex items-center justify-center">
                        <img
                            src={zoomedImage}
                            alt="Foto Perjalanan"
                            className="max-h-[85vh] w-auto object-contain rounded"
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
