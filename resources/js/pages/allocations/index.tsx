import { Head, Link, router, useForm, usePoll } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useState, useMemo } from 'react';
import { Search, Settings, AlertTriangle, CheckCircle2, Car, UserCheck, KeyRound, Calendar, X, Filter, ShieldAlert, ShieldCheck, Loader2, AlertOctagon, ExternalLink, ArrowRight, Download } from 'lucide-react';
import { index as allocationsIndex } from '@/routes/allocations';

import Pagination, { PaginatedData } from '@/components/pagination';

type CarRef = { id: number; name: string; plate_number: string; daily_price?: string };
type DriverRef = { id: number; name: string; phone?: string | null; daily_rate?: string };
type UserRef = { id: number; name: string };
type CustomerRef = { id: number; name: string; phone?: string | null; nik?: string | null; address?: string | null; email?: string | null };

type BlacklistRef = {
    id: number;
    name: string;
    phone?: string | null;
    nik?: string | null;
    address?: string | null;
    incident_date?: string | null;
    perpetrator_info?: string | null;
    blacklisted_by?: string | null;
    report_date?: string | null;
};

type Booking = {
    id: number;
    booking_number: string | null;
    customer_id: number;
    car_type: string;
    rental_type: 'Lepas Kunci' | 'With Driver' | null;
    car_id: number | null;
    driver_id: number | null;
    peluncur_id: number | null;
    petugas_cuci_id: number | null;
    booking_date: string;
    return_date: string | null;
    pickup_time: string | null;
    return_time: string | null;
    pickup_location: string | null;
    dropoff_location: string | null;
    amount: string;
    status: string;
    payment_status: string;
    payment_method: string;
    customer?: CustomerRef;
    car?: CarRef;
    driver?: DriverRef;
    peluncur?: UserRef;
    petugas_cuci?: UserRef;
    user?: UserRef;
};

type Props = {
    bookings: PaginatedData<Booking> | Booking[];
    readyCars: CarRef[];
    readyDrivers: DriverRef[];
    peluncurOfficers: UserRef[];
    washOfficers: UserRef[];
    unallocatedCount: number;
    allocatedCount: number;
    blacklists?: BlacklistRef[];
};

export default function AllocationsIndex({
    bookings,
    readyCars,
    readyDrivers,
    peluncurOfficers,
    washOfficers,
    unallocatedCount,
    allocatedCount,
    blacklists = [],
}: Props) {
    const bookingList = useMemo(() => Array.isArray(bookings) ? bookings : (bookings?.data || []), [bookings]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'unallocated' | 'allocated'>('all');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isAllocateOpen, setIsAllocateOpen] = useState(false);

    // Auto-poll allocations data every 10 seconds in the background
    usePoll(10000, {
        only: ['bookings', 'readyCars', 'drivers', 'unallocatedCount', 'allocatedCount'],
    });

    // Blacklist Checking States
    const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
    const [checkingBooking, setCheckingBooking] = useState<Booking | null>(null);
    const [checkStage, setCheckStage] = useState<'checking' | 'blacklisted' | 'clean'>('checking');
    const [matchedBlacklist, setMatchedBlacklist] = useState<BlacklistRef | null>(null);

    // Date Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateFilterField, setDateFilterField] = useState<'booking_date' | 'return_date' | 'active_period'>('booking_date');

    const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
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
        const diff = now.getDate() - (day === 0 ? 6 : day - 1);
        const monday = new Date(now.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return {
            start: formatLocalDate(monday),
            end: formatLocalDate(sunday),
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

    const handleFilterAll = () => {
        setStartDate('');
        setEndDate('');
    };

    const handleFilterToday = () => {
        const today = getTodayStr();
        setStartDate(today);
        setEndDate(today);
    };

    const handleFilterTomorrow = () => {
        const tomorrow = getTomorrowStr();
        setStartDate(tomorrow);
        setEndDate(tomorrow);
    };

    const handleFilterThisWeek = () => {
        const range = getThisWeekRange();
        setStartDate(range.start);
        setEndDate(range.end);
    };

    const handleFilterThisMonth = () => {
        const range = getThisMonthRange();
        setStartDate(range.start);
        setEndDate(range.end);
    };

    const handleResetAllFilters = () => {
        setStartDate('');
        setEndDate('');
        setDateFilterField('booking_date');
        setActiveFilter('all');
        setSearchQuery('');
    };

    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();
    const thisWeek = getThisWeekRange();
    const thisMonth = getThisMonthRange();

    const isTodayActive = startDate === todayStr && endDate === todayStr;
    const isTomorrowActive = startDate === tomorrowStr && endDate === tomorrowStr;
    const isThisWeekActive = startDate === thisWeek.start && endDate === thisWeek.end;
    const isThisMonthActive = startDate === thisMonth.start && endDate === thisMonth.end;

    const { data: assignData, setData: setAssignData, put: putAssign, processing: processingAssign } = useForm({
        car_id: '',
        driver_id: '',
        peluncur_id: '',
        petugas_cuci_id: '',
        amount: '',
    });

    const openAllocateDialog = (booking: Booking) => {
        setSelectedBooking(booking);
        setAssignData({
            car_id: booking.car_id ? booking.car_id.toString() : '',
            driver_id: booking.driver_id ? booking.driver_id.toString() : '',
            peluncur_id: booking.peluncur_id ? booking.peluncur_id.toString() : '',
            petugas_cuci_id: booking.petugas_cuci_id ? booking.petugas_cuci_id.toString() : '',
            amount: booking.amount ? parseFloat(booking.amount).toString() : '',
        });
        setIsAllocateOpen(true);
    };

    const handleStartAllocation = (booking: Booking) => {
        setCheckingBooking(booking);
        setCheckStage('checking');
        setMatchedBlacklist(null);
        setIsCheckModalOpen(true);

        // Perform checking with slight simulated scan delay for clear visual feedback
        setTimeout(() => {
            const cust = booking.customer;
            if (!cust) {
                setCheckStage('clean');
                return;
            }

            const cleanPhone = (p?: string | null) => (p || '').replace(/\D/g, '').replace(/^0/, '').replace(/^62/, '');
            const custPhone = cleanPhone(cust.phone);
            const custNik = (cust.nik || '').trim().toLowerCase();
            const custName = (cust.name || '').trim().toLowerCase();

            const found = blacklists.find((bl) => {
                const blPhone = cleanPhone(bl.phone);
                const blNik = (bl.nik || '').trim().toLowerCase();
                const blName = (bl.name || '').trim().toLowerCase();

                if (custNik && blNik && custNik === blNik) return true;
                if (custPhone && blPhone && custPhone.length >= 6 && blPhone.length >= 6 && (custPhone === blPhone || custPhone.endsWith(blPhone) || blPhone.endsWith(custPhone))) return true;
                if (custName && blName && (custName === blName || custName.includes(blName) || blName.includes(custName))) return true;

                return false;
            });

            if (found) {
                setMatchedBlacklist(found);
                setCheckStage('blacklisted');
            } else {
                setMatchedBlacklist(null);
                setCheckStage('clean');
            }
        }, 600);
    };

    const handleProceedFromCheck = () => {
        if (!checkingBooking) return;
        setIsCheckModalOpen(false);
        openAllocateDialog(checkingBooking);
    };

    const handleReviseBooking = () => {
        if (!checkingBooking) return;
        setIsCheckModalOpen(false);
        const searchParam = encodeURIComponent(checkingBooking.booking_number || checkingBooking.customer?.name || '');
        router.visit(`/bookings?search=${searchParam}`);
    };

    const handleAssignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBooking) return;
        putAssign(`/allocations/${selectedBooking.id}`, {
            onSuccess: () => {
                setIsAllocateOpen(false);
                setSelectedBooking(null);
            },
        });
    };

    const formatCurrency = (val: string | number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

    // Dynamic counts based on active date range
    const currentUnallocatedCount = useMemo(() => {
        return bookingList.filter((b) => {
            if (startDate || endDate) {
                const bStartDate = b.booking_date ? b.booking_date.substring(0, 10) : '';
                const bReturnDate = b.return_date ? b.return_date.substring(0, 10) : '';
                if (dateFilterField === 'booking_date') {
                    if (!bStartDate || (startDate && bStartDate < startDate) || (endDate && bStartDate > endDate)) return false;
                } else if (dateFilterField === 'return_date') {
                    if (!bReturnDate || (startDate && bReturnDate < startDate) || (endDate && bReturnDate > endDate)) return false;
                } else if (dateFilterField === 'active_period') {
                    const rangeStart = startDate || endDate;
                    const rangeEnd = endDate || startDate;
                    const bookingEnd = bReturnDate || bStartDate;
                    if (bStartDate > rangeEnd || bookingEnd < rangeStart) return false;
                }
            }
            return b.car_id === null;
        }).length;
    }, [bookingList, startDate, endDate, dateFilterField]);

    const currentAllocatedCount = useMemo(() => {
        return bookingList.filter((b) => {
            if (startDate || endDate) {
                const bStartDate = b.booking_date ? b.booking_date.substring(0, 10) : '';
                const bReturnDate = b.return_date ? b.return_date.substring(0, 10) : '';
                if (dateFilterField === 'booking_date') {
                    if (!bStartDate || (startDate && bStartDate < startDate) || (endDate && bStartDate > endDate)) return false;
                } else if (dateFilterField === 'return_date') {
                    if (!bReturnDate || (startDate && bReturnDate < startDate) || (endDate && bReturnDate > endDate)) return false;
                } else if (dateFilterField === 'active_period') {
                    const rangeStart = startDate || endDate;
                    const rangeEnd = endDate || startDate;
                    const bookingEnd = bReturnDate || bStartDate;
                    if (bStartDate > rangeEnd || bookingEnd < rangeStart) return false;
                }
            }
            return b.car_id !== null;
        }).length;
    }, [bookingList, startDate, endDate, dateFilterField]);

    const currentTotalCount = currentUnallocatedCount + currentAllocatedCount;

    const filteredBookings = useMemo(() => {
        return bookingList.filter((b) => {
            const matchesSearch =
                (b.customer?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.booking_number ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.car_type ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.car?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.car?.plate_number ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.peluncur?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.petugas_cuci?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.user?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.driver?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (activeFilter === 'unallocated' && b.car_id !== null) return false;
            if (activeFilter === 'allocated' && b.car_id === null) return false;

            if (startDate || endDate) {
                const bStartDate = b.booking_date ? b.booking_date.substring(0, 10) : '';
                const bReturnDate = b.return_date ? b.return_date.substring(0, 10) : '';

                if (dateFilterField === 'booking_date') {
                    if (!bStartDate) return false;
                    if (startDate && bStartDate < startDate) return false;
                    if (endDate && bStartDate > endDate) return false;
                } else if (dateFilterField === 'return_date') {
                    if (!bReturnDate) return false;
                    if (startDate && bReturnDate < startDate) return false;
                    if (endDate && bReturnDate > endDate) return false;
                } else if (dateFilterField === 'active_period') {
                    const rangeStart = startDate || endDate;
                    const rangeEnd = endDate || startDate;
                    const bookingEnd = bReturnDate || bStartDate;
                    if (bStartDate > rangeEnd || bookingEnd < rangeStart) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [bookingList, searchQuery, activeFilter, startDate, endDate, dateFilterField]);

    const handleExportData = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (activeFilter !== 'all') params.append('status', activeFilter);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (dateFilterField) params.append('date_field', dateFilterField);

        const url = `/allocations/export?${params.toString()}`;
        window.location.href = url;
    };

    return (
        <>
            <Head title="Alokasi Mobil & Staf" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">Alokasi Mobil & Staf</h1>
                        <p className="text-muted-foreground">Kelola penugasan armada mobil, supir, peluncur, dan petugas cuci untuk pesanan sewa.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 h-9 text-xs font-semibold shadow-xs hover:bg-muted"
                            onClick={handleExportData}
                        >
                            <Download className="h-4 w-4 text-primary" />
                            Download Data (CSV / Excel)
                        </Button>
                    </div>
                </div>

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card
                        className={`cursor-pointer transition-all hover:scale-[1.01] ${activeFilter === 'all' ? 'ring-2 ring-primary shadow-xs' : ''}`}
                        onClick={() => setActiveFilter('all')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Booking</CardTitle>
                            <Car className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{currentTotalCount}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {startDate || endDate ? 'Pesanan pada periode filter' : 'Keseluruhan pesanan sewa'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card
                        className={`cursor-pointer transition-all hover:scale-[1.01] border-red-200 bg-red-50/10 dark:bg-red-950/10 ${activeFilter === 'unallocated' ? 'ring-2 ring-red-500 shadow-xs' : ''}`}
                        onClick={() => setActiveFilter('unallocated')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Belum Dialokasi</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{currentUnallocatedCount}</div>
                            <p className="text-xs text-red-500/80 dark:text-red-400/80 mt-1">Booking membutuhkan unit mobil</p>
                        </CardContent>
                    </Card>

                    <Card
                        className={`cursor-pointer transition-all hover:scale-[1.01] border-green-200 bg-green-50/10 dark:bg-green-950/10 ${activeFilter === 'allocated' ? 'ring-2 ring-green-500 shadow-xs' : ''}`}
                        onClick={() => setActiveFilter('allocated')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Sudah Dialokasi</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{currentAllocatedCount}</div>
                            <p className="text-xs text-green-500/80 dark:text-green-400/80 mt-1">Armada telah ditentukan</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-primary" />
                            Daftar Alokasi Armada ({filteredBookings.length})
                        </CardTitle>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                                <Button
                                    variant={activeFilter === 'all' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setActiveFilter('all')}
                                >
                                    Semua ({currentTotalCount})
                                </Button>
                                <Button
                                    variant={activeFilter === 'unallocated' ? 'destructive' : 'ghost'}
                                    size="sm"
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setActiveFilter('unallocated')}
                                >
                                    ⚠️ Belum Dialokasi ({currentUnallocatedCount})
                                </Button>
                                <Button
                                    variant={activeFilter === 'allocated' ? 'default' : 'ghost'}
                                    size="sm"
                                    className={`h-7 text-xs px-2.5 ${activeFilter === 'allocated' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                    onClick={() => setActiveFilter('allocated')}
                                >
                                    ✓ Dialokasi ({currentAllocatedCount})
                                </Button>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Cari pelanggan / no. booking..."
                                        className="pl-8 h-9 text-xs"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 text-xs px-3 flex items-center gap-1.5 shrink-0"
                                    title="Download Data (CSV / Excel)"
                                    onClick={handleExportData}
                                >
                                    <Download className="h-4 w-4 text-primary" />
                                    <span className="hidden sm:inline">Export</span>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filter Tanggal Bar */}
                        <div className="mb-5 p-3.5 rounded-lg border bg-muted/30 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Filter Berdasarkan Tanggal</span>
                                    {(startDate || endDate || activeFilter !== 'all') && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                            {filteredBookings.length} data ditemukan
                                        </Badge>
                                    )}
                                </div>

                                {/* Quick Filter Presets */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant={!startDate && !endDate ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-7 text-xs px-2.5"
                                        onClick={handleFilterAll}
                                    >
                                        Semua
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={isTodayActive ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-7 text-xs px-2.5"
                                        onClick={handleFilterToday}
                                    >
                                        Hari Ini
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={isTomorrowActive ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-7 text-xs px-2.5"
                                        onClick={handleFilterTomorrow}
                                    >
                                        Besok
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={isThisWeekActive ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-7 text-xs px-2.5"
                                        onClick={handleFilterThisWeek}
                                    >
                                        Minggu Ini
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={isThisMonthActive ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-7 text-xs px-2.5"
                                        onClick={handleFilterThisMonth}
                                    >
                                        Bulan Ini
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 gap-3 pt-1">
                                <div className="space-y-1">
                                    <Label htmlFor="dateFilterField" className="text-[11px] text-muted-foreground font-medium">Tipe Tanggal</Label>
                                    <Select
                                        value={dateFilterField}
                                        onValueChange={(val: any) => setDateFilterField(val)}
                                    >
                                        <SelectTrigger id="dateFilterField" className="h-8 text-xs bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="booking_date">Tanggal Sewa (Mulai)</SelectItem>
                                            <SelectItem value="return_date">Tanggal Balik (Selesai)</SelectItem>
                                            <SelectItem value="active_period">Periode Aktif Sewa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="filter_start_date" className="text-[11px] text-muted-foreground font-medium">Dari Tanggal</Label>
                                    <Input
                                        id="filter_start_date"
                                        type="date"
                                        className="h-8 text-xs bg-background"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="filter_end_date" className="text-[11px] text-muted-foreground font-medium">Sampai Tanggal</Label>
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            id="filter_end_date"
                                            type="date"
                                            className="h-8 text-xs bg-background"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                        {(startDate || endDate || activeFilter !== 'all' || searchQuery) && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                                                title="Reset Filter"
                                                onClick={handleResetAllFilters}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Mobile Cards View */}
                        <div className="space-y-3 md:hidden">
                            {filteredBookings.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    {searchQuery ? 'Tidak ada data alokasi yang cocok.' : 'Belum ada data booking.'}
                                </div>
                            ) : (
                                filteredBookings.map((b) => (
                                    <div key={b.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card text-card-foreground shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-semibold text-sm">{b.customer?.name}</span>
                                                {b.booking_number && (
                                                    <div className="text-[11px] font-mono text-muted-foreground">{b.booking_number}</div>
                                                )}
                                            </div>
                                            <Badge variant="outline" className="text-[10px] bg-primary/5 font-medium">
                                                {b.rental_type ?? 'Lepas Kunci'}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1 pt-1">
                                            <div><span className="font-semibold text-foreground">Tipe Dipesan:</span> {b.car_type}</div>
                                            <div>
                                                <span className="font-semibold text-foreground">Armada Mobil:</span>{' '}
                                                {b.car ? (
                                                    <span className="font-semibold text-green-600 dark:text-green-400">{b.car.name} ({b.car.plate_number})</span>
                                                ) : (
                                                    <span className="text-red-500 font-bold italic">⚠️ Belum Dialokasi</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="font-semibold text-foreground">Tanggal & Jam:</span> {b.booking_date} {b.pickup_time ? `(${b.pickup_time.substring(0, 5)})` : ''} {b.return_date ? `s/d ${b.return_date}` : ''}
                                            </div>
                                            <div>
                                                <span className="font-semibold text-foreground">Marketing:</span> {b.user?.name ?? 'Admin / System'}
                                            </div>
                                            <div>
                                                <span className="font-semibold text-foreground">Staf:</span> Supir: {b.driver?.name ?? '-'}, Peluncur: {b.peluncur?.name ?? '-'}, Cuci: {b.petugas_cuci?.name ?? '-'}
                                            </div>
                                        </div>
                                        {!b.car_id && (
                                            <div className="flex justify-end pt-2 border-t mt-1">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleStartAllocation(b)}
                                                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold"
                                                >
                                                    <Settings className="h-3.5 w-3.5" /> Alokasi Mobil & Staf
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">Pelanggan & Booking</th>
                                        <th className="px-4 py-3">Tipe Mobil Dipesan</th>
                                        <th className="px-4 py-3">Armada Mobil Alokasi</th>
                                        <th className="px-4 py-3">Tanggal & Jam Sewa</th>
                                        <th className="px-4 py-3">Penugasan Staf</th>
                                        <th className="px-4 py-3">Marketing</th>
                                        <th className="px-4 py-3">Harga Sewa</th>
                                        <th className="px-4 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredBookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                                {searchQuery ? 'Tidak ada data alokasi yang cocok.' : 'Belum ada data booking.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBookings.map((b) => (
                                            <tr key={b.id} className="hover:bg-muted/50">
                                                <td className="px-4 py-4">
                                                    <div className="font-semibold text-foreground">{b.customer?.name}</div>
                                                    {b.booking_number && (
                                                        <div className="text-[11px] font-mono text-muted-foreground">{b.booking_number}</div>
                                                    )}
                                                    <Badge variant="outline" className="mt-1 text-[10px] bg-primary/5 font-medium">
                                                        {b.rental_type ?? 'Lepas Kunci'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 font-medium">{b.car_type}</td>
                                                <td className="px-4 py-4">
                                                    {b.car ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-green-600 dark:text-green-400">{b.car.name}</span>
                                                            <span className="font-mono text-xs text-muted-foreground">{b.car.plate_number}</span>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="border-red-500 text-red-600 bg-red-500/10 font-bold animate-pulse">
                                                            ⚠️ Belum Dialokasi
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-xs">
                                                    <div className="whitespace-nowrap">Start: {b.booking_date} {b.pickup_time ? `(${b.pickup_time.substring(0, 5)})` : ''}</div>
                                                    {b.return_date && <div className="whitespace-nowrap text-muted-foreground">End: {b.return_date} {b.return_time ? `(${b.return_time.substring(0, 5)})` : ''}</div>}
                                                </td>
                                                <td className="px-4 py-4 text-xs space-y-0.5">
                                                    {b.rental_type === 'With Driver' && (
                                                        <div>
                                                            <span className="font-medium text-muted-foreground">Supir:</span>{' '}
                                                            {b.driver ? <span className="font-semibold">{b.driver.name}</span> : <span className="text-red-500 font-bold italic">Belum Dialokasi</span>}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="font-medium text-muted-foreground">Peluncur:</span>{' '}
                                                        {b.peluncur ? b.peluncur.name : <span className="text-muted-foreground italic">Belum ada</span>}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-muted-foreground">Petugas Cuci:</span>{' '}
                                                        {b.petugas_cuci ? b.petugas_cuci.name : <span className="text-muted-foreground italic">Belum ada</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-xs">
                                                    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                                                        {b.user ? b.user.name : <span className="text-muted-foreground italic">Admin / System</span>}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-xs">{formatCurrency(b.amount)}</td>
                                                <td className="px-4 py-4 text-right">
                                                    {!b.car_id && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleStartAllocation(b)}
                                                            className="font-semibold text-xs flex items-center gap-1.5 ml-auto"
                                                        >
                                                            <Settings className="h-3.5 w-3.5" /> Alokasi
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination data={bookings} />
                    </CardContent>
                </Card>

                {/* BLACKLIST CHECKING POPUP MODAL */}
                <Dialog open={isCheckModalOpen} onOpenChange={setIsCheckModalOpen}>
                    <DialogContent className={`max-w-lg transition-all duration-300 ${checkStage === 'blacklisted' ? 'border-2 border-red-500 bg-red-50/95 dark:bg-red-950/90 text-red-950 dark:text-red-100 shadow-2xl' : ''}`}>
                        {checkStage === 'checking' && (
                            <div className="py-8 px-2 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="relative">
                                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                                        <ShieldCheck className="h-8 w-8 text-primary animate-bounce" />
                                    </div>
                                    <Loader2 className="h-20 w-20 text-primary absolute -top-2 -left-2 animate-spin opacity-40" />
                                </div>
                                <div className="space-y-1.5">
                                    <DialogTitle className="text-lg font-bold">Memeriksa Data Blacklist...</DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        Mengecek rekam jejak konsumen <span className="font-semibold text-foreground">{checkingBooking?.customer?.name}</span> di database blacklist rental mobil.
                                    </DialogDescription>
                                </div>
                                <div className="text-[11px] font-mono bg-muted/60 px-3 py-1.5 rounded-md border text-muted-foreground">
                                    No. Booking: {checkingBooking?.booking_number ?? '-'} • NIK: {checkingBooking?.customer?.nik ?? '-'}
                                </div>
                            </div>
                        )}

                        {checkStage === 'blacklisted' && (
                            <div className="space-y-4 py-1">
                                <DialogHeader className="text-left space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/40 animate-pulse">
                                            <ShieldAlert className="h-7 w-7 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                                                PERINGATAN: KONSUMEN MASUK BLACKLIST!
                                            </DialogTitle>
                                            <DialogDescription className="text-xs text-red-700/80 dark:text-red-300/80 font-medium">
                                                Konsumen ini terdeteksi memiliki rekam jejak bermasalah pada rental mobil.
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>

                                {/* Blacklist Information Box */}
                                <div className="rounded-xl border-2 border-red-500/40 bg-background/90 dark:bg-background/80 p-4 text-xs space-y-2.5 shadow-xs">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <span className="text-muted-foreground font-medium">Nama Konsumen (Booking):</span>
                                        <span className="font-bold text-sm text-foreground">{checkingBooking?.customer?.name}</span>
                                    </div>

                                    <div className="flex items-center justify-between border-b pb-2">
                                        <span className="text-muted-foreground font-medium">Nama di Database Blacklist:</span>
                                        <span className="font-bold text-red-600 dark:text-red-400">{matchedBlacklist?.name}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 border-b pb-2 text-[11px]">
                                        <div>
                                            <span className="text-muted-foreground block">No. HP / Kontak:</span>
                                            <span className="font-mono font-semibold text-foreground">{matchedBlacklist?.phone || checkingBooking?.customer?.phone || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">No. NIK KTP:</span>
                                            <span className="font-mono font-semibold text-foreground">{matchedBlacklist?.nik || checkingBooking?.customer?.nik || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 border-b pb-2 text-[11px]">
                                        <div>
                                            <span className="text-muted-foreground block">Sumber / Pelapor:</span>
                                            <span className="font-semibold text-foreground">{matchedBlacklist?.blacklisted_by || 'Asosiasi Rental'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Tanggal Kejadian:</span>
                                            <span className="font-semibold text-foreground">{matchedBlacklist?.incident_date || matchedBlacklist?.report_date || '-'}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-muted-foreground block font-medium mb-1">Kronologi / Catatan Pelanggaran:</span>
                                        <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-semibold leading-relaxed">
                                            {matchedBlacklist?.perpetrator_info || 'Pelanggaran sewa / unit bermasalah / tunggakan'}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-[11px] text-red-700/90 dark:text-red-300/90 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                                    ⚠️ Harap berhati-hati sebelum menyerahkan unit armada. Anda dapat merevisi booking atau tetap melanjutkan alokasi jika sudah ada konfirmasi/jaminan khusus.
                                </div>

                                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleReviseBooking}
                                        className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800 dark:text-red-300 flex items-center justify-center gap-1.5"
                                    >
                                        <ExternalLink className="h-4 w-4" /> Revisi Booking
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleProceedFromCheck}
                                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-1.5"
                                    >
                                        Lanjut Alokasi <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}

                        {checkStage === 'clean' && (
                            <div className="space-y-4 py-1">
                                <DialogHeader className="text-left space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 border border-green-500/40">
                                            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-lg font-bold text-green-600 dark:text-green-400">
                                                Konsumen Aman (Tidak Blacklist)
                                            </DialogTitle>
                                            <DialogDescription className="text-xs text-muted-foreground">
                                                Pemeriksaan selesai. Data konsumen bersih dari catatan blacklist rental.
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3.5 text-xs space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Nama Konsumen:</span>
                                        <span className="font-semibold text-foreground">{checkingBooking?.customer?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tipe Mobil Dipesan:</span>
                                        <span className="font-semibold text-foreground">{checkingBooking?.car_type} ({checkingBooking?.rental_type ?? 'Lepas Kunci'})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Status Pengecekan:</span>
                                        <Badge variant="outline" className="text-[10px] bg-green-500/15 text-green-600 border-green-500/30 font-bold">
                                            ✓ CLEAR / AMAN
                                        </Badge>
                                    </div>
                                </div>

                                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setIsCheckModalOpen(false)}>
                                        Batal
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleProceedFromCheck}
                                        className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-1.5"
                                    >
                                        Lanjut Alokasi <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* ALLOCATION DIALOG MODAL */}
                <Dialog open={isAllocateOpen} onOpenChange={setIsAllocateOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-primary" />
                                Alokasi Armada Mobil & Staf
                            </DialogTitle>
                        </DialogHeader>
                        {selectedBooking && (
                            <form onSubmit={handleAssignSubmit} className="space-y-4 py-2">
                                <div className="rounded-lg bg-muted p-3 text-xs space-y-1 border">
                                    <div><span className="font-semibold">Marketing / Dibuat Oleh:</span> {selectedBooking.user?.name ?? 'Admin / System'}</div>
                                    <div><span className="font-semibold">Pelanggan:</span> {selectedBooking.customer?.name}</div>
                                    <div><span className="font-semibold">Tipe Mobil Dipesan:</span> {selectedBooking.car_type}</div>
                                    <div><span className="font-semibold">Type Sewa:</span> <Badge variant="outline" className="text-[10px] ml-1">{selectedBooking.rental_type ?? 'Lepas Kunci'}</Badge></div>
                                    <div><span className="font-semibold">Tanggal Sewa:</span> {selectedBooking.booking_date} {selectedBooking.return_date ? `s/d ${selectedBooking.return_date}` : ''}</div>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="car_id" className="font-semibold text-foreground">Alokasi Armada Mobil (Ready)</Label>
                                    <SearchableSelect
                                        options={[
                                            ...(selectedBooking?.car
                                                ? [{
                                                    value: selectedBooking.car_id!.toString(),
                                                    label: `${selectedBooking.car.name} (${selectedBooking.car.plate_number}) - [Saat Ini]`,
                                                }]
                                                : []),
                                            ...readyCars
                                                .filter(c => c.id !== selectedBooking?.car_id)
                                                .map(c => ({
                                                    value: c.id.toString(),
                                                    label: `${c.name} (${c.plate_number})`,
                                                    sublabel: c.daily_price ? `Rp ${Number(c.daily_price).toLocaleString('id-ID')}/hari` : undefined,
                                                })),
                                        ]}
                                        value={assignData.car_id}
                                        onValueChange={(val) => setAssignData('car_id', val)}
                                        placeholder="Pilih kendaraan yang ready..."
                                        searchPlaceholder="Cari mobil / no. polisi..."
                                        emptyText="Mobil ready tidak ditemukan."
                                    />
                                </div>

                                {selectedBooking?.rental_type === 'With Driver' && (
                                    <div className="space-y-1">
                                        <Label htmlFor="driver_id" className="font-semibold text-primary">Alokasi Driver / Supir (Ready)</Label>
                                        <SearchableSelect
                                            options={[
                                                ...(selectedBooking?.driver
                                                    ? [{
                                                        value: selectedBooking.driver_id!.toString(),
                                                        label: `${selectedBooking.driver.name} - [Saat Ini]`,
                                                    }]
                                                    : []),
                                                ...readyDrivers
                                                    .filter(d => d.id !== selectedBooking?.driver_id)
                                                    .map(d => ({
                                                        value: d.id.toString(),
                                                        label: `${d.name} (${d.phone ?? 'No HP N/A'})`,
                                                        sublabel: d.daily_rate ? `Tarif: Rp ${Number(d.daily_rate).toLocaleString('id-ID')}/hari` : undefined,
                                                    })),
                                            ]}
                                            value={assignData.driver_id}
                                            onValueChange={(val) => setAssignData('driver_id', val)}
                                            placeholder="Pilih driver yang ready..."
                                            searchPlaceholder="Cari nama / no. HP supir..."
                                            emptyText="Driver ready tidak ditemukan."
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <Label htmlFor="peluncur_id">Penugasan Petugas Peluncur (Serah Terima)</Label>
                                    <Select
                                        value={assignData.peluncur_id}
                                        onValueChange={(val) => setAssignData('peluncur_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Petugas Peluncur" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {peluncurOfficers.map((p) => (
                                                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="assign_amount">Harga / Tarif Sewa (Rp)</Label>
                                    <Input
                                        id="assign_amount"
                                        type="number"
                                        min={0}
                                        value={assignData.amount}
                                        onChange={(e) => setAssignData('amount', e.target.value)}
                                        placeholder="Masukkan harga/tarif sewa..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="petugas_cuci_id">Penugasan Petugas Cuci (Pasca Kembali)</Label>
                                    <Select
                                        value={assignData.petugas_cuci_id}
                                        onValueChange={(val) => setAssignData('petugas_cuci_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Petugas Cuci" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {washOfficers.map((w) => (
                                                <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <DialogFooter className="pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsAllocateOpen(false)}>Batal</Button>
                                    <Button type="submit" disabled={processingAssign}>Simpan Alokasi</Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

AllocationsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Alokasi Mobil',
            href: allocationsIndex(),
        },
    ],
};
