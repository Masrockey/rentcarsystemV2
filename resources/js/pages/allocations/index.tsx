import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useState } from 'react';
import { Search, Settings, AlertTriangle, CheckCircle2, Car, UserCheck, KeyRound } from 'lucide-react';
import { index as allocationsIndex } from '@/routes/allocations';

type CarRef = { id: number; name: string; plate_number: string; daily_price?: string };
type DriverRef = { id: number; name: string; phone?: string | null; daily_rate?: string };
type UserRef = { id: number; name: string };
type CustomerRef = { id: number; name: string; phone?: string | null };

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
    bookings: Booking[];
    readyCars: CarRef[];
    readyDrivers: DriverRef[];
    peluncurOfficers: UserRef[];
    washOfficers: UserRef[];
    unallocatedCount: number;
    allocatedCount: number;
};

export default function AllocationsIndex({
    bookings,
    readyCars,
    readyDrivers,
    peluncurOfficers,
    washOfficers,
    unallocatedCount,
    allocatedCount,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'unallocated' | 'allocated'>('all');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isAllocateOpen, setIsAllocateOpen] = useState(false);

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

    const filteredBookings = bookings.filter((b) => {
        const matchesSearch =
            (b.customer?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.booking_number ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.car_type.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (activeFilter === 'unallocated') return b.car_id === null;
        if (activeFilter === 'allocated') return b.car_id !== null;
        return true;
    });

    return (
        <>
            <Head title="Alokasi Mobil & Staf" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">Alokasi Mobil & Staf</h1>
                        <p className="text-muted-foreground">Kelola penugasan armada mobil, supir, peluncur, dan petugas cuci untuk pesanan sewa.</p>
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
                            <div className="text-2xl font-bold">{bookings.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Keseluruhan pesanan sewa</p>
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
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{unallocatedCount}</div>
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
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{allocatedCount}</div>
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
                                    Semua ({bookings.length})
                                </Button>
                                <Button
                                    variant={activeFilter === 'unallocated' ? 'destructive' : 'ghost'}
                                    size="sm"
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setActiveFilter('unallocated')}
                                >
                                    ⚠️ Belum Dialokasi ({unallocatedCount})
                                </Button>
                                <Button
                                    variant={activeFilter === 'allocated' ? 'default' : 'ghost'}
                                    size="sm"
                                    className={`h-7 text-xs px-2.5 ${activeFilter === 'allocated' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                    onClick={() => setActiveFilter('allocated')}
                                >
                                    ✓ Dialokasi ({allocatedCount})
                                </Button>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Cari pelanggan / no. booking..."
                                    className="pl-8 h-9 text-xs"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
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
                                                <span className="font-semibold text-foreground">Staf:</span> Supir: {b.driver?.name ?? '-'}, Peluncur: {b.peluncur?.name ?? '-'}, Cuci: {b.petugas_cuci?.name ?? '-'}
                                            </div>
                                        </div>
                                        <div className="flex justify-end pt-2 border-t mt-1">
                                            <Button
                                                size="sm"
                                                onClick={() => openAllocateDialog(b)}
                                                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold"
                                            >
                                                <Settings className="h-3.5 w-3.5" /> Alokasi Mobil & Staf
                                            </Button>
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
                                        <th className="px-4 py-3">Pelanggan & Booking</th>
                                        <th className="px-4 py-3">Tipe Mobil Dipesan</th>
                                        <th className="px-4 py-3">Armada Mobil Alokasi</th>
                                        <th className="px-4 py-3">Tanggal & Jam Sewa</th>
                                        <th className="px-4 py-3">Penugasan Staf</th>
                                        <th className="px-4 py-3">Harga Sewa</th>
                                        <th className="px-4 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredBookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
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
                                                <td className="px-4 py-4 font-semibold text-xs">{formatCurrency(b.amount)}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openAllocateDialog(b)}
                                                        className="font-semibold text-xs flex items-center gap-1.5 ml-auto"
                                                    >
                                                        <Settings className="h-3.5 w-3.5" /> Alokasi
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

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
