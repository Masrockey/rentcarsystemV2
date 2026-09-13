import { Head, Link, usePoll } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { Search, RotateCcw, Car, Calendar, ClipboardCheck, AlertTriangle, ShieldCheck } from 'lucide-react';
import { index as returnsIndex } from '@/routes/returns';
import { checklist as bookingChecklist } from '@/routes/bookings';

import Pagination, { PaginatedData } from '@/components/pagination';

type Customer = {
    id: number;
    name: string;
    phone: string | null;
};

type CarItem = {
    id: number;
    name: string;
    plate_number: string;
    last_km?: number | null;
    status?: string;
};

type Booking = {
    id: number;
    booking_number: string;
    booking_date: string;
    return_date?: string | null;
    status: string;
    delivery_checklist?: Record<string, any> | null;
    return_checklist?: Record<string, any> | null;
    customer?: Customer | null;
    car?: CarItem | null;
    rental?: Rental | null;
};

type Rental = {
    id: number;
    booking_id: number;
    contract_number: string;
    checkout_datetime: string;
    checkin_datetime?: string | null;
    km_out: number;
    fuel_out: number;
    km_in?: number | null;
    fuel_in?: number | null;
    fine_amount: number;
    status: string;
    booking?: Booking | null;
    customer?: Customer | null;
    car?: CarItem | null;
};

type Props = {
    rentals: PaginatedData<Rental> | Rental[];
    totalOut?: number;
    pendingChecklist?: number;
    completedChecklist?: number;
    onTripBookings: Booking[];
};

export default function ReturnsIndex({
    rentals,
    totalOut: initialTotalOut,
    pendingChecklist: initialPendingChecklist,
    completedChecklist: initialCompletedChecklist,
    onTripBookings,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const rentalList = Array.isArray(rentals) ? rentals : (rentals?.data || []);

    // Auto-poll returns data every 10 seconds in the background
    usePoll(10000, {
        only: ['rentals', 'totalOut', 'pendingChecklist', 'completedChecklist', 'onTripBookings'],
    });

    // Filter active items that are out on trip
    const filteredRentals = rentalList.filter((rental) => {
        const query = searchQuery.toLowerCase();
        const contractNo = rental.contract_number.toLowerCase();
        const bookingNo = (rental.booking?.booking_number || '').toLowerCase();
        const customerName = (rental.customer?.name || rental.booking?.customer?.name || '').toLowerCase();
        const carName = (rental.car?.name || rental.booking?.car?.name || '').toLowerCase();
        const plate = (rental.car?.plate_number || rental.booking?.car?.plate_number || '').toLowerCase();

        return (
            contractNo.includes(query) ||
            bookingNo.includes(query) ||
            customerName.includes(query) ||
            carName.includes(query) ||
            plate.includes(query)
        );
    });

    // Stats
    const totalOut = initialTotalOut ?? rentalList.length;
    const pendingChecklist = initialPendingChecklist ?? rentalList.filter(
        (r) => !r.booking?.return_checklist || Object.keys(r.booking.return_checklist).length === 0
    ).length;
    const completedChecklist = initialCompletedChecklist ?? (totalOut - pendingChecklist);

    return (
        <>
            <Head title="Unit Kembali - Return Control" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
                            <RotateCcw className="h-7 w-7 text-amber-600" /> Unit Kembali (Pengembalian / Ambil Unit)
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Daftar kendaraan yang sudah diserahterimakan (Jalan) namun belum kembali dan perlu dikontrol checklist pengembaliannya.
                        </p>
                    </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="border-l-4 border-l-blue-500 shadow-2xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Unit Sedang Jalan</CardTitle>
                            <Car className="h-5 w-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalOut} Unit</div>
                            <p className="text-xs text-muted-foreground mt-1">Mobil sedang berada di tangan penyewa</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 shadow-2xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Belum Checklist Kembali</CardTitle>
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingChecklist} Unit</div>
                            <p className="text-xs text-muted-foreground mt-1">Membutuhkan inspeksi fisik ambil unit</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500 shadow-2xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Sudah Checklist Kembali</CardTitle>
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedChecklist} Unit</div>
                            <p className="text-xs text-muted-foreground mt-1">Checklist pengembalian telah lengkap</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Table Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <CardTitle className="text-base font-bold">Daftar Mobil Belum Kembali (Ambil Unit)</CardTitle>
                                <CardDescription>Klik tombol Checklist Kembali untuk melakukan inspeksi & pengembalian kendaraan.</CardDescription>
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Cari No Kontrak, Penyewa, Mobil..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-y">
                                    <tr>
                                        <th className="px-4 py-3">NO. KONTRAK / BOOKING</th>
                                        <th className="px-4 py-3">PENYEWA</th>
                                        <th className="px-4 py-3">KENDARAAN</th>
                                        <th className="px-4 py-3">CHECKOUT (SAAT JALAN)</th>
                                        <th className="px-4 py-3">CHECKLIST KEMBALI</th>
                                        <th className="px-4 py-3">STATUS</th>
                                        <th className="px-4 py-3 text-right">AKSI PENGEMBALIAN</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredRentals.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-muted-foreground">
                                                Tidak ada data unit yang sedang disewa atau belum kembali.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRentals.map((rental) => {
                                            const booking = rental.booking;
                                            const hasReturnChecklist =
                                                booking?.return_checklist && Object.keys(booking.return_checklist).length > 0;

                                            return (
                                                <tr key={rental.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/25 border-l-4 border-l-amber-500 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-medium">
                                                        <div className="font-bold text-foreground">{rental.contract_number}</div>
                                                        <div className="text-xs text-muted-foreground">{booking?.booking_number}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-semibold text-foreground">{rental.customer?.name || booking?.customer?.name || '-'}</div>
                                                        <div className="text-xs text-muted-foreground">{rental.customer?.phone || booking?.customer?.phone || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-semibold text-foreground">{rental.car?.name || booking?.car?.name || '-'}</div>
                                                        <div className="text-xs font-mono font-semibold text-muted-foreground">{rental.car?.plate_number || booking?.car?.plate_number || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        <div className="flex items-center gap-1.5 font-medium">
                                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {rental.checkout_datetime ? new Date(rental.checkout_datetime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1 font-mono text-muted-foreground">
                                                            <span>KM: {rental.km_out?.toLocaleString('id-ID')}</span>
                                                            <span>•</span>
                                                            <span>BBM: {rental.fuel_out}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {hasReturnChecklist ? (
                                                            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs">
                                                                ✓ Sudah Diisi
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                                                                ⚠️ Belum Diisi
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30">
                                                            {rental.status === 'Active' ? 'Sedang Jalan' : rental.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                                                        {booking && (
                                                            <>
                                                                <Link
                                                                    href={bookingChecklist({ booking: booking.id }).url + '?type=delivery'}
                                                                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 transition-colors"
                                                                    title="Lihat / Isi Checklist Serah Terima"
                                                                >
                                                                    <Car className="h-3.5 w-3.5" /> Serah Terima
                                                                </Link>

                                                                <Link
                                                                    href={bookingChecklist({ booking: booking.id }).url + '?type=return'}
                                                                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-colors ${
                                                                        hasReturnChecklist
                                                                            ? 'border-amber-500 text-amber-800 bg-amber-50 hover:bg-amber-500 hover:text-white dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-600'
                                                                            : 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600 shadow-xs'
                                                                    }`}
                                                                    title="Lihat / Isi Checklist Ambil Unit"
                                                                >
                                                                    <ClipboardCheck className="h-3.5 w-3.5" /> Ambil Unit
                                                                </Link>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination data={rentals} className="p-4 pt-2" />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ReturnsIndex.layout = {
    breadcrumbs: [{ title: 'Unit Kembali', href: returnsIndex() }],
};
