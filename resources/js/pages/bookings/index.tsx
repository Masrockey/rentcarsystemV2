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
import { Plus, User, Key, UserCheck, Calendar, DollarSign, Settings, Car, Edit, Trash2, Search, X, CalendarDays, Filter, Ban, AlertTriangle, ClipboardCheck, FileSpreadsheet, Loader2, Navigation, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import DriverTripLogDialog from '@/components/driver-trip-log-dialog';
import { index as bookingsIndex } from '@/routes/bookings';
import { maskPhoneNumber } from '@/lib/utils';

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
    price?: number | null;
    duration_type?: 'Hari' | '24 Jam' | string;
    duration_days?: number | null;
    delivery_fee?: number | null;
    pickup_fee?: number | null;
    driver_fee?: number | null;
    dp_amount?: number | null;
    amount: number;
    status: 'Pending' | 'Confirmed' | 'On Trip' | 'Returned' | 'Completed' | 'Cancelled';
    cancellation_reason?: string | null;
    cancelled_at?: string | null;
};

import Pagination, { PaginatedData } from '@/components/pagination';

type FilterState = {
    search?: string;
    status?: string;
    marketing_id?: string;
    start_date?: string;
    end_date?: string;
    date_field?: 'booking_date' | 'return_date' | 'active_period';
    preset?: string;
};

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
    filters?: FilterState;
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
    filters,
}: Props) {
    const { auth } = usePage().props;
    const user = auth?.user as any;
    const roles: string[] = user?.roles || [];
    const isSuperAdmin = roles.includes('Super Admin');
    const shouldMaskPhone = roles.includes('Admin') && !isSuperAdmin;
    const hasRole = (r: string) => roles.includes(r) || isSuperAdmin;

    // Auto-poll bookings data every 10 seconds in the background
    usePoll(10000, {
        only: ['bookings', 'readyCars', 'readyDrivers'],
    });

    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
    const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [washConfirmId, setWashConfirmId] = useState<number | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [tripLogBooking, setTripLogBooking] = useState<Booking | null>(null);
    const [isTripLogOpen, setIsTripLogOpen] = useState(false);

    // Date, Status & Marketing Filters (initialized from server props)
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [startDate, setStartDate] = useState(filters?.start_date || '');
    const [endDate, setEndDate] = useState(filters?.end_date || '');
    const [dateFilterField, setDateFilterField] = useState<'booking_date' | 'return_date' | 'active_period'>(
        filters?.date_field || 'booking_date'
    );
    const [statusFilter, setStatusFilter] = useState<string>(filters?.status || 'all');
    const [marketingFilter, setMarketingFilter] = useState<string>(filters?.marketing_id || 'all');
    const [activePreset, setActivePreset] = useState<string>(filters?.preset || 'all');

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

    const applyFilters = (overrides: Partial<FilterState> = {}) => {
        const nextFilters: FilterState = {
            search: searchQuery,
            status: statusFilter,
            marketing_id: marketingFilter,
            start_date: startDate,
            end_date: endDate,
            date_field: dateFilterField,
            preset: activePreset,
            ...overrides,
        };

        const params: Record<string, string> = {};
        if (nextFilters.search && nextFilters.search.trim()) params.search = nextFilters.search.trim();
        if (nextFilters.status && nextFilters.status !== 'all') params.status = nextFilters.status;
        if (nextFilters.marketing_id && nextFilters.marketing_id !== 'all') params.marketing_id = nextFilters.marketing_id;
        if (nextFilters.start_date) params.start_date = nextFilters.start_date;
        if (nextFilters.end_date) params.end_date = nextFilters.end_date;
        if (nextFilters.date_field && nextFilters.date_field !== 'booking_date') params.date_field = nextFilters.date_field;
        if (nextFilters.preset && nextFilters.preset !== 'all') params.preset = nextFilters.preset;

        router.get(bookingsIndex(), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Debounce search query to server
    useEffect(() => {
        const currentServerSearch = filters?.search || '';
        if (searchQuery === currentServerSearch) return;

        const timer = setTimeout(() => {
            applyFilters({ search: searchQuery });
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleFilterAll = () => {
        setStartDate('');
        setEndDate('');
        setActivePreset('all');
        applyFilters({ start_date: '', end_date: '', preset: 'all' });
    };

    const handleFilterToday = () => {
        const today = getTodayStr();
        setStartDate(today);
        setEndDate(today);
        setActivePreset('today');
        applyFilters({ start_date: today, end_date: today, preset: 'today' });
    };

    const handleFilterTomorrow = () => {
        const tomorrow = getTomorrowStr();
        setStartDate(tomorrow);
        setEndDate(tomorrow);
        setActivePreset('tomorrow');
        applyFilters({ start_date: tomorrow, end_date: tomorrow, preset: 'tomorrow' });
    };

    const handleFilterThisWeek = () => {
        const range = getThisWeekRange();
        setStartDate(range.start);
        setEndDate(range.end);
        setActivePreset('this_week');
        applyFilters({ start_date: range.start, end_date: range.end, preset: 'this_week' });
    };

    const handleFilterThisMonth = () => {
        const range = getThisMonthRange();
        setStartDate(range.start);
        setEndDate(range.end);
        setActivePreset('this_month');
        applyFilters({ start_date: range.start, end_date: range.end, preset: 'this_month' });
    };

    const handleResetAllFilters = () => {
        setStartDate('');
        setEndDate('');
        setDateFilterField('booking_date');
        setStatusFilter('all');
        setMarketingFilter('all');
        setSearchQuery('');
        setActivePreset('all');
        router.get(
            bookingsIndex(),
            {},
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();
    const thisWeek = getThisWeekRange();
    const thisMonth = getThisMonthRange();

    const isTodayActive = activePreset === 'today' || (startDate === todayStr && endDate === todayStr);
    const isTomorrowActive = activePreset === 'tomorrow' || (startDate === tomorrowStr && endDate === tomorrowStr);
    const isThisWeekActive = activePreset === 'this_week' || (startDate === thisWeek.start && endDate === thisWeek.end);
    const isThisMonthActive = activePreset === 'this_month' || (startDate === thisMonth.start && endDate === thisMonth.end);

    // Bookings are filtered & paginated across the database by server query
    const filteredBookings = Array.isArray(bookings) ? bookings : (bookings?.data || []);
    const totalBookingsCount = Array.isArray(bookings) ? bookings.length : (bookings?.total ?? filteredBookings.length);

    const availableCarTypeNames = useMemo(() => {
        if (carTypes && carTypes.length > 0) {
            return Array.from(new Set(carTypes.map((c) => c.name)));
        }
        return DEFAULT_CAR_TYPES;
    }, [carTypes]);

    const customerOptions = customers.map((c) => ({
        value: c.id.toString(),
        label: c.name,
        sublabel: c.phone ? (shouldMaskPhone ? `HP: ${maskPhoneNumber(c.phone)}` : `HP: ${c.phone}`) : undefined,
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

    const { data: editData, setData: setEditData, put: putEdit, processing: processingEdit, errors: errorsEdit, transform: transformEdit } = useForm({
        user_id: '',
        customer_id: '',
        car_type: '',
        rental_type: 'Lepas Kunci' as 'Lepas Kunci' | 'With Driver',
        price: '',
        duration_type: 'Hari' as 'Hari' | '24 Jam',
        duration_days: '1',
        delivery_fee: '',
        pickup_fee: '',
        driver_fee: '',
        booking_date: '',
        return_date: '',
        pickup_time: '',
        return_time: '',
        pickup_location: '',
        dropoff_location: '',
        payment_method: 'Cash',
        dp_amount: '',
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

    const handleEditBookingDateChange = (val: string) => {
        const days = parseInt(editData.duration_days, 10) || 1;
        if (val) {
            const start = new Date(val);
            const end = new Date(start);
            end.setDate(start.getDate() + days);
            const yyyy = end.getFullYear();
            const mm = String(end.getMonth() + 1).padStart(2, '0');
            const dd = String(end.getDate()).padStart(2, '0');
            setEditData((prev) => ({
                ...prev,
                booking_date: val,
                return_date: `${yyyy}-${mm}-${dd}`,
            }));
        } else {
            setEditData('booking_date', val);
        }
    };

    const handleEditReturnDateChange = (val: string) => {
        if (editData.booking_date && val) {
            const start = new Date(editData.booking_date);
            const end = new Date(val);
            const diffMs = end.getTime() - start.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            const calculatedDays = diffDays <= 0 ? 1 : diffDays;
            setEditData((prev) => ({
                ...prev,
                return_date: val,
                duration_days: calculatedDays.toString(),
            }));
        } else {
            setEditData('return_date', val);
        }
    };

    const handleEditDurationDaysChange = (val: string) => {
        const days = parseInt(val, 10);
        if (!isNaN(days) && days > 0 && editData.booking_date) {
            const start = new Date(editData.booking_date);
            const end = new Date(start);
            end.setDate(start.getDate() + days);
            const yyyy = end.getFullYear();
            const mm = String(end.getMonth() + 1).padStart(2, '0');
            const dd = String(end.getDate()).padStart(2, '0');
            setEditData((prev) => ({
                ...prev,
                duration_days: val,
                return_date: `${yyyy}-${mm}-${dd}`,
            }));
        } else {
            setEditData('duration_days', val);
        }
    };

    const openEditDialog = (booking: Booking) => {
        setSelectedBooking(booking);
        setEditData({
            user_id: booking.user_id ? booking.user_id.toString() : '',
            customer_id: booking.customer_id ? booking.customer_id.toString() : '',
            car_type: booking.car_type || '',
            rental_type: (booking.rental_type as any) || 'Lepas Kunci',
            price: booking.price ? booking.price.toString() : (booking.amount ? booking.amount.toString() : ''),
            duration_type: (booking.duration_type as any) || 'Hari',
            duration_days: booking.duration_days ? booking.duration_days.toString() : '1',
            delivery_fee: booking.delivery_fee ? booking.delivery_fee.toString() : '0',
            pickup_fee: booking.pickup_fee ? booking.pickup_fee.toString() : '0',
            driver_fee: booking.driver_fee ? booking.driver_fee.toString() : '0',
            booking_date: booking.booking_date || '',
            return_date: booking.return_date || '',
            pickup_time: booking.pickup_time ? booking.pickup_time.substring(0, 5) : '',
            return_time: booking.return_time ? booking.return_time.substring(0, 5) : '',
            pickup_location: booking.pickup_location || '',
            dropoff_location: booking.dropoff_location || '',
            payment_method: booking.payment_method || 'Cash',
            dp_amount: booking.dp_amount ? booking.dp_amount.toString() : '0',
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
            transformEdit((data) => {
                const p = parseFloat(data.price) || 0;
                const d = parseInt(data.duration_days, 10) || 1;
                const f = parseFloat(data.delivery_fee) || 0;
                const pf = parseFloat(data.pickup_fee) || 0;
                const df = data.rental_type === 'With Driver' ? (parseFloat(data.driver_fee) || 0) : 0;
                return {
                    ...data,
                    amount: p > 0 ? ((p * d) + f + pf + df).toString() : data.amount,
                    driver_fee: data.rental_type === 'With Driver' ? data.driver_fee : '0',
                    dp_amount: data.payment_method === 'DP' ? data.dp_amount : '0',
                    payment_status: data.payment_method === 'DP' ? 'Down Payment' : data.payment_status,
                };
            });
            putEdit(`/bookings/${selectedBooking.id}`, {
                onSuccess: () => {
                    setIsEditOpen(false);
                },
            });
        }
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

    const getReturnUrgency = (booking: Booking): { level: 'overdue' | 'due-soon' | 'normal'; label?: string } => {
        // Return urgency only applies to active rentals that have return_date and are currently active (On Trip / Confirmed)
        if (!booking || !booking.return_date || booking.status === 'Completed' || booking.status === 'Cancelled' || booking.status === 'Returned' || booking.status === 'Pending') {
            return { level: 'normal' };
        }

        const cleanDate = booking.return_date.substring(0, 10);
        if (!cleanDate) return { level: 'normal' };

        const returnTimeStr = booking.return_time ? booking.return_time.substring(0, 5) : (booking.pickup_time ? booking.pickup_time.substring(0, 5) : '23:59');

        const targetDate = new Date(`${cleanDate}T${returnTimeStr}:00`);
        if (isNaN(targetDate.getTime())) return { level: 'normal' };

        const now = new Date();
        const diffMs = targetDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Terlambat / lewat tanggal dan jam harus kembali
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

    const getRowHighlightClass = (booking: Booking) => {
        const { level } = getReturnUrgency(booking);
        if (level === 'overdue') {
            return 'bg-red-50/75 hover:bg-red-100/90 dark:bg-red-950/35 dark:hover:bg-red-950/50 border-l-4 border-l-red-500 transition-colors';
        }
        if (level === 'due-soon' || booking.status === 'On Trip') {
            return 'bg-amber-50/60 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/45 border-l-4 border-l-amber-500 transition-colors';
        }
        if (booking.status === 'Confirmed' || (booking.status === 'Pending' && booking.car_id)) {
            return 'bg-emerald-50/50 hover:bg-emerald-100/70 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40 border-l-4 border-l-emerald-500 transition-colors';
        }
        return 'hover:bg-muted/50 transition-colors';
    };

    const getCardHighlightClass = (booking: Booking) => {
        const { level } = getReturnUrgency(booking);
        if (level === 'overdue') {
            return 'border-l-4 border-l-red-500 border-red-300 bg-red-50/35 dark:border-red-900/50 dark:bg-red-950/20';
        }
        if (level === 'due-soon' || booking.status === 'On Trip') {
            return 'border-l-4 border-l-amber-500 border-amber-300 bg-amber-50/35 dark:border-amber-900/50 dark:bg-amber-950/20';
        }
        if (booking.status === 'Confirmed' || (booking.status === 'Pending' && booking.car_id)) {
            return 'border-l-4 border-l-emerald-500 border-emerald-300 bg-emerald-50/35 dark:border-emerald-900/50 dark:bg-emerald-950/20';
        }
        return 'border bg-card text-card-foreground shadow-xs';
    };

    const [isExporting, setIsExporting] = useState(false);

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
            if (marketingFilter && marketingFilter !== 'all') params.append('marketing_id', marketingFilter);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (dateFilterField) params.append('date_field', dateFilterField);
            params.append('format', 'json');

            let rawData: any[] = filteredBookings;
            try {
                const res = await fetch(`/bookings/export?${params.toString()}`, {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                if (res.ok) {
                    const json = await res.json();
                    if (Array.isArray(json.data) && json.data.length > 0) {
                        rawData = json.data;
                    }
                }
            } catch (err) {
                console.error('Fetch export bookings error:', err);
            }

            const exportRows = rawData.map((b: any, idx: number) => ({
                'No': idx + 1,
                'No. Booking': b.booking_number ?? '-',
                'Nama Pelanggan': b.customer?.name ?? '-',
                'No. HP Pelanggan': b.customer?.phone ? (shouldMaskPhone ? maskPhoneNumber(b.customer.phone) : b.customer.phone) : '-',
                'NIK Pelanggan': b.customer?.nik ?? '-',
                'Email Pelanggan': b.customer?.email ?? '-',
                'Alamat Pelanggan': b.customer?.address ?? '-',
                'Tipe Mobil Dipesan': b.car_type ?? '-',
                'Tipe Sewa': b.rental_type ?? 'Lepas Kunci',
                'Armada Mobil Alokasi': b.car?.name ?? 'Belum Dialokasi',
                'No. Polisi': b.car?.plate_number ?? '-',
                'Tanggal Sewa (Mulai)': b.booking_date ?? '-',
                'Jam Jemput': b.pickup_time ? b.pickup_time.substring(0, 5) : '-',
                'Lokasi Jemput': b.pickup_location ?? '-',
                'Tanggal Sewa (Selesai)': b.return_date ?? '-',
                'Jam Selesai': b.return_time ? b.return_time.substring(0, 5) : '-',
                'Lokasi Antar': b.dropoff_location ?? '-',
                'Marketing / Dibuat Oleh': b.user?.name ?? 'Admin / System',
                'Supir / Driver': b.driver?.name ?? (b.rental_type === 'With Driver' ? 'Belum Dialokasi' : '-'),
                'Petugas Peluncur': b.peluncur?.name ?? 'Belum ada',
                'Petugas Cuci': b.petugasCuci?.name ?? (b.petugas_cuci?.name ?? 'Belum ada'),
                'Total Tarif (Rp)': b.amount ? Number(b.amount) : 0,
                'Status Pembayaran': b.payment_status ?? 'Pending',
                'Metode Pembayaran': b.payment_method ?? 'Cash',
                'Status Booking': b.status ?? 'Pending',
                'Alasan Pembatalan': b.cancellation_reason ?? '-',
                'Tanggal Dibuat': b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID') : '-',
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportRows);
            worksheet['!cols'] = [
                { wch: 5 },  // No
                { wch: 18 }, // No. Booking
                { wch: 22 }, // Nama Pelanggan
                { wch: 15 }, // No. HP
                { wch: 18 }, // NIK
                { wch: 22 }, // Email
                { wch: 25 }, // Alamat
                { wch: 20 }, // Tipe Mobil
                { wch: 14 }, // Tipe Sewa
                { wch: 22 }, // Armada Mobil
                { wch: 14 }, // No. Polisi
                { wch: 15 }, // Tgl Mulai
                { wch: 12 }, // Jam Jemput
                { wch: 20 }, // Lokasi Jemput
                { wch: 15 }, // Tgl Selesai
                { wch: 12 }, // Jam Selesai
                { wch: 20 }, // Lokasi Antar
                { wch: 20 }, // Marketing
                { wch: 18 }, // Supir
                { wch: 18 }, // Peluncur
                { wch: 18 }, // Cuci
                { wch: 16 }, // Total Tarif
                { wch: 16 }, // Status Bayar
                { wch: 16 }, // Metode Bayar
                { wch: 14 }, // Status Booking
                { wch: 25 }, // Alasan Batal
                { wch: 16 }, // Tanggal Dibuat
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Booking');
            const today = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `Data_Booking_${today}.xlsx`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <Head title="Data Booking" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">Data Booking Mobil</h1>
                        <p className="text-muted-foreground">Kelola pesanan sewa mobil, alokasi armada, dan penugasan staf.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isExporting}
                            className="flex items-center gap-2 h-9 text-xs font-semibold shadow-xs hover:bg-muted"
                            onClick={handleExportData}
                        >
                            {isExporting ? (
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            ) : (
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                            )}
                            Export Excel (.xlsx)
                        </Button>
                        {(hasRole('Marketing') || hasRole('Admin')) && (
                            <Button asChild className="flex items-center gap-1 h-9">
                                <Link href="/bookings/create">
                                    <Plus className="h-4 w-4" /> Tambah Booking
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle>Daftar Booking Mobil</CardTitle>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Cari customer / no. booking..."
                                className="pl-9 pr-8 h-9 text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        applyFilters({ search: searchQuery });
                                    }
                                }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        applyFilters({ search: '' });
                                    }}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                    title="Hapus pencarian"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filter Bar */}
                        <div className="mb-5 p-3.5 rounded-lg border bg-muted/30 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Filter Data Booking</span>
                                    {(startDate || endDate || statusFilter !== 'all' || marketingFilter !== 'all' || searchQuery) && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                            {totalBookingsCount} data ditemukan
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                                <div className="space-y-1">
                                    <Label htmlFor="dateFilterField" className="text-[11px] text-muted-foreground font-medium">Tipe Tanggal</Label>
                                    <Select
                                        value={dateFilterField}
                                        onValueChange={(val: any) => {
                                            setDateFilterField(val);
                                            applyFilters({ date_field: val });
                                        }}
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
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setStartDate(val);
                                            setActivePreset('all');
                                            applyFilters({ start_date: val, preset: 'all' });
                                        }}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="filter_end_date" className="text-[11px] text-muted-foreground font-medium">Sampai Tanggal</Label>
                                    <Input
                                        id="filter_end_date"
                                        type="date"
                                        className="h-8 text-xs bg-background"
                                        value={endDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEndDate(val);
                                            setActivePreset('all');
                                            applyFilters({ end_date: val, preset: 'all' });
                                        }}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="filter_status" className="text-[11px] text-muted-foreground font-medium">Status Booking</Label>
                                    <Select
                                        value={statusFilter}
                                        onValueChange={(val: any) => {
                                            setStatusFilter(val);
                                            applyFilters({ status: val });
                                        }}
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
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="filter_marketing" className="text-[11px] text-muted-foreground font-medium">Marketing</Label>
                                    <div className="flex items-center gap-1.5">
                                        <Select
                                            value={marketingFilter}
                                            onValueChange={(val: any) => {
                                                setMarketingFilter(val);
                                                applyFilters({ marketing_id: val });
                                            }}
                                        >
                                            <SelectTrigger id="filter_marketing" className="h-8 text-xs bg-background">
                                                <SelectValue placeholder="Semua Marketing" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Marketing</SelectItem>
                                                {marketingUsers.map((m) => (
                                                    <SelectItem key={m.id} value={m.id.toString()}>
                                                        {m.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {(startDate || endDate || statusFilter !== 'all' || marketingFilter !== 'all' || searchQuery) && (
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
                                    {searchQuery || startDate || endDate || statusFilter !== 'all' || marketingFilter !== 'all'
                                        ? 'Tidak ada booking yang cocok dengan filter atau pencarian.'
                                        : 'Belum ada data booking.'}
                                </div>
                            ) : (
                                filteredBookings.map((booking: Booking) => {
                                    const urgency = getReturnUrgency(booking);
                                    return (
                                        <div key={booking.id} className={`flex flex-col gap-2 p-4 rounded-lg shadow-xs ${getCardHighlightClass(booking)}`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-semibold text-sm">{booking.customer?.name}</span>
                                                    {booking.booking_number && (
                                                        <div className="text-[11px] font-mono text-muted-foreground">{booking.booking_number}</div>
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
                                                <div>
                                                    <span className="font-semibold text-foreground">Pembayaran:</span> {formatCurrency(booking.amount)} ({booking.payment_status} via {booking.payment_method})
                                                    {booking.payment_method === 'DP' && Number(booking.dp_amount) > 0 && (
                                                        <span className="text-amber-600 dark:text-amber-400 ml-1 font-medium">
                                                            [DP: {formatCurrency(Number(booking.dp_amount))}]
                                                        </span>
                                                    )}
                                                </div>
                                                {booking.rental_type === 'With Driver' && (
                                                    <div>
                                                        <span className="font-semibold text-foreground">Supir:</span> {booking.driver?.name ?? <span className="text-red-500 font-semibold italic">Belum Dialokasi</span>}
                                                    </div>
                                                )}
                                                {(hasRole('Admin') || hasRole('Super Admin')) && (
                                                    <div><span className="font-semibold text-foreground">Marketing:</span> <span className="font-medium text-foreground">{booking.user?.name ?? 'Admin / System'}</span></div>
                                                )}
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2 border-t mt-1">
                                                {(booking.status === 'Pending' || booking.status === 'Confirmed') && (hasRole('Marketing') || hasRole('Admin') || hasRole('Super Admin')) && (
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
                                                        {roles.includes('Super Admin') && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-600"
                                                                onClick={() => setDeleteBookingId(booking.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}

                                                {roles.includes('Peluncur') &&
                                                    Boolean(booking.car_id) &&
                                                    (booking.status === 'Confirmed' || booking.status === 'Pending') && (
                                                    <Link href={`/bookings/${booking.id}/checklist?type=delivery`}>
                                                        <Button
                                                            size="sm"
                                                            className="flex items-center gap-1.5 h-8 text-xs font-semibold px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                                            title="Antar Unit & Checklist Serah Terima"
                                                        >
                                                            <Car className="h-3.5 w-3.5" /> Antar Unit
                                                        </Button>
                                                    </Link>
                                                )}

                                                {roles.includes('Peluncur') &&
                                                    booking.status === 'On Trip' && (
                                                    <Link href={`/bookings/${booking.id}/checklist?type=return`}>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex items-center gap-1.5 h-8 text-xs font-semibold px-2.5 border-amber-500 text-amber-800 bg-amber-100 hover:bg-amber-500 hover:text-white dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-500 dark:hover:text-white shadow-xs"
                                                            title="Terima Unit & Checklist Pengembalian"
                                                        >
                                                            <ClipboardCheck className="h-3.5 w-3.5" /> Terima Unit
                                                        </Button>
                                                    </Link>
                                                )}

                                                {(hasRole('Petugas Cuci') || hasRole('Admin')) && booking.status === 'Returned' && (
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                                                        onClick={() => handleCompleteWash(booking.id)}
                                                        title="Selesaikan pesanan booking & kembalikan status mobil ke Ready"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete Booking
                                                    </Button>
                                                )}
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
                                        <th className="px-4 py-3">Armada Alokasi</th>
                                        <th className="px-4 py-3">Tanggal & Jam</th>
                                        <th className="px-4 py-3">Pembayaran</th>
                                        <th className="px-4 py-3">Penugasan Staf</th>
                                        {(hasRole('Admin') || hasRole('Super Admin')) && (
                                            <th className="px-4 py-3">Marketing</th>
                                        )}
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredBookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={(hasRole('Admin') || hasRole('Super Admin')) ? 9 : 8} className="px-4 py-8 text-center text-muted-foreground">
                                                {searchQuery || startDate || endDate || statusFilter !== 'all' || marketingFilter !== 'all'
                                                    ? 'Tidak ada booking yang cocok dengan filter atau pencarian.'
                                                    : 'Belum ada data booking.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBookings.map((booking: Booking) => {
                                            const urgency = getReturnUrgency(booking);
                                            return (
                                                <tr key={booking.id} className={getRowHighlightClass(booking)}>
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
                                                        {booking.return_date && <div className="whitespace-nowrap font-medium">End: {booking.return_date} {booking.return_time ? `(${booking.return_time.substring(0, 5)})` : ''}</div>}
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
                                                        {booking.payment_method === 'DP' && Number(booking.dp_amount) > 0 && (
                                                            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                                                DP: {formatCurrency(Number(booking.dp_amount))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-xs">
                                                        {booking.rental_type === 'With Driver' ? (
                                                            <div className="font-medium">
                                                                Supir: {booking.driver ? <span className="font-semibold text-foreground">{booking.driver.name}</span> : <span className="text-red-500 italic font-semibold">Belum Dialokasi</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">Lepas Kunci</span>
                                                        )}
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
                                                            {(booking.status === 'Pending' || booking.status === 'Confirmed') && (hasRole('Marketing') || hasRole('Admin') || hasRole('Super Admin')) && (
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
                                                                    {roles.includes('Super Admin') && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-red-500 hover:text-red-600"
                                                                            title="Hapus Booking"
                                                                            onClick={() => setDeleteBookingId(booking.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}

                                                            {roles.includes('Peluncur') &&
                                                                Boolean(booking.car_id) &&
                                                                (booking.status === 'Confirmed' || booking.status === 'Pending') && (
                                                                <Link href={`/bookings/${booking.id}/checklist?type=delivery`}>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 text-xs font-semibold flex items-center gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                                                        title="Antar Unit & Checklist Serah Terima"
                                                                    >
                                                                        <Car className="h-3.5 w-3.5" /> Antar Unit
                                                                    </Button>
                                                                </Link>
                                                            )}

                                                            {roles.includes('Peluncur') &&
                                                                booking.status === 'On Trip' && (
                                                                <Link href={`/bookings/${booking.id}/checklist?type=return`}>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-8 text-xs font-semibold flex items-center gap-1.5 px-3 border-amber-500 text-amber-800 bg-amber-100 hover:bg-amber-500 hover:text-white dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-500 dark:hover:text-white shadow-xs"
                                                                        title="Terima Unit & Checklist Pengembalian"
                                                                    >
                                                                        <ClipboardCheck className="h-3.5 w-3.5" /> Terima Unit
                                                                    </Button>
                                                                </Link>
                                                            )}

                                                            {(hasRole('Petugas Cuci') || hasRole('Admin')) && booking.status === 'Returned' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="default"
                                                                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                                                                    onClick={() => handleCompleteWash(booking.id)}
                                                                    title="Selesaikan pesanan booking & kembalikan status mobil ke Ready"
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Complete Booking
                                                                </Button>
                                                            )}

                                                            {(booking.rental_type === 'With Driver' || Boolean(booking.driver_id) || roles.includes('Driver')) && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 text-xs font-semibold flex items-center gap-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shadow-2xs"
                                                                    title="Log Perjalanan & Check-in Supir"
                                                                    onClick={() => {
                                                                        setTripLogBooking(booking);
                                                                        setIsTripLogOpen(true);
                                                                    }}
                                                                >
                                                                    <Navigation className="h-3.5 w-3.5" /> Log Trip
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination data={bookings} />
                    </CardContent>
                </Card>

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
                                    <Label htmlFor="assign_amount">Harga / Tarif Sewa (Rp)</Label>
                                    <Input
                                        id="assign_amount"
                                        type="number"
                                        value={assignData.amount}
                                        readOnly
                                        disabled
                                        className="bg-muted text-muted-foreground cursor-not-allowed select-none font-medium"
                                        placeholder="Harga/tarif sewa..."
                                    />
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
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-5 w-5" /> Selesaikan Booking (Complete Booking)
                            </DialogTitle>
                            <DialogDescription>
                                Apakah Anda yakin ingin menyelesaikan pesanan booking ini? Status booking akan diubah menjadi <strong className="text-foreground">Completed</strong> dan armada mobil akan otomatis kembali berstatus <strong className="text-foreground">Ready</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0 pt-4">
                            <Button variant="outline" onClick={() => setWashConfirmId(null)}>
                                Batal
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
                                onClick={() => {
                                    if (washConfirmId) {
                                        router.post(`/bookings/${washConfirmId}/complete`, {}, {
                                            onSuccess: () => setWashConfirmId(null)
                                        });
                                    }
                                }}
                            >
                                <CheckCircle2 className="h-4 w-4" /> Selesaikan Booking (Set Ready)
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
                                    <Label htmlFor="edit_user_id" className="text-xs font-semibold">
                                        Nama Marketing <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={editData.user_id}
                                        onValueChange={(val) => setEditData('user_id', val)}
                                    >
                                        <SelectTrigger id="edit_user_id" className={`h-9 ${errorsEdit.user_id ? 'border-destructive' : ''}`}>
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
                                    {errorsEdit.user_id && (
                                        <p className="text-xs text-destructive font-medium">{errorsEdit.user_id}</p>
                                    )}
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

                            <div className="space-y-1">
                                <Label htmlFor="edit_rental_type" className="text-xs font-semibold">Type Sewa</Label>
                                <Select
                                    value={editData.rental_type}
                                    onValueChange={(val: any) => setEditData('rental_type', val)}
                                >
                                    <SelectTrigger id="edit_rental_type"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Lepas Kunci">Lepas Kunci</SelectItem>
                                        <SelectItem value="With Driver">With Driver</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_booking_date" className="text-xs">Tanggal Sewa</Label>
                                    <Input
                                        id="edit_booking_date"
                                        type="date"
                                        value={editData.booking_date}
                                        onChange={(e) => handleEditBookingDateChange(e.target.value)}
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
                                        onChange={(e) => handleEditReturnDateChange(e.target.value)}
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

                            <div className="space-y-1">
                                <Label htmlFor="edit_duration_days" className="text-xs font-semibold">
                                    Durasi (Hari)
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="edit_duration_days"
                                        type="number"
                                        min={1}
                                        placeholder="1"
                                        value={editData.duration_days}
                                        onChange={(e) => handleEditDurationDaysChange(e.target.value)}
                                        className="pr-14"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none font-medium">
                                        Hari
                                    </span>
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

                            {editData.payment_method === 'DP' ? (
                                <div className="grid grid-cols-2 gap-3">
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
                                        <Label htmlFor="edit_dp_amount" className="text-xs font-semibold text-primary">Jumlah DP (Rp)</Label>
                                        <Input
                                            id="edit_dp_amount"
                                            type="number"
                                            min={0}
                                            placeholder="Contoh: 100000"
                                            value={editData.dp_amount}
                                            onChange={(e) => setEditData('dp_amount', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
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
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_price" className="text-xs font-semibold">Harga Sewa (Rp)</Label>
                                    <Input
                                        id="edit_price"
                                        type="number"
                                        min={0}
                                        placeholder="Contoh: 350000"
                                        value={editData.price}
                                        onChange={(e) => setEditData('price', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit_duration_type" className="text-xs font-semibold">Pilihan Tarif</Label>
                                    <Select
                                        value={editData.duration_type}
                                        onValueChange={(val: any) => setEditData('duration_type', val)}
                                    >
                                        <SelectTrigger id="edit_duration_type">
                                            <SelectValue placeholder="Pilih..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Hari">Hari</SelectItem>
                                            <SelectItem value="24 Jam">24 Jam</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_delivery_fee" className="text-xs font-semibold">Fee Pengantaran (Rp)</Label>
                                    <Input
                                        id="edit_delivery_fee"
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={editData.delivery_fee}
                                        onChange={(e) => setEditData('delivery_fee', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit_pickup_fee" className="text-xs font-semibold">Fee Pengambilan (Rp)</Label>
                                    <Input
                                        id="edit_pickup_fee"
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={editData.pickup_fee}
                                        onChange={(e) => setEditData('pickup_fee', e.target.value)}
                                    />
                                </div>
                            </div>

                            {editData.rental_type === 'With Driver' && (
                                <div className="space-y-1">
                                    <Label htmlFor="edit_driver_fee" className="text-xs font-semibold text-primary">Fee Driver (Rp)</Label>
                                    <Input
                                        id="edit_driver_fee"
                                        type="number"
                                        min={0}
                                        placeholder="Contoh: 150000"
                                        value={editData.driver_fee}
                                        onChange={(e) => setEditData('driver_fee', e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_amount">Total Tarif Sewa (Rp)</Label>
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
                                    {roles.includes('Super Admin') ? (
                                        <Select
                                            value={editData.status}
                                            onValueChange={(val) => setEditData('status', val)}
                                        >
                                            <SelectTrigger id="edit_status"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Pending">Pending</SelectItem>
                                                <SelectItem value="Confirmed">Confirmed</SelectItem>
                                                <SelectItem value="On Trip">On Trip</SelectItem>
                                                <SelectItem value="Returned">Returned</SelectItem>
                                                <SelectItem value="Completed">Completed</SelectItem>
                                                <SelectItem value="Cancelled">Cancelled (Dibatalkan)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="h-9 px-3 py-1.5 rounded-md border bg-muted/40 flex items-center justify-between">
                                            <Badge variant="outline" className={getStatusColor(editData.status)}>
                                                {editData.status}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground italic">
                                                (Otomatis via alokasi & alur sewa)
                                            </span>
                                        </div>
                                    )}
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

                {/* DRIVER TRIP LOG DIALOG */}
                {tripLogBooking && (
                    <DriverTripLogDialog
                        isOpen={isTripLogOpen}
                        onClose={() => {
                            setIsTripLogOpen(false);
                            setTripLogBooking(null);
                        }}
                        booking={tripLogBooking}
                    />
                )}
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
