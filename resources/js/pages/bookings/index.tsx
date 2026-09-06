import { Head, Link, router, useForm, usePage, usePoll } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useState, useEffect, useMemo } from 'react';
import { Plus, User, Key, UserCheck, Calendar, DollarSign, Settings, Car, Edit, Trash2, Search, X, CalendarDays, Filter, Ban, AlertTriangle } from 'lucide-react';
import { index as bookingsIndex } from '@/routes/bookings';

type Customer = {
    id: number;
    name: string;
    phone?: string | null;
};

type CarType = {
    id: number;
    name: string;
    plate_number: string;
    status: string;
    daily_price: string | null;
    weekly_price: string | null;
    monthly_price: string | null;
};

type CarTypeRef = {
    id?: number;
    name: string;
    type?: string | null;
    category?: string | null;
    description?: string | null;
    daily_price?: string | null;
    weekly_price?: string | null;
    monthly_price?: string | null;
};

type DriverType = {
    id: number;
    name: string;
    phone?: string;
    sim?: string;
    status: string;
    daily_rate: number;
};

type UserType = {
    id: number;
    name: string;
    role: string;
};

type Booking = {
    id: number;
    booking_number?: string;
    user_id?: number | null;
    user?: UserType;
    customer_id: number;
    customer?: Customer;
    car_type: string;
    rental_type?: 'Lepas Kunci' | 'With Driver' | string;
    car_id: number | null;
    car?: CarType;
    driver_id?: number | null;
    driver?: DriverType;
    peluncur_id: number | null;
    peluncur?: UserType;
    petugas_cuci_id: number | null;
    petugas_cuci?: UserType;
    booking_date: string;
    return_date: string | null;
    pickup_time?: string | null;
    return_time?: string | null;
    pickup_location?: string | null;
    dropoff_location?: string | null;
    payment_method: 'Cash' | 'Transfer' | 'DP';
    payment_status: 'Pending' | 'Paid' | 'Down Payment';
    amount: number;
    status: 'Pending' | 'Confirmed' | 'On Trip' | 'Returned' | 'Completed' | 'Cancelled';
    cancellation_reason?: string | null;
    cancelled_at?: string | null;
};

import Pagination, { PaginatedData } from '@/components/pagination';

type Props = {
    bookings: PaginatedData<Booking> | Booking[];
    customers: Customer[];
    cars: CarType[];
    readyCars: CarType[];
    readyDrivers?: DriverType[];
    carTypes?: CarTypeRef[];
    peluncurOfficers: UserType[];
    washOfficers: UserType[];
    marketingUsers?: UserType[];
};

const DEFAULT_CAR_TYPES = [
    'Avanza',
    'Innova',
    'Brio',
    'Xpander',
    'Fortuner',
    'Alphard',
    'Calya',
    'Hiace',
    'Ertiga',
    'Yaris',
    'HR-V',
    'CR-V',
    'Pajero Sport',
    'Mini Bus'
];

export default function BookingsIndex({
    bookings,
    customers,
    cars,
    readyCars,
    readyDrivers = [],
    carTypes,
    peluncurOfficers,
    washOfficers,
    marketingUsers = [],
}: Props) {
    const { auth } = usePage().props;
    const user = auth?.user as any;
    const roles: string[] = user?.roles || [];
    const hasRole = (r: string) => roles.includes(r) || roles.includes('Super Admin');

    // Auto-poll bookings data every 10 seconds in the background
    usePoll(10000, {
        only: ['bookings', 'readyCars', 'readyDrivers'],
    });

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
    const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [isCustomCarType, setIsCustomCarType] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [washConfirmId, setWashConfirmId] = useState<number | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    // Date & Status Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateFilterField, setDateFilterField] = useState<'booking_date' | 'return_date' | 'active_period'>('booking_date');
    const [statusFilter, setStatusFilter] = useState<string>('all');

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
        setStatusFilter('all');
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

    const filteredBookings = useMemo(() => {
        const bookingList = Array.isArray(bookings) ? bookings : (bookings?.data || []);
        return bookingList.filter((b) => {
            // 1. Search Query Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const customerName = b.customer?.name?.toLowerCase() || '';
                const bookingNumber = (b as any).booking_number?.toLowerCase() || '';
                const carType = b.car_type?.toLowerCase() || '';
                const carName = b.car?.name?.toLowerCase() || '';
                const plateNumber = b.car?.plate_number?.toLowerCase() || '';
                const pickLoc = b.pickup_location?.toLowerCase() || '';
                const dropLoc = b.dropoff_location?.toLowerCase() || '';
                const matchesSearch =
                    customerName.includes(q) ||
                    bookingNumber.includes(q) ||
                    carType.includes(q) ||
                    carName.includes(q) ||
                    plateNumber.includes(q) ||
                    pickLoc.includes(q) ||
                    dropLoc.includes(q);
                if (!matchesSearch) return false;
            }

            // 2. Status Filter
            if (statusFilter !== 'all' && b.status !== statusFilter) {
                return false;
            }

            // 3. Date Filter
            const bStartDate = b.booking_date ? b.booking_date.substring(0, 10) : '';
            const bReturnDate = b.return_date ? b.return_date.substring(0, 10) : '';

            if (startDate || endDate) {
                if (dateFilterField === 'booking_date') {
                    if (startDate && (!bStartDate || bStartDate < startDate)) return false;
                    if (endDate && (!bStartDate || bStartDate > endDate)) return false;
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
    }, [bookings, searchQuery, startDate, endDate, dateFilterField, statusFilter]);

    const availableCarTypeNames = useMemo(() => {
        if (carTypes && carTypes.length > 0) {
            return Array.from(new Set(carTypes.map((c) => c.name)));
        }
        return DEFAULT_CAR_TYPES;
    }, [carTypes]);

    const customerOptions = customers.map((c) => ({
        value: c.id.toString(),
        label: c.name,
        sublabel: c.phone ? `HP: ${c.phone}` : undefined,
    }));

    const carTypeOptions = useMemo(() => {
        if (carTypes && carTypes.length > 0) {
            return carTypes.map((c) => ({
                value: c.name,
                label: c.name,
                sublabel: c.type || c.category ? `${c.type ?? ''}${c.type && c.category ? ' • ' : ''}${c.category ?? ''}` : undefined,
            }));
        }
        return DEFAULT_CAR_TYPES.map((name) => ({
            value: name,
            label: name,
        }));
    }, [carTypes]);

    const { data: createData, setData: setCreateData, post: postCreate, reset: resetCreate, processing: processingCreate, errors: errorsCreate } = useForm({
        user_id: '',
        customer_id: '',
        new_customer_name: '',
        new_customer_nik: '',
        new_customer_phone: '',
        new_customer_email: '',
        new_customer_emergency_contact: '',
        new_customer_address: '',
        new_customer_sim_number: '',
        new_customer_sim_expiry: '',
        new_customer_ktp_photo: null as File | null,
        new_customer_sim_photo: null as File | null,
        new_customer_selfie_photo: null as File | null,
        car_type: '',
        rental_type: 'Lepas Kunci' as 'Lepas Kunci' | 'With Driver',
        booking_date: '',
        return_date: '',
        pickup_time: '',
        return_time: '',
        pickup_location: '',
        dropoff_location: '',
        payment_method: 'Cash',
        payment_status: 'Pending',
        amount: '0',
    });

    const { data: editData, setData: setEditData, put: putEdit, processing: processingEdit, errors: errorsEdit } = useForm({
        user_id: '',
        customer_id: '',
        car_type: '',
        rental_type: 'Lepas Kunci' as 'Lepas Kunci' | 'With Driver',
        booking_date: '',
        return_date: '',
        pickup_time: '',
        return_time: '',
        pickup_location: '',
        dropoff_location: '',
        payment_method: 'Cash',
        payment_status: 'Pending',
        amount: '0',
        status: 'Pending',
        cancellation_reason: '',
    });

    const { data: assignData, setData: setAssignData, put: putAssign, processing: processingAssign } = useForm({
        car_id: '',
        driver_id: '',
        peluncur_id: '',
        petugas_cuci_id: '',
        amount: '',
    });

    const openCreateDialog = () => {
        resetCreate();
        setIsNewCustomer(false);
        setIsCustomCarType(false);
        setCreateData((prev) => ({
            ...prev,
            user_id: user?.id ? user.id.toString() : '',
            customer_id: customers.length > 0 ? customers[0].id.toString() : '',
        }));
        setIsCreateOpen(true);
    };

    const openEditDialog = (booking: Booking) => {
        setSelectedBooking(booking);
        setEditData({
            user_id: booking.user_id ? booking.user_id.toString() : (user?.id ? user.id.toString() : ''),
            customer_id: booking.customer_id ? booking.customer_id.toString() : '',
            car_type: booking.car_type || '',
            rental_type: (booking.rental_type as any) || 'Lepas Kunci',
            booking_date: booking.booking_date || '',
            return_date: booking.return_date || '',
            pickup_time: booking.pickup_time ? booking.pickup_time.substring(0, 5) : '',
            return_time: booking.return_time ? booking.return_time.substring(0, 5) : '',
            pickup_location: booking.pickup_location || '',
            dropoff_location: booking.dropoff_location || '',
            payment_method: booking.payment_method || 'Cash',
            payment_status: booking.payment_status || 'Pending',
            amount: booking.amount ? booking.amount.toString() : '0',
            status: booking.status || 'Pending',
            cancellation_reason: booking.cancellation_reason || '',
        });
        setIsEditOpen(true);
    };

    const openAssignDialog = (booking: Booking) => {
        setSelectedBooking(booking);
        setAssignData({
            car_id: booking.car_id ? booking.car_id.toString() : '',
            driver_id: booking.driver_id ? booking.driver_id.toString() : '',
            peluncur_id: booking.peluncur_id ? booking.peluncur_id.toString() : '',
            petugas_cuci_id: booking.petugas_cuci_id ? booking.petugas_cuci_id.toString() : '',
            amount: booking.amount ? booking.amount.toString() : '',
        });
        setIsAssignOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedBooking) {
            putEdit(`/bookings/${selectedBooking.id}`, {
                onSuccess: () => {
                    setIsEditOpen(false);
                },
            });
        }
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postCreate('/bookings', {
            onSuccess: () => {
                setIsCreateOpen(false);
                resetCreate();
            },
        });
    };

    const handleAssignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedBooking) {
            putAssign(`/bookings/${selectedBooking.id}`, {
                onSuccess: () => {
                    setIsAssignOpen(false);
                },
            });
        }
    };

    const handleCompleteWash = (bookingId: number) => {
        setWashConfirmId(bookingId);
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
            case 'Cancelled':
                return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25';
            default:
                return 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/25';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'Pending':
                return 'bg-red-500/15 text-red-600 border-red-500/25';
            case 'Paid':
                return 'bg-green-500/15 text-green-600 border-green-500/25';
            case 'Down Payment':
                return 'bg-blue-500/15 text-blue-600 border-blue-500/25';
            default:
                return '';
        }
    };

    return (
        <>
            <Head title="Data Booking" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">Data Booking Mobil</h1>
                        <p className="text-muted-foreground">Kelola pesanan sewa mobil, alokasi armada, dan penugasan staf.</p>
                    </div>
                    {(hasRole('Marketing') || hasRole('Admin')) && (
                        <Button onClick={openCreateDialog} className="flex items-center gap-1">
                            <Plus className="h-4 w-4" /> Tambah Booking
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle>Daftar Booking Mobil</CardTitle>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Cari customer / no. booking..."
                                className="pl-9 h-9 text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filter Bar */}
                        <div className="mb-5 p-3.5 rounded-lg border bg-muted/30 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Filter Berdasarkan Tanggal</span>
                                    {(startDate || endDate || statusFilter !== 'all') && (
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
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
                                    <Input
                                        id="filter_end_date"
                                        type="date"
                                        className="h-8 text-xs bg-background"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="filter_status" className="text-[11px] text-muted-foreground font-medium">Status Booking</Label>
                                    <div className="flex items-center gap-1.5">
                                        <Select
                                            value={statusFilter}
                                            onValueChange={(val: any) => setStatusFilter(val)}
                                        >
                                            <SelectTrigger id="filter_status" className="h-8 text-xs bg-background">
                                                <SelectValue placeholder="Semua Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Status</SelectItem>
                                                <SelectItem value="Pending">Pending</SelectItem>
                                                <SelectItem value="Confirmed">Confirmed</SelectItem>
                                                <SelectItem value="On Trip">On Trip</SelectItem>
                                                <SelectItem value="Returned">Returned</SelectItem>
                                                <SelectItem value="Completed">Completed</SelectItem>
                                                <SelectItem value="Cancelled">Cancelled (Dibatalkan)</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {(startDate || endDate || statusFilter !== 'all' || searchQuery) && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                title="Reset Semua Filter"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
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
                                    {searchQuery || startDate || endDate || statusFilter !== 'all'
                                        ? 'Tidak ada booking yang cocok dengan filter atau pencarian.'
                                        : 'Belum ada data booking.'}
                                </div>
                            ) : (
                                filteredBookings.map((booking) => (
                                    <div key={booking.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card text-card-foreground shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-semibold text-sm">{booking.customer?.name}</span>
                                                {booking.booking_number && (
                                                    <div className="text-[11px] font-mono text-muted-foreground">{booking.booking_number}</div>
                                                )}
                                            </div>
                                            <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                {booking.status}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div>
                                                <span className="font-semibold text-foreground">Tipe Mobil:</span> {booking.car_type}{' '}
                                                <Badge variant="outline" className="ml-1 text-[10px] bg-primary/5 font-medium">
                                                    {booking.rental_type ?? 'Lepas Kunci'}
                                                </Badge>
                                            </div>
                                            <div><span className="font-semibold text-foreground">Armada Alokasi:</span> {booking.car ? `${booking.car.name} (${booking.car.plate_number})` : <span className="italic text-muted-foreground text-xs">Belum Dialokasi</span>}</div>
                                            <div>
                                                <span className="font-semibold text-foreground">Tanggal & Jam:</span> Start: {booking.booking_date} {booking.pickup_time ? `(${booking.pickup_time.substring(0, 5)})` : ''} {booking.return_date ? `| End: ${booking.return_date} ${booking.return_time ? `(${booking.return_time.substring(0, 5)})` : ''}` : ''}
                                            </div>
                                            {(booking.pickup_location || booking.dropoff_location) && (
                                                <div className="text-[11px] text-muted-foreground">
                                                    <span className="font-semibold text-foreground">Lokasi:</span> {booking.pickup_location ? `Jemput: ${booking.pickup_location}` : ''} {booking.dropoff_location ? `| Antar: ${booking.dropoff_location}` : ''}
                                                </div>
                                            )}
                                            <div><span className="font-semibold text-foreground">Pembayaran:</span> {formatCurrency(booking.amount)} ({booking.payment_status} via {booking.payment_method})</div>
                                            <div>
                                                <span className="font-semibold text-foreground">Penugasan Staf:</span> Peluncur: {booking.peluncur?.name ?? 'Belum ada'}, Wash: {booking.petugas_cuci?.name ?? 'Belum ada'}
                                                {booking.rental_type === 'With Driver' && (
                                                    <span>, Supir: {booking.driver?.name ?? <span className="text-red-500 font-semibold italic">Belum Dialokasi</span>}</span>
                                                )}
                                            </div>
                                            {(hasRole('Admin') || hasRole('Super Admin')) && (
                                                <div><span className="font-semibold text-foreground">Dibuat Oleh:</span> <span className="font-medium text-foreground">{booking.user?.name ?? 'Admin / System'}</span></div>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2 border-t mt-1">
                                            {booking.status !== 'Cancelled' && booking.status !== 'Completed' && booking.status !== 'Returned' && (hasRole('Marketing') || hasRole('Admin') || hasRole('Super Admin')) && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="flex items-center gap-1 h-8 text-xs font-semibold px-2.5 shadow-xs"
                                                    onClick={() => {
                                                        setCancelBooking(booking);
                                                        setCancelReason('');
                                                    }}
                                                >
                                                    <Ban className="h-3.5 w-3.5" /> Cancel
                                                </Button>
                                            )}
                                            {(hasRole('Admin') || hasRole('Super Admin')) && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex items-center gap-1 h-8 text-xs"
                                                        onClick={() => openAssignDialog(booking)}
                                                    >
                                                        <Settings className="h-3 w-3" /> Alokasi
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => openEditDialog(booking)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-600"
                                                        onClick={() => setDeleteBookingId(booking.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}

                                            {(hasRole('Petugas Cuci') || hasRole('Admin')) && booking.status === 'Returned' && (
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                                                    onClick={() => handleCompleteWash(booking.id)}
                                                >
                                                    Cuci Selesai
                                                </Button>
                                            )}
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
                                        <th className="px-4 py-3">Armada Alokasi</th>
                                        <th className="px-4 py-3">Tanggal & Jam</th>
                                        <th className="px-4 py-3">Pembayaran</th>
                                        <th className="px-4 py-3">Penugasan Staf</th>
                                        {(hasRole('Admin') || hasRole('Super Admin')) && (
                                            <th className="px-4 py-3">Dibuat Oleh</th>
                                        )}
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredBookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={(hasRole('Admin') || hasRole('Super Admin')) ? 9 : 8} className="px-4 py-8 text-center text-muted-foreground">
                                                {searchQuery || startDate || endDate || statusFilter !== 'all'
                                                    ? 'Tidak ada booking yang cocok dengan filter atau pencarian.'
                                                    : 'Belum ada data booking.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-muted/50">
                                                <td className="px-4 py-4">
                                                    <div className="font-semibold">{booking.customer?.name}</div>
                                                    {booking.booking_number && (
                                                        <div className="text-[11px] font-mono text-muted-foreground">{booking.booking_number}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-medium">{booking.car_type}</div>
                                                    <Badge variant="outline" className="mt-1 text-[10px] bg-primary/5 font-medium">
                                                        {booking.rental_type ?? 'Lepas Kunci'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 font-mono font-medium">
                                                    {booking.car ? `${booking.car.name} (${booking.car.plate_number})` : <span className="text-muted-foreground text-xs italic">Belum Dialokasi</span>}
                                                </td>
                                                <td className="px-4 py-4 text-xs">
                                                    <div className="whitespace-nowrap">Start: {booking.booking_date} {booking.pickup_time ? `(${booking.pickup_time.substring(0, 5)})` : ''}</div>
                                                    {booking.return_date && <div className="whitespace-nowrap">End: {booking.return_date} {booking.return_time ? `(${booking.return_time.substring(0, 5)})` : ''}</div>}
                                                    {(booking.pickup_location || booking.dropoff_location) && (
                                                        <div className="mt-1 text-[11px] text-muted-foreground space-y-0.5 max-w-[180px] truncate">
                                                            {booking.pickup_location && <div title={`Jemput: ${booking.pickup_location}`} className="truncate">Jemput: {booking.pickup_location}</div>}
                                                            {booking.dropoff_location && <div title={`Antar: ${booking.dropoff_location}`} className="truncate">Antar: {booking.dropoff_location}</div>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-medium text-xs">{formatCurrency(booking.amount)}</div>
                                                    <Badge variant="outline" className={`mt-1 text-[10px] ${getPaymentStatusColor(booking.payment_status)}`}>
                                                        {booking.payment_status} ({booking.payment_method})
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 text-xs">
                                                    {booking.rental_type === 'With Driver' && (
                                                        <div className="mb-1 font-medium">
                                                            Supir: {booking.driver ? <span className="font-semibold text-foreground">{booking.driver.name}</span> : <span className="text-red-500 italic font-semibold">Belum Dialokasi</span>}
                                                        </div>
                                                    )}
                                                    <div>Peluncur: {booking.peluncur ? booking.peluncur.name : <span className="text-muted-foreground italic">Belum ada</span>}</div>
                                                    <div className="mt-1">Wash: {booking.petugas_cuci ? booking.petugas_cuci.name : <span className="text-muted-foreground italic">Belum ada</span>}</div>
                                                </td>
                                                {(hasRole('Admin') || hasRole('Super Admin')) && (
                                                    <td className="px-4 py-4 text-xs">
                                                        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                                                            {booking.user ? booking.user.name : <span className="text-muted-foreground italic">Admin / System</span>}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                            {booking.status}
                                                        </Badge>
                                                        {booking.status === 'Cancelled' && booking.cancellation_reason && (
                                                            <span className="text-[11px] text-muted-foreground line-clamp-2 max-w-[160px]" title={`Alasan: ${booking.cancellation_reason}`}>
                                                                Alasan: {booking.cancellation_reason}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {booking.status !== 'Cancelled' && booking.status !== 'Completed' && booking.status !== 'Returned' && (hasRole('Marketing') || hasRole('Admin') || hasRole('Super Admin')) && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="h-8 text-xs font-semibold flex items-center gap-1.5 px-3 shadow-xs"
                                                                title="Batalkan Booking"
                                                                onClick={() => {
                                                                    setCancelBooking(booking);
                                                                    setCancelReason('');
                                                                }}
                                                            >
                                                                <Ban className="h-3.5 w-3.5" /> Cancel
                                                            </Button>
                                                        )}

                                                        {(hasRole('Admin') || hasRole('Super Admin')) && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    title="Edit Booking"
                                                                    onClick={() => openEditDialog(booking)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-500 hover:text-red-600"
                                                                    title="Hapus Booking"
                                                                    onClick={() => setDeleteBookingId(booking.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}

                                                        {(hasRole('Petugas Cuci') || hasRole('Admin')) && booking.status === 'Returned' && (
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                                onClick={() => handleCompleteWash(booking.id)}
                                                            >
                                                                Wash Complete
                                                            </Button>
                                                        )}
                                                    </div>
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

                {/* CREATE BOOKING DIALOG */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className={isNewCustomer ? "max-w-xl max-h-[90vh] overflow-y-auto" : "max-w-md"}>
                        <DialogHeader>
                            <h2 className="text-lg font-semibold">Tambah Booking Sewa</h2>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                            {hasRole('Admin') && (
                                <div className="space-y-1">
                                    <Label htmlFor="create_user_id" className="text-xs font-semibold">Nama Marketing / Dibuat Oleh</Label>
                                    <Select
                                        value={createData.user_id || (user?.id ? user.id.toString() : '')}
                                        onValueChange={(val) => setCreateData('user_id', val)}
                                    >
                                        <SelectTrigger id="create_user_id" className="h-9">
                                            <SelectValue placeholder="Pilih Marketing..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {marketingUsers.map((m) => (
                                                <SelectItem key={m.id} value={m.id.toString()}>
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="customer_id">{isNewCustomer ? 'Customer Baru' : 'Pilih Customer'}</Label>
                                    <button
                                        type="button"
                                        className="text-xs text-primary hover:underline font-medium focus:outline-none"
                                        onClick={() => {
                                            const nextState = !isNewCustomer;
                                            setIsNewCustomer(nextState);
                                            if (nextState) {
                                                setCreateData('customer_id', '');
                                            } else {
                                                setCreateData('new_customer_name', '');
                                                setCreateData('new_customer_nik', '');
                                                setCreateData('new_customer_phone', '');
                                                setCreateData('new_customer_email', '');
                                                setCreateData('new_customer_emergency_contact', '');
                                                setCreateData('new_customer_address', '');
                                                setCreateData('new_customer_sim_number', '');
                                                setCreateData('new_customer_sim_expiry', '');
                                                setCreateData('new_customer_ktp_photo', null);
                                                setCreateData('new_customer_sim_photo', null);
                                                setCreateData('new_customer_selfie_photo', null);
                                                if (customers.length > 0) {
                                                    setCreateData('customer_id', customers[0].id.toString());
                                                }
                                            }
                                        }}
                                    >
                                        {isNewCustomer ? '← Pilih Customer Terdaftar' : '+ Tambah Customer Baru'}
                                    </button>
                                </div>

                                {!isNewCustomer ? (
                                    <SearchableSelect
                                        options={customerOptions}
                                        value={createData.customer_id}
                                        onValueChange={(val) => setCreateData('customer_id', val)}
                                        placeholder="Pilih customer terdaftar..."
                                        searchPlaceholder="Cari nama / HP customer..."
                                        emptyText="Customer tidak ditemukan."
                                    />
                                ) : (
                                    <div className="p-3.5 border rounded-lg bg-muted/20 space-y-4">
                                        {/* Data Pribadi */}
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                                Data Pribadi
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_name" className="text-xs">Nama Lengkap *</Label>
                                                    <Input
                                                        id="new_customer_name"
                                                        type="text"
                                                        placeholder="Masukkan nama lengkap..."
                                                        value={createData.new_customer_name}
                                                        onChange={(e) => setCreateData('new_customer_name', e.target.value)}
                                                        required={isNewCustomer}
                                                    />
                                                    {errorsCreate.new_customer_name && <p className="text-[11px] text-red-500">{errorsCreate.new_customer_name}</p>}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_nik" className="text-xs">NIK (KTP)</Label>
                                                    <Input
                                                        id="new_customer_nik"
                                                        type="text"
                                                        placeholder="Masukkan 16 digit NIK..."
                                                        value={createData.new_customer_nik}
                                                        onChange={(e) => setCreateData('new_customer_nik', e.target.value)}
                                                    />
                                                    {errorsCreate.new_customer_nik && <p className="text-[11px] text-red-500">{errorsCreate.new_customer_nik}</p>}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_phone" className="text-xs">No. HP</Label>
                                                    <Input
                                                        id="new_customer_phone"
                                                        type="text"
                                                        placeholder="081234567890..."
                                                        value={createData.new_customer_phone}
                                                        onChange={(e) => setCreateData('new_customer_phone', e.target.value)}
                                                    />
                                                    {errorsCreate.new_customer_phone && <p className="text-[11px] text-red-500">{errorsCreate.new_customer_phone}</p>}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_email" className="text-xs">Email</Label>
                                                    <Input
                                                        id="new_customer_email"
                                                        type="email"
                                                        placeholder="email@example.com..."
                                                        value={createData.new_customer_email}
                                                        onChange={(e) => setCreateData('new_customer_email', e.target.value)}
                                                    />
                                                    {errorsCreate.new_customer_email && <p className="text-[11px] text-red-500">{errorsCreate.new_customer_email}</p>}
                                                </div>

                                                <div className="space-y-1 md:col-span-2">
                                                    <Label htmlFor="new_customer_emergency_contact" className="text-xs">Kontak Darurat (Opsional)</Label>
                                                    <Input
                                                        id="new_customer_emergency_contact"
                                                        type="text"
                                                        placeholder="Nama & No HP kontak darurat..."
                                                        value={createData.new_customer_emergency_contact}
                                                        onChange={(e) => setCreateData('new_customer_emergency_contact', e.target.value)}
                                                    />
                                                </div>

                                                <div className="space-y-1 md:col-span-2">
                                                    <Label htmlFor="new_customer_address" className="text-xs">Alamat Lengkap</Label>
                                                    <Input
                                                        id="new_customer_address"
                                                        type="text"
                                                        placeholder="Alamat lengkap domisili..."
                                                        value={createData.new_customer_address}
                                                        onChange={(e) => setCreateData('new_customer_address', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Data SIM */}
                                        <div className="pt-2 border-t">
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                                Data SIM
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_sim_number" className="text-xs">No. SIM</Label>
                                                    <Input
                                                        id="new_customer_sim_number"
                                                        type="text"
                                                        placeholder="Nomor SIM A..."
                                                        value={createData.new_customer_sim_number}
                                                        onChange={(e) => setCreateData('new_customer_sim_number', e.target.value)}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_sim_expiry" className="text-xs">Masa Berlaku SIM</Label>
                                                    <Input
                                                        id="new_customer_sim_expiry"
                                                        type="date"
                                                        value={createData.new_customer_sim_expiry}
                                                        onChange={(e) => setCreateData('new_customer_sim_expiry', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Upload Dokumen */}
                                        <div className="pt-2 border-t">
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                                Upload Dokumen Identitas
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_ktp_photo" className="text-xs">Foto KTP</Label>
                                                    <Input
                                                        id="new_customer_ktp_photo"
                                                        type="file"
                                                        accept="image/*"
                                                        className="text-xs h-9 cursor-pointer"
                                                        onChange={(e) => setCreateData('new_customer_ktp_photo', e.target.files ? e.target.files[0] : null)}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_sim_photo" className="text-xs">Foto SIM</Label>
                                                    <Input
                                                        id="new_customer_sim_photo"
                                                        type="file"
                                                        accept="image/*"
                                                        className="text-xs h-9 cursor-pointer"
                                                        onChange={(e) => setCreateData('new_customer_sim_photo', e.target.files ? e.target.files[0] : null)}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_selfie_photo" className="text-xs">Foto Selfie (Opsional)</Label>
                                                    <Input
                                                        id="new_customer_selfie_photo"
                                                        type="file"
                                                        accept="image/*"
                                                        className="text-xs h-9 cursor-pointer"
                                                        onChange={(e) => setCreateData('new_customer_selfie_photo', e.target.files ? e.target.files[0] : null)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {errorsCreate.customer_id && <p className="text-xs text-red-500">{errorsCreate.customer_id}</p>}
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="car_type">Tipe Mobil yang Dipesan</Label>
                                    {hasRole('Admin') && (
                                        <button
                                            type="button"
                                            className="text-xs text-primary hover:underline font-medium focus:outline-none"
                                            onClick={() => {
                                                const nextState = !isCustomCarType;
                                                setIsCustomCarType(nextState);
                                                if (nextState) {
                                                    setCreateData('car_type', '');
                                                } else if (availableCarTypeNames.length > 0) {
                                                    setCreateData('car_type', availableCarTypeNames[0]);
                                                }
                                            }}
                                        >
                                            {isCustomCarType ? '← Pilih Dari Daftar Type' : '+ Ketik Manual'}
                                        </button>
                                    )}
                                </div>

                                {!isCustomCarType ? (
                                    <SearchableSelect
                                        id="car_type"
                                        options={carTypeOptions}
                                        value={createData.car_type}
                                        onValueChange={(val) => setCreateData('car_type', val)}
                                        placeholder="Pilih type kendaraan..."
                                        searchPlaceholder="Cari type kendaraan (Avanza, Innova, etc)..."
                                        emptyText="Type kendaraan tidak ditemukan."
                                    />
                                ) : (
                                    <Input
                                        id="car_type"
                                        type="text"
                                        placeholder="Contoh: Avanza, Innova, Hiace..."
                                        value={createData.car_type}
                                        onChange={(e) => setCreateData('car_type', e.target.value)}
                                        required
                                    />
                                )}
                                {errorsCreate.car_type && <p className="text-xs text-red-500">{errorsCreate.car_type}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="booking_date" className="text-xs">Tanggal Sewa</Label>
                                    <Input
                                        id="booking_date"
                                        type="date"
                                        value={createData.booking_date}
                                        onChange={(e) => setCreateData('booking_date', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="pickup_time" className="text-xs">Jam Pengambilan</Label>
                                    <Input
                                        id="pickup_time"
                                        type="time"
                                        value={createData.pickup_time}
                                        onChange={(e) => setCreateData('pickup_time', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="return_date" className="text-xs">Tanggal Balik</Label>
                                    <Input
                                        id="return_date"
                                        type="date"
                                        value={createData.return_date}
                                        onChange={(e) => setCreateData('return_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="return_time" className="text-xs">Jam Pengembalian</Label>
                                    <Input
                                        id="return_time"
                                        type="time"
                                        value={createData.return_time}
                                        onChange={(e) => setCreateData('return_time', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="pickup_location" className="text-xs">Tempat Pengambilan</Label>
                                    <Input
                                        id="pickup_location"
                                        type="text"
                                        placeholder="Contoh: Bandara, Garasi, Alamat Customer..."
                                        value={createData.pickup_location}
                                        onChange={(e) => setCreateData('pickup_location', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="dropoff_location" className="text-xs">Tempat Pengantaran / Pengembalian</Label>
                                    <Input
                                        id="dropoff_location"
                                        type="text"
                                        placeholder="Contoh: Bandara, Garasi, Alamat Customer..."
                                        value={createData.dropoff_location}
                                        onChange={(e) => setCreateData('dropoff_location', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="payment_method">Metode Pembayaran</Label>
                                    <Select
                                        value={createData.payment_method}
                                        onValueChange={(val: any) => setCreateData('payment_method', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Transfer">Transfer</SelectItem>
                                            <SelectItem value="DP">DP (Down Payment)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="rental_type">Type Sewa</Label>
                                    <Select
                                        value={createData.rental_type}
                                        onValueChange={(val: any) => setCreateData('rental_type', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Lepas Kunci">Lepas Kunci</SelectItem>
                                            <SelectItem value="With Driver">With Driver</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processingCreate}>Simpan Booking</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ALLOCATION / ASSIGNMENT DIALOG */}
                <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <h2 className="text-lg font-semibold">Alokasi Staf & Armada</h2>
                        </DialogHeader>
                        {selectedBooking && (
                            <form onSubmit={handleAssignSubmit} className="space-y-4 py-2">
                                <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
                                    <div><span className="font-semibold">Pelanggan:</span> {selectedBooking.customer?.name}</div>
                                    <div><span className="font-semibold">Tipe Mobil yang Dipesan:</span> {selectedBooking.car_type}</div>
                                    <div><span className="font-semibold">Type Sewa:</span> <Badge variant="outline" className="text-[10px] ml-1">{selectedBooking.rental_type ?? 'Lepas Kunci'}</Badge></div>
                                    <div><span className="font-semibold">Tanggal Sewa:</span> {selectedBooking.booking_date}</div>
                                    {selectedBooking.return_date && (
                                        <div><span className="font-semibold">Tanggal Balik:</span> {selectedBooking.return_date}</div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="car_id">Alokasi Armada Mobil</Label>
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
                                        placeholder="Pilih mobil yang ready..."
                                        searchPlaceholder="Cari mobil / no. polisi..."
                                        emptyText="Mobil tidak ditemukan."
                                    />
                                </div>

                                {selectedBooking?.rental_type === 'With Driver' && (
                                    <div className="space-y-1">
                                        <Label htmlFor="driver_id" className="text-xs font-semibold text-primary">Alokasi Supir / Driver (Ready)</Label>
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
                                    <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>Batal</Button>
                                    <Button type="submit" disabled={processingAssign}>Simpan Alokasi</Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={washConfirmId !== null} onOpenChange={(open) => !open && setWashConfirmId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Konfirmasi Selesai Cuci</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                                Apakah Anda yakin ingin menyelesaikan pencucian mobil dan mengubah status mobil menjadi Ready?
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setWashConfirmId(null)}>
                                Batal
                            </Button>
                            <Button
                                onClick={() => {
                                    if (washConfirmId) {
                                        router.post(`/bookings/${washConfirmId}/wash`, {}, {
                                            onSuccess: () => setWashConfirmId(null)
                                        });
                                    }
                                }}
                            >
                                Selesaikan Cuci
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Booking Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit Booking</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
                            {hasRole('Admin') && (
                                <div className="space-y-1">
                                    <Label htmlFor="edit_user_id" className="text-xs font-semibold">Nama Marketing / Dibuat Oleh</Label>
                                    <Select
                                        value={editData.user_id}
                                        onValueChange={(val) => setEditData('user_id', val)}
                                    >
                                        <SelectTrigger id="edit_user_id" className="h-9">
                                            <SelectValue placeholder="Pilih Marketing..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {marketingUsers.map((m) => (
                                                <SelectItem key={m.id} value={m.id.toString()}>
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label htmlFor="edit_customer_id">Pelanggan</Label>
                                <SearchableSelect
                                    id="edit_customer_id"
                                    options={customerOptions}
                                    value={editData.customer_id}
                                    onValueChange={(val) => setEditData('customer_id', val)}
                                    placeholder="Pilih Pelanggan..."
                                    searchPlaceholder="Cari customer..."
                                    emptyText="Customer tidak ditemukan."
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="edit_car_type">Tipe Mobil yang Dipesan</Label>
                                <SearchableSelect
                                    id="edit_car_type"
                                    options={carTypeOptions}
                                    value={editData.car_type}
                                    onValueChange={(val) => setEditData('car_type', val)}
                                    placeholder="Pilih Tipe Mobil..."
                                    searchPlaceholder="Cari type kendaraan..."
                                    emptyText="Type kendaraan tidak ditemukan."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_booking_date" className="text-xs">Tanggal Sewa</Label>
                                    <Input
                                        id="edit_booking_date"
                                        type="date"
                                        value={editData.booking_date}
                                        onChange={(e) => setEditData('booking_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit_pickup_time" className="text-xs">Jam Pengambilan</Label>
                                    <Input
                                        id="edit_pickup_time"
                                        type="time"
                                        value={editData.pickup_time}
                                        onChange={(e) => setEditData('pickup_time', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit_return_date" className="text-xs">Tanggal Balik</Label>
                                    <Input
                                        id="edit_return_date"
                                        type="date"
                                        value={editData.return_date}
                                        onChange={(e) => setEditData('return_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit_return_time" className="text-xs">Jam Pengembalian</Label>
                                    <Input
                                        id="edit_return_time"
                                        type="time"
                                        value={editData.return_time}
                                        onChange={(e) => setEditData('return_time', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_pickup_location" className="text-xs">Tempat Pengambilan</Label>
                                    <Input
                                        id="edit_pickup_location"
                                        type="text"
                                        placeholder="Contoh: Bandara, Garasi, Alamat Customer..."
                                        value={editData.pickup_location}
                                        onChange={(e) => setEditData('pickup_location', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit_dropoff_location" className="text-xs">Tempat Pengantaran / Pengembalian</Label>
                                    <Input
                                        id="edit_dropoff_location"
                                        type="text"
                                        placeholder="Contoh: Bandara, Garasi, Alamat Customer..."
                                        value={editData.dropoff_location}
                                        onChange={(e) => setEditData('dropoff_location', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_payment_method">Metode Pembayaran</Label>
                                    <Select
                                        value={editData.payment_method}
                                        onValueChange={(val) => setEditData('payment_method', val)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Transfer">Transfer</SelectItem>
                                            <SelectItem value="DP">DP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit_rental_type">Type Sewa</Label>
                                    <Select
                                        value={editData.rental_type}
                                        onValueChange={(val: any) => setEditData('rental_type', val)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Lepas Kunci">Lepas Kunci</SelectItem>
                                            <SelectItem value="With Driver">With Driver</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_amount">Harga / Tarif Sewa (Rp)</Label>
                                    <Input
                                        id="edit_amount"
                                        type="number"
                                        min={0}
                                        value={editData.amount}
                                        onChange={(e) => setEditData('amount', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit_status">Status Booking</Label>
                                    <Select
                                        value={editData.status}
                                        onValueChange={(val) => setEditData('status', val)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Confirmed">Confirmed</SelectItem>
                                            <SelectItem value="On Trip">On Trip</SelectItem>
                                            <SelectItem value="Returned">Returned</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                            <SelectItem value="Cancelled">Cancelled (Dibatalkan)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {editData.status === 'Cancelled' && (
                                <div className="space-y-1">
                                    <Label htmlFor="edit_cancellation_reason" className="text-xs">Alasan Pembatalan (Opsional)</Label>
                                    <Textarea
                                        id="edit_cancellation_reason"
                                        rows={2}
                                        placeholder="Masukkan alasan pembatalan jika ada..."
                                        value={editData.cancellation_reason}
                                        onChange={(e) => setEditData('cancellation_reason', e.target.value)}
                                        className="text-xs resize-none"
                                    />
                                </div>
                            )}

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processingEdit}>Simpan Perubahan</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Cancel Booking Confirmation Dialog */}
                <Dialog open={cancelBooking !== null} onOpenChange={(open) => !open && setCancelBooking(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="h-5 w-5" /> Batalkan Booking
                            </DialogTitle>
                            <DialogDescription>
                                Apakah Anda yakin ingin membatalkan pesanan booking <strong className="text-foreground">{cancelBooking?.booking_number}</strong> atas nama <strong className="text-foreground">{cancelBooking?.customer?.name}</strong>?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="cancel_reason" className="text-xs font-medium">Alasan Pembatalan <span className="text-muted-foreground font-normal">(Opsional)</span></Label>
                                <Textarea
                                    id="cancel_reason"
                                    placeholder="Contoh: Konsumen membatalkan sewa, ganti tanggal sewa, unit tidak sesuai, dll."
                                    className="text-xs resize-none"
                                    rows={3}
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Status booking akan diubah menjadi <span className="text-destructive font-semibold">Cancelled</span> dan unit mobil akan dibebaskan.
                            </p>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" type="button" onClick={() => setCancelBooking(null)}>
                                Kembali
                            </Button>
                            <Button
                                variant="destructive"
                                type="button"
                                disabled={isCancelling}
                                onClick={() => {
                                    if (cancelBooking) {
                                        setIsCancelling(true);
                                        router.post(`/bookings/${cancelBooking.id}/cancel`, {
                                            cancellation_reason: cancelReason,
                                        }, {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                setCancelBooking(null);
                                                setCancelReason('');
                                            },
                                            onFinish: () => setIsCancelling(false),
                                        });
                                    }
                                }}
                            >
                                {isCancelling ? 'Membatalkan...' : 'Batalkan Booking'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteBookingId !== null} onOpenChange={(open) => !open && setDeleteBookingId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Hapus Booking</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                                Apakah Anda yakin ingin menghapus booking ini? Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteBookingId(null)}>
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (deleteBookingId) {
                                        router.delete(`/bookings/${deleteBookingId}`, {
                                            onSuccess: () => setDeleteBookingId(null)
                                        });
                                    }
                                }}
                            >
                                Hapus
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

BookingsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Data Booking',
            href: bookingsIndex(),
        },
    ],
};
