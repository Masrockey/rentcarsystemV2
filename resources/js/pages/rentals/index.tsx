import { Head, Link, router, useForm } from '@inertiajs/react';
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
import { useState } from 'react';
import { Plus, Edit, Trash2, ClipboardList, Fuel, Gauge, Car, Send } from 'lucide-react';
import { index as rentalsIndex } from '@/routes/rentals';

type CarOption = { id: number; name: string; plate_number: string };
type CustomerOption = { id: number; name: string };
type OfficerOption = { id: number; name: string };
type BookingOption = {
    id: number;
    booking_number: string | null;
    customer_id: number;
    car_id: number | null;
    car_type: string | null;
    booking_date: string | null;
    return_date: string | null;
    customer?: CustomerOption;
};

type Rental = {
    id: number;
    contract_number: string;
    booking_id: number;
    car_id: number;
    customer_id: number;
    officer_id: number;
    checkout_datetime: string | null;
    checkin_datetime: string | null;
    handover_location: string | null;
    km_out: number;
    fuel_out: number;
    km_in: number | null;
    fuel_in: number | null;
    fine_amount: string;
    total_payment: string;
    status: string;
    car?: CarOption;
    customer?: CustomerOption;
    officer?: OfficerOption;
};

const getCurrentDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getCurrentTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

type Props = {
    rentals: Rental[];
    confirmedBookings?: any[];
    bookings: BookingOption[];
    cars: CarOption[];
    customers: CustomerOption[];
    officers: OfficerOption[];
};

export default function RentalsIndex({ rentals, confirmedBookings = [], bookings, cars, customers, officers }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [washBookingId, setWashBookingId] = useState<number | null>(null);
    const [editingRental, setEditingRental] = useState<Rental | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, setData, post, put, reset, processing, errors, clearErrors, transform } = useForm({
        booking_id: '' as number | string,
        car_id: '' as number | string,
        customer_id: '' as number | string,
        officer_id: '' as number | string,
        checkout_date: '',
        checkout_time: '09:00',
        checkin_date: '',
        checkin_time: '09:00',
        checkout_datetime: '',
        checkin_datetime: '',
        handover_location: '',
        km_out: 0,
        fuel_out: 100,
        km_in: '' as number | string,
        fuel_in: '' as number | string,
        fine_amount: 0,
        total_payment: 0,
        status: 'Active',
        tenant_signature: '',
        officer_signature: '',
    });

    const openCreate = () => {
        setEditingRental(null);
        reset();
        clearErrors();
        setData({
            booking_id: '' as number | string,
            car_id: '' as number | string,
            customer_id: '' as number | string,
            officer_id: '' as number | string,
            checkout_date: getCurrentDate(),
            checkout_time: getCurrentTime(),
            checkin_date: '',
            checkin_time: '',
            checkout_datetime: '',
            checkin_datetime: '',
            handover_location: '',
            km_out: 0,
            fuel_out: 100,
            km_in: '',
            fuel_in: '',
            fine_amount: 0,
            total_payment: 0,
            status: 'Active',
            tenant_signature: '',
            officer_signature: '',
        });
        setIsOpen(true);
    };
    const openReturn = (r: Rental) => {
        setEditingRental(r);
        clearErrors();
        setData({
            booking_id: r.booking_id,
            car_id: r.car_id,
            customer_id: r.customer_id,
            officer_id: r.officer_id,
            checkout_date: r.checkout_datetime ? r.checkout_datetime.substring(0, 10) : '',
            checkout_time: r.checkout_datetime ? r.checkout_datetime.substring(11, 16) : '',
            checkin_date: getCurrentDate(),
            checkin_time: getCurrentTime(),
            checkout_datetime: r.checkout_datetime ?? '',
            checkin_datetime: '',
            handover_location: r.handover_location ?? '',
            km_out: r.km_out,
            fuel_out: r.fuel_out,
            km_in: r.km_in ?? '',
            fuel_in: r.fuel_in ?? '100',
            fine_amount: r.fine_amount ? parseFloat(r.fine_amount) : 0,
            total_payment: r.total_payment ? parseFloat(r.total_payment) : 0,
            status: 'Returned',
            tenant_signature: '',
            officer_signature: '',
        });
        setIsReturnOpen(true);
    };
    const openEdit = (r: Rental) => {
        setEditingRental(r);
        clearErrors();
        
        let checkout_date = '';
        let checkout_time = '09:00';
        if (r.checkout_datetime) {
            checkout_date = r.checkout_datetime.substring(0, 10);
            checkout_time = r.checkout_datetime.substring(11, 16);
        }

        let checkin_date = '';
        let checkin_time = '09:00';
        if (r.checkin_datetime) {
            checkin_date = r.checkin_datetime.substring(0, 10);
            checkin_time = r.checkin_datetime.substring(11, 16);
        }

        setData({
            booking_id: r.booking_id, car_id: r.car_id, customer_id: r.customer_id, officer_id: r.officer_id,
            checkout_date, checkout_time,
            checkin_date, checkin_time,
            handover_location: r.handover_location ?? '',
            km_out: r.km_out, fuel_out: r.fuel_out,
            km_in: r.km_in ?? '', fuel_in: r.fuel_in ?? '',
            fine_amount: parseFloat(r.fine_amount), total_payment: parseFloat(r.total_payment),
            status: r.status, tenant_signature: '', officer_signature: '',
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((data) => ({
            ...data,
            checkout_datetime: data.checkout_date && data.checkout_time ? `${data.checkout_date} ${data.checkout_time}:00` : null,
            checkin_datetime: data.checkin_date && data.checkin_time ? `${data.checkin_date} ${data.checkin_time}:00` : null,
            km_in: data.km_in === '' ? null : data.km_in,
            fuel_in: data.fuel_in === '' ? null : data.fuel_in,
        }));

        if (editingRental) {
            put(`/rentals/${editingRental.id}`, {
                onSuccess: () => {
                    setIsOpen(false);
                    setIsReturnOpen(false);
                    reset();
                },
            });
        } else {
            post('/rentals', {
                onSuccess: () => {
                    setIsOpen(false);
                    setIsReturnOpen(false);
                    reset();
                },
            });
        }
    };

    const handleWash = (bookingId: number) => {
        setWashBookingId(bookingId);
    };

    const formatCurrency = (val: string | number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

    const statusColor = (s: string) => {
        if (s === 'Active') return 'bg-blue-500/15 text-blue-600 border-blue-500/25';
        if (s === 'Returned') return 'bg-amber-500/15 text-amber-600 border-amber-500/25';
        if (s === 'Completed') return 'bg-green-500/15 text-green-600 border-green-500/25';
        return 'bg-red-500/15 text-red-600 border-red-500/25';
    };

    return (
        <>
            <Head title="Serah Terima" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Data Serah Terima</h1>
                        <p className="text-muted-foreground">Kelola penyerahan kendaraan & pengembalian ke penyewa.</p>
                    </div>
                    <Button onClick={openCreate} className="flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Buat Kontrak Manual
                    </Button>
                </div>

                {/* CONFIRMED BOOKINGS READY FOR HANDOVER */}
                <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Car className="h-5 w-5 text-blue-600" />
                            Booking Siap Serah Terima (Pending Handover)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {confirmedBookings.length === 0 ? (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                                Tidak ada booking dengan status Confirmed yang menunggu serah terima.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {confirmedBookings.map((b: any) => (
                                    <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border bg-background shadow-xs">
                                        <div className="space-y-1 text-xs">
                                            <div className="font-semibold text-sm text-foreground">{b.customer?.name}</div>
                                            <div className="font-medium text-blue-600">{b.car ? `${b.car.name} (${b.car.plate_number})` : b.car_type}</div>
                                            <div className="text-muted-foreground">Tanggal: {b.booking_date} {b.return_date ? `s/d ${b.return_date}` : ''}</div>
                                        </div>
                                        <Link href={`/bookings/${b.id}/checklist`}>
                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-xs font-semibold">
                                                <Send className="h-3.5 w-3.5" /> Deliver Car (Serah Terima)
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Daftar Kontrak Serah Terima</CardTitle></CardHeader>
                    <CardContent>
                        {/* Mobile Cards View */}
                        <div className="space-y-3 md:hidden">
                            {rentals.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    Belum ada data serah terima.
                                </div>
                            ) : (
                                rentals.map((r) => (
                                    <div key={r.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card text-card-foreground shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs font-semibold">{r.contract_number}</span>
                                            <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div><span className="font-semibold text-foreground">Penyewa:</span> {r.customer?.name}</div>
                                            <div><span className="font-semibold text-foreground">Kendaraan:</span> {r.car?.name} ({r.car?.plate_number})</div>
                                            <div><span className="font-semibold text-foreground">Checkout:</span> {r.checkout_datetime?.replace('T', ' ') ?? '-'}</div>
                                            <div>
                                                <span className="font-semibold text-foreground">KM / BBM Keluar:</span> {r.km_out.toLocaleString('id-ID')} km | {r.fuel_out}%
                                            </div>
                                            <div>
                                                <span className="font-semibold text-foreground">KM / BBM Masuk:</span> {r.km_in !== null ? `${r.km_in?.toLocaleString('id-ID')} km | ${r.fuel_in}%` : <span className="italic text-muted-foreground">Belum kembali</span>}
                                            </div>
                                            <div><span className="font-semibold text-foreground">Total Bayar:</span> {formatCurrency(r.total_payment)}</div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2 border-t mt-1">
                                            {r.status === 'Active' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white h-8 text-xs font-semibold px-2.5"
                                                    onClick={() => openReturn(r)}
                                                >
                                                    Unit Kembali
                                                </Button>
                                            )}
                                            {r.booking_id && r.status === 'Returned' && (
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs font-semibold px-2.5"
                                                    onClick={() => handleWash(r.booking_id)}
                                                >
                                                    Selesai Cuci
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4" /></Button>
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
                                        <th className="px-6 py-3">No. Kontrak</th>
                                        <th className="px-6 py-3">Penyewa</th>
                                        <th className="px-6 py-3">Kendaraan</th>
                                        <th className="px-6 py-3">Checkout</th>
                                        <th className="px-6 py-3">KM / BBM Keluar</th>
                                        <th className="px-6 py-3">KM / BBM Masuk</th>
                                        <th className="px-6 py-3">Total Bayar</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {rentals.length === 0 ? (
                                        <tr><td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">Belum ada data serah terima.</td></tr>
                                    ) : rentals.map((r) => (
                                        <tr key={r.id} className="hover:bg-muted/50">
                                            <td className="px-6 py-4 font-mono text-xs font-semibold">{r.contract_number}</td>
                                            <td className="px-6 py-4 font-medium">{r.customer?.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{r.car?.name}</div>
                                                <div className="text-xs font-mono text-muted-foreground">{r.car?.plate_number}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs">{r.checkout_datetime?.replace('T', ' ') ?? '-'}</td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="flex items-center gap-1"><Gauge className="h-3 w-3" /> {r.km_out.toLocaleString('id-ID')} km</div>
                                                <div className="flex items-center gap-1"><Fuel className="h-3 w-3" /> {r.fuel_out}%</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                {r.km_in !== null ? (
                                                    <>
                                                        <div className="flex items-center gap-1"><Gauge className="h-3 w-3" /> {r.km_in?.toLocaleString('id-ID')} km</div>
                                                        <div className="flex items-center gap-1"><Fuel className="h-3 w-3" /> {r.fuel_in}%</div>
                                                    </>
                                                ) : <span className="text-muted-foreground">Belum kembali</span>}
                                            </td>
                                            <td className="px-6 py-4 font-semibold">{formatCurrency(r.total_payment)}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                {r.status === 'Active' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white h-8 text-xs font-semibold px-2.5"
                                                        onClick={() => openReturn(r)}
                                                    >
                                                        Unit Kembali
                                                    </Button>
                                                )}
                                                {r.booking_id && r.status === 'Returned' && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs font-semibold px-2.5"
                                                        onClick={() => handleWash(r.booking_id)}
                                                    >
                                                        Selesai Cuci
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingRental ? 'Edit Serah Terima' : 'Buat Kontrak Serah Terima'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Booking</Label>
                                    <SearchableSelect
                                        options={bookings.map(b => ({
                                            value: String(b.id),
                                            label: `${b.booking_number ?? `#${b.id}`} — ${b.customer?.name ?? 'Customer'}`,
                                            sublabel: b.car_type ? `Mobil: ${b.car_type}` : undefined,
                                        }))}
                                        value={String(data.booking_id)}
                                        onValueChange={(val) => {
                                            const bookingId = Number(val);
                                            const selected = bookings.find(b => b.id === bookingId);
                                            if (selected) {
                                                let matchedCarId = selected.car_id;
                                                if (!matchedCarId && selected.car_type) {
                                                    const matchedCar = cars.find(c => c.name.toLowerCase().includes(selected.car_type!.toLowerCase()));
                                                    if (matchedCar) {
                                                        matchedCarId = matchedCar.id;
                                                    }
                                                }
                                                setData({
                                                    ...data,
                                                    booking_id: bookingId,
                                                    customer_id: selected.customer_id,
                                                    car_id: matchedCarId ? matchedCarId : '',
                                                });
                                            } else {
                                                setData('booking_id', bookingId);
                                            }
                                        }}
                                        placeholder="Pilih booking..."
                                        searchPlaceholder="Cari no. booking / nama customer..."
                                        emptyText="Booking tidak ditemukan."
                                    />
                                    {errors.booking_id && <p className="text-xs text-red-500">{errors.booking_id}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Kendaraan</Label>
                                    <SearchableSelect
                                        options={cars.map(c => ({
                                            value: String(c.id),
                                            label: `${c.name} — ${c.plate_number}`,
                                        }))}
                                        value={String(data.car_id)}
                                        onValueChange={val => setData('car_id', Number(val))}
                                        placeholder="Pilih mobil..."
                                        searchPlaceholder="Cari nama mobil / no. polisi..."
                                        emptyText="Mobil tidak ditemukan."
                                    />
                                    {errors.car_id && <p className="text-xs text-red-500">{errors.car_id}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Penyewa</Label>
                                    <SearchableSelect
                                        options={customers.map(c => ({
                                            value: String(c.id),
                                            label: c.name,
                                        }))}
                                        value={String(data.customer_id)}
                                        onValueChange={val => setData('customer_id', Number(val))}
                                        placeholder="Pilih customer..."
                                        searchPlaceholder="Cari customer..."
                                        emptyText="Customer tidak ditemukan."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Petugas</Label>
                                    <SearchableSelect
                                        options={officers.map(o => ({
                                            value: String(o.id),
                                            label: o.name,
                                        }))}
                                        value={String(data.officer_id)}
                                        onValueChange={val => setData('officer_id', Number(val))}
                                        placeholder="Pilih petugas..."
                                        searchPlaceholder="Cari petugas..."
                                        emptyText="Petugas tidak ditemukan."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tanggal Keluar</Label>
                                    <Input type="date" value={data.checkout_date} onChange={e => setData('checkout_date', e.target.value)} required />
                                    {errors.checkout_datetime && <p className="text-xs text-red-500">{errors.checkout_datetime}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Jam Keluar</Label>
                                    <Input type="time" value={data.checkout_time} onChange={e => setData('checkout_time', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tanggal Kembali</Label>
                                    <Input type="date" value={data.checkin_date} onChange={e => setData('checkin_date', e.target.value)} />
                                    {errors.checkin_datetime && <p className="text-xs text-red-500">{errors.checkin_datetime}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Jam Kembali</Label>
                                    <Input type="time" value={data.checkin_time} onChange={e => setData('checkin_time', e.target.value)} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Lokasi Serah Terima</Label>
                                    <Input value={data.handover_location} onChange={e => setData('handover_location', e.target.value)} placeholder="Lokasi penyerahan kendaraan" />
                                </div>
                                <div className="space-y-2">
                                    <Label>KM Keluar</Label>
                                    <Input type="number" min={0} value={data.km_out} onChange={e => setData('km_out', parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>BBM Keluar (%)</Label>
                                    <Input type="number" min={0} max={100} value={data.fuel_out} onChange={e => setData('fuel_out', parseInt(e.target.value))} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Total Bayar (Rp)</Label>
                                    <Input type="number" min={0} value={data.total_payment} onChange={e => setData('total_payment', parseFloat(e.target.value))} />
                                    {errors.total_payment && <p className="text-xs text-red-500">{errors.total_payment}</p>}
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processing}>{editingRental ? 'Simpan' : 'Buat Kontrak'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground py-4">Yakin ingin menghapus kontrak serah terima ini?</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                            <Button variant="destructive" onClick={() => { if (deleteId) router.delete(`/rentals/${deleteId}`, { onSuccess: () => setDeleteId(null) }); }}>Hapus</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Pengembalian Kendaraan (Unit Kembali)</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
                                <div><span className="font-semibold">No. Kontrak:</span> {editingRental?.contract_number}</div>
                                <div><span className="font-semibold">Penyewa:</span> {editingRental?.customer?.name}</div>
                                <div><span className="font-semibold">Kendaraan:</span> {editingRental?.car?.name} ({editingRental?.car?.plate_number})</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tanggal Kembali</Label>
                                    <Input type="date" value={data.checkin_date} onChange={e => setData('checkin_date', e.target.value)} required />
                                    {(errors as any).checkin_datetime && <p className="text-xs text-red-500">{(errors as any).checkin_datetime}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Jam Kembali</Label>
                                    <Input type="time" value={data.checkin_time} onChange={e => setData('checkin_time', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>KM Masuk</Label>
                                    <Input type="number" min={0} value={data.km_in} onChange={e => setData('km_in', e.target.value ? parseInt(e.target.value) : '')} placeholder="KM saat kembali" required />
                                    {errors.km_in && <p className="text-xs text-red-500">{errors.km_in}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>BBM Masuk (%)</Label>
                                    <Input type="number" min={0} max={100} value={data.fuel_in} onChange={e => setData('fuel_in', e.target.value ? parseInt(e.target.value) : '')} required />
                                    {errors.fuel_in && <p className="text-xs text-red-500">{errors.fuel_in}</p>}
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Denda (Rp)</Label>
                                    <Input type="number" min={0} value={data.fine_amount} onChange={e => setData('fine_amount', parseFloat(e.target.value))} />
                                    {errors.fine_amount && <p className="text-xs text-red-500">{errors.fine_amount}</p>}
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Status</Label>
                                    <Select value={data.status} onValueChange={val => setData('status', val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Returned">Returned</SelectItem>
                                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsReturnOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processing}>Simpan Pengembalian</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* CONFIRM WASH DIALOG */}
                <Dialog open={washBookingId !== null} onOpenChange={(open) => !open && setWashBookingId(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Konfirmasi Pencucian Selesai</DialogTitle>
                            <DialogDescription>
                                Apakah Anda yakin proses pencucian armada mobil ini telah selesai? Status armada kendaraan akan otomatis berubah menjadi <strong className="text-foreground font-semibold">Ready</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0 pt-4">
                            <Button variant="outline" onClick={() => setWashBookingId(null)}>
                                Batal
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                    if (washBookingId) {
                                        router.post(`/bookings/${washBookingId}/wash`, {}, {
                                            onSuccess: () => setWashBookingId(null),
                                        });
                                    }
                                }}
                            >
                                Selesai Cuci (Set Ready)
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

RentalsIndex.layout = {
    breadcrumbs: [{ title: 'Serah Terima', href: rentalsIndex() }],
};
