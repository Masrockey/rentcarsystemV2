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
import { useState } from 'react';
import { Plus, Edit, Trash2, CreditCard } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { index as paymentsIndex } from '@/routes/payments';

type Payment = {
    id: number;
    invoice_number: string;
    booking_id: number;
    payment_method: string;
    dp_amount: string;
    settlement_amount: string;
    total_amount: string;
    status: string;
    transfer_proof: string | null;
    booking?: { booking_number: string | null; customer?: { name: string } };
};

type BookingOption = { id: number; booking_number: string | null; customer?: { name: string } };

type Props = { payments: Payment[]; bookings: BookingOption[] };

export default function PaymentsIndex({ payments, bookings }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        booking_id: '' as number | string,
        payment_method: 'Cash',
        dp_amount: 0,
        settlement_amount: 0,
        total_amount: 0,
        status: 'Pending',
        transfer_proof: null as File | null,
    });

    const openCreate = () => { setEditingPayment(null); reset(); clearErrors(); setIsOpen(true); };
    const openEdit = (p: Payment) => {
        setEditingPayment(p);
        clearErrors();
        setData({ booking_id: p.booking_id, payment_method: p.payment_method, dp_amount: parseFloat(p.dp_amount), settlement_amount: parseFloat(p.settlement_amount), total_amount: parseFloat(p.total_amount), status: p.status, transfer_proof: null });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = { forceFormData: true, onSuccess: () => { setIsOpen(false); reset(); } };
        if (editingPayment) {
            put(`/payments/${editingPayment.id}`, options);
        } else {
            post('/payments', options);
        }
    };

    const formatCurrency = (val: string | number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

    const statusColor = (s: string) => {
        if (s === 'Lunas') return 'bg-green-500/15 text-green-600 border-green-500/25';
        if (s === 'DP Dibayar') return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/25';
        return 'bg-neutral-500/15 text-neutral-500 border-neutral-500/25';
    };

    const availableBookings = editingPayment
        ? bookings.some((b) => b.id === editingPayment.booking_id)
            ? bookings
            : [
                ...(editingPayment.booking
                    ? [{ id: editingPayment.booking_id, booking_number: editingPayment.booking.booking_number, customer: editingPayment.booking.customer }]
                    : []),
                ...bookings,
            ]
        : bookings;

    return (
        <>
            <Head title="Payment Management" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Manajemen Pembayaran</h1>
                        <p className="text-muted-foreground">Kelola data pembayaran dan invoice.</p>
                    </div>
                    <Button onClick={openCreate} className="flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Tambah Pembayaran
                    </Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Daftar Pembayaran</CardTitle></CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3">Invoice</th>
                                        <th className="px-6 py-3">Booking / Customer</th>
                                        <th className="px-6 py-3">Metode</th>
                                        <th className="px-6 py-3">DP</th>
                                        <th className="px-6 py-3">Total</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {payments.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Belum ada data pembayaran.</td></tr>
                                    ) : payments.map((p) => (
                                        <tr key={p.id} className="hover:bg-muted/50">
                                            <td className="px-6 py-4 font-mono text-xs font-semibold">{p.invoice_number}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{p.booking?.booking_number ?? `#${p.booking_id}`}</div>
                                                <div className="text-xs text-muted-foreground">{p.booking?.customer?.name}</div>
                                            </td>
                                            <td className="px-6 py-4">{p.payment_method}</td>
                                            <td className="px-6 py-4">{formatCurrency(p.dp_amount)}</td>
                                            <td className="px-6 py-4 font-semibold">{formatCurrency(p.total_amount)}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={statusColor(p.status)}>{p.status}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{editingPayment ? 'Edit Pembayaran' : 'Tambah Pembayaran'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Booking</Label>
                                <SearchableSelect
                                    options={availableBookings.map((b) => ({
                                        value: String(b.id),
                                        label: `${b.booking_number ?? `#${b.id}`} — ${b.customer?.name ?? ''}`,
                                    }))}
                                    value={data.booking_id ? String(data.booking_id) : ''}
                                    onValueChange={(val) => setData('booking_id', Number(val))}
                                    placeholder="Pilih booking..."
                                    searchPlaceholder="Cari no. booking / nama customer..."
                                    emptyText="Booking tidak ditemukan."
                                />
                                {errors.booking_id && <p className="text-xs text-red-500">{errors.booking_id}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Metode Pembayaran</Label>
                                    <Select value={data.payment_method} onValueChange={val => setData('payment_method', val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Transfer">Transfer</SelectItem>
                                            <SelectItem value="DP">DP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={data.status} onValueChange={val => setData('status', val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="DP Dibayar">DP Dibayar</SelectItem>
                                            <SelectItem value="Lunas">Lunas</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>DP (Rp)</Label>
                                    <Input type="number" min={0} value={data.dp_amount} onChange={e => setData('dp_amount', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pelunasan (Rp)</Label>
                                    <Input type="number" min={0} value={data.settlement_amount} onChange={e => setData('settlement_amount', parseFloat(e.target.value))} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Total (Rp)</Label>
                                    <Input type="number" min={0} value={data.total_amount} onChange={e => setData('total_amount', parseFloat(e.target.value))} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Bukti Transfer</Label>
                                    <Input type="file" accept="image/*,.pdf" onChange={e => setData('transfer_proof', e.target.files?.[0] ?? null)} />
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processing}>{editingPayment ? 'Simpan' : 'Tambah'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground py-4">Yakin ingin menghapus data pembayaran ini?</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                            <Button variant="destructive" onClick={() => { if (deleteId) router.delete(`/payments/${deleteId}`, { onSuccess: () => setDeleteId(null) }); }}>Hapus</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

PaymentsIndex.layout = {
    breadcrumbs: [{ title: 'Payment Management', href: paymentsIndex() }],
};
