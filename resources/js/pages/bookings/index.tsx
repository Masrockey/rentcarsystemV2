import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import { useState, useEffect } from 'react';
import { Plus, User, Key, UserCheck, Calendar, DollarSign, Settings, Car, Edit, Trash2 } from 'lucide-react';
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
    name: string;
    type?: string | null;
    daily_price?: string | null;
    weekly_price?: string | null;
    monthly_price?: string | null;
};

type UserType = {
    id: number;
    name: string;
    role: string;
};

type Booking = {
    id: number;
    customer_id: number;
    customer?: Customer;
    car_type: string;
    car_id: number | null;
    car?: CarType;
    peluncur_id: number | null;
    peluncur?: UserType;
    petugas_cuci_id: number | null;
    petugas_cuci?: UserType;
    booking_date: string;
    return_date: string | null;
    payment_method: 'Cash' | 'Transfer' | 'DP';
    payment_status: 'Pending' | 'Paid' | 'Down Payment';
    amount: number;
    status: 'Pending' | 'Confirmed' | 'On Trip' | 'Returned' | 'Completed';
};

type Props = {
    bookings: Booking[];
    customers: Customer[];
    cars: CarType[];
    readyCars: CarType[];
    carTypes?: CarTypeRef[];
    peluncurOfficers: UserType[];
    washOfficers: UserType[];
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
    carTypes,
    peluncurOfficers,
    washOfficers
}: Props) {
    const { auth } = usePage().props;
    const user = auth?.user as any;
    const roles: string[] = user?.roles || [];
    const hasRole = (r: string) => roles.includes(r) || roles.includes('Super Admin');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [isCustomCarType, setIsCustomCarType] = useState(false);
    const [washConfirmId, setWashConfirmId] = useState<number | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    const availableCarTypeNames = Array.from(
        new Set([
            ...(carTypes?.map(c => c.name) || []),
            ...readyCars.map(c => c.name),
            ...cars.map(c => c.name),
            ...DEFAULT_CAR_TYPES
        ])
    );

    const { data: createData, setData: setCreateData, post: postCreate, reset: resetCreate, processing: processingCreate, errors: errorsCreate } = useForm({
        customer_id: '',
        new_customer_name: '',
        new_customer_phone: '',
        car_type: '',
        booking_date: '',
        return_date: '',
        payment_method: 'Cash',
        payment_status: 'Pending',
        amount: '0',
    });

    const { data: editData, setData: setEditData, put: putEdit, processing: processingEdit, errors: errorsEdit } = useForm({
        customer_id: '',
        car_type: '',
        booking_date: '',
        return_date: '',
        payment_method: 'Cash',
        payment_status: 'Pending',
        amount: '0',
        status: 'Pending',
    });

    const { data: assignData, setData: setAssignData, put: putAssign, processing: processingAssign } = useForm({
        car_id: '',
        peluncur_id: '',
        petugas_cuci_id: '',
        amount: '',
    });

    const openCreateDialog = () => {
        resetCreate();
        setIsNewCustomer(false);
        setIsCustomCarType(false);
        if (customers.length > 0) {
            setCreateData('customer_id', customers[0].id.toString());
        }
        setIsCreateOpen(true);
    };

    const openEditDialog = (booking: Booking) => {
        setSelectedBooking(booking);
        setEditData({
            customer_id: booking.customer_id ? booking.customer_id.toString() : '',
            car_type: booking.car_type || '',
            booking_date: booking.booking_date || '',
            return_date: booking.return_date || '',
            payment_method: booking.payment_method || 'Cash',
            payment_status: booking.payment_status || 'Pending',
            amount: booking.amount ? booking.amount.toString() : '0',
            status: booking.status || 'Pending',
        });
        setIsEditOpen(true);
    };

    const openAssignDialog = (booking: Booking) => {
        setSelectedBooking(booking);
        setAssignData({
            car_id: booking.car_id ? booking.car_id.toString() : '',
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
            <Head title="Rent Car Bookings" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">Rental Bookings</h1>
                        <p className="text-muted-foreground">Monitor car bookings, dispatch staff, and wash updates.</p>
                    </div>
                    {(hasRole('Marketing') || hasRole('Admin')) && (
                        <Button onClick={openCreateDialog} className="flex items-center gap-1">
                            <Plus className="h-4 w-4" /> New Booking
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Rent Car Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Mobile Cards View */}
                        <div className="space-y-3 md:hidden">
                            {bookings.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No bookings found.
                                </div>
                            ) : (
                                bookings.map((booking) => (
                                    <div key={booking.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card text-card-foreground shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-sm">{booking.customer?.name}</span>
                                            <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                {booking.status}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div><span className="font-semibold text-foreground">Requested Car:</span> {booking.car_type}</div>
                                            <div><span className="font-semibold text-foreground">Assigned Fleet:</span> {booking.car ? `${booking.car.name} (${booking.car.plate_number})` : <span className="italic text-muted-foreground text-xs">Unallocated</span>}</div>
                                            <div><span className="font-semibold text-foreground">Dates:</span> Start: {booking.booking_date} {booking.return_date ? `| End: ${booking.return_date}` : ''}</div>
                                            <div><span className="font-semibold text-foreground">Payment:</span> {formatCurrency(booking.amount)} ({booking.payment_status} via {booking.payment_method})</div>
                                            <div><span className="font-semibold text-foreground">Staff Duties:</span> Peluncur: {booking.peluncur?.name ?? 'None'}, Wash: {booking.petugas_cuci?.name ?? 'None'}</div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2 border-t mt-1">
                                            {(hasRole('Admin') || hasRole('Super Admin')) && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex items-center gap-1 h-8 text-xs"
                                                        onClick={() => openAssignDialog(booking)}
                                                    >
                                                        <Settings className="h-3 w-3" /> Allocate
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
                                                    Wash Complete
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
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Requested Car</th>
                                        <th className="px-4 py-3">Assigned Fleet</th>
                                        <th className="px-4 py-3">Dates</th>
                                        <th className="px-4 py-3">Payment</th>
                                        <th className="px-4 py-3">Staff Duties</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {bookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                                No bookings found.
                                            </td>
                                        </tr>
                                    ) : (
                                        bookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-muted/50">
                                                <td className="px-4 py-4">
                                                    <span className="font-semibold">{booking.customer?.name}</span>
                                                </td>
                                                <td className="px-4 py-4">{booking.car_type}</td>
                                                <td className="px-4 py-4 font-mono font-medium">
                                                    {booking.car ? `${booking.car.name} (${booking.car.plate_number})` : <span className="text-muted-foreground text-xs italic">Unallocated</span>}
                                                </td>
                                                <td className="px-4 py-4 text-xs whitespace-nowrap">
                                                    <div>Start: {booking.booking_date}</div>
                                                    {booking.return_date && <div>End: {booking.return_date}</div>}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-medium text-xs">{formatCurrency(booking.amount)}</div>
                                                    <Badge variant="outline" className={`mt-1 text-[10px] ${getPaymentStatusColor(booking.payment_status)}`}>
                                                        {booking.payment_status} ({booking.payment_method})
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 text-xs">
                                                    <div>Peluncur: {booking.peluncur ? booking.peluncur.name : <span className="text-muted-foreground italic">None</span>}</div>
                                                    <div className="mt-1">Wash: {booking.petugas_cuci ? booking.petugas_cuci.name : <span className="text-muted-foreground italic">None</span>}</div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                        {booking.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(hasRole('Admin') || hasRole('Super Admin')) && (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex items-center gap-1"
                                                                    onClick={() => openAssignDialog(booking)}
                                                                >
                                                                    <Settings className="h-3.5 w-3.5" /> Allocate
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
                    </CardContent>
                </Card>

                {/* CREATE BOOKING DIALOG */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <h2 className="text-lg font-semibold">New Rental Booking</h2>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="customer_id">{isNewCustomer ? 'New Customer' : 'Select Customer'}</Label>
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
                                                setCreateData('new_customer_phone', '');
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
                                    <Select
                                        value={createData.customer_id}
                                        onValueChange={(val) => setCreateData('customer_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih customer terdaftar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">Belum ada customer terdaftar.</div>
                                            ) : (
                                                customers.map((c) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="p-3 border rounded-md bg-muted/30 space-y-1">
                                        <Label className="text-xs">Nama Customer Baru</Label>
                                        <Input
                                            type="text"
                                            placeholder="Masukkan nama lengkap customer..."
                                            value={createData.new_customer_name}
                                            onChange={(e) => setCreateData('new_customer_name', e.target.value)}
                                            required={isNewCustomer}
                                        />
                                    </div>
                                )}
                                {errorsCreate.customer_id && <p className="text-xs text-red-500">{errorsCreate.customer_id}</p>}
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="car_type">Requested Car Type</Label>
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
                                </div>

                                {!isCustomCarType ? (
                                    <Select
                                        value={createData.car_type}
                                        onValueChange={(val) => setCreateData('car_type', val)}
                                    >
                                        <SelectTrigger id="car_type">
                                            <SelectValue placeholder="Pilih type kendaraan..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableCarTypeNames.map((name) => (
                                                <SelectItem key={name} value={name}>
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="booking_date">Rent Date</Label>
                                    <Input
                                        id="booking_date"
                                        type="date"
                                        value={createData.booking_date}
                                        onChange={(e) => setCreateData('booking_date', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="return_date">Return Date</Label>
                                    <Input
                                        id="return_date"
                                        type="date"
                                        value={createData.return_date}
                                        onChange={(e) => setCreateData('return_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="payment_method">Payment Method</Label>
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
                                    <Label htmlFor="payment_status">Payment Status</Label>
                                    <Select
                                        value={createData.payment_status}
                                        onValueChange={(val: any) => setCreateData('payment_status', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Paid">Paid</SelectItem>
                                            <SelectItem value="Down Payment">Down Payment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={processingCreate}>Save Booking</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ALLOCATION / ASSIGNMENT DIALOG */}
                <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <h2 className="text-lg font-semibold">Allocate Staff & Vehicle</h2>
                        </DialogHeader>
                        {selectedBooking && (
                            <form onSubmit={handleAssignSubmit} className="space-y-4 py-2">
                                <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
                                    <div><span className="font-semibold">Customer:</span> {selectedBooking.customer?.name}</div>
                                    <div><span className="font-semibold">Requested Car Type:</span> {selectedBooking.car_type}</div>
                                    <div><span className="font-semibold">Tanggal Sewa:</span> {selectedBooking.booking_date}</div>
                                    {selectedBooking.return_date && (
                                        <div><span className="font-semibold">Tanggal Balik:</span> {selectedBooking.return_date}</div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="car_id">Assign Car Fleet</Label>
                                    <Select
                                        value={assignData.car_id}
                                        onValueChange={(val) => setAssignData('car_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a ready vehicle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Show currently assigned car even if it is not ready, plus all other ready cars */}
                                            {selectedBooking.car && (
                                                <SelectItem value={selectedBooking.car_id!.toString()}>
                                                    {selectedBooking.car.name} ({selectedBooking.car.plate_number}) - [Current]
                                                </SelectItem>
                                            )}
                                            {readyCars
                                                .filter(c => c.id !== selectedBooking.car_id)
                                                .map((c) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>
                                                        {c.name} ({c.plate_number})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="peluncur_id">Assign Peluncur Officer (Field delivery)</Label>
                                    <Select
                                        value={assignData.peluncur_id}
                                        onValueChange={(val) => setAssignData('peluncur_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Peluncur officer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {peluncurOfficers.map((p) => (
                                                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="assign_amount">Rental Price / Amount (Rp)</Label>
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
                                    <Label htmlFor="petugas_cuci_id">Assign Wash Officer (After return)</Label>
                                    <Select
                                        value={assignData.petugas_cuci_id}
                                        onValueChange={(val) => setAssignData('petugas_cuci_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Wash officer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {washOfficers.map((w) => (
                                                <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <DialogFooter className="pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={processingAssign}>Save Assignment</Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={washConfirmId !== null} onOpenChange={(open) => !open && setWashConfirmId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Complete Wash</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to mark car washing as completed and set this car's availability to Ready?
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setWashConfirmId(null)}>
                                Cancel
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
                                Complete Wash
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
                            <div className="space-y-1">
                                <Label htmlFor="edit_customer_id">Customer</Label>
                                <Select
                                    value={editData.customer_id}
                                    onValueChange={(val) => setEditData('customer_id', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="edit_car_type">Requested Car Type</Label>
                                <Input
                                    id="edit_car_type"
                                    value={editData.car_type}
                                    onChange={(e) => setEditData('car_type', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_booking_date">Rent Date</Label>
                                    <Input
                                        id="edit_booking_date"
                                        type="date"
                                        value={editData.booking_date}
                                        onChange={(e) => setEditData('booking_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit_return_date">Return Date</Label>
                                    <Input
                                        id="edit_return_date"
                                        type="date"
                                        value={editData.return_date}
                                        onChange={(e) => setEditData('return_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_payment_method">Payment Method</Label>
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
                                    <Label htmlFor="edit_payment_status">Payment Status</Label>
                                    <Select
                                        value={editData.payment_status}
                                        onValueChange={(val) => setEditData('payment_status', val)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Down Payment">Down Payment</SelectItem>
                                            <SelectItem value="Paid">Paid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="edit_amount">Rental Price (Rp)</Label>
                                    <Input
                                        id="edit_amount"
                                        type="number"
                                        min={0}
                                        value={editData.amount}
                                        onChange={(e) => setEditData('amount', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit_status">Booking Status</Label>
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
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={processingEdit}>Save Changes</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteBookingId !== null} onOpenChange={(open) => !open && setDeleteBookingId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Booking</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to delete this booking? This action cannot be undone.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteBookingId(null)}>
                                Cancel
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
                                Delete
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
            title: 'Bookings',
            href: bookingsIndex(),
        },
    ],
};
