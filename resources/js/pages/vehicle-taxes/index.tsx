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
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { index as vehicleTaxesIndex } from '@/routes/vehicle-taxes';

type CarOption = { id: number; name: string; plate_number: string };
type VehicleTax = {
    id: number;
    car_id: number;
    stnk_number: string | null;
    valid_until: string;
    annual_tax: string;
    five_year_tax: string;
    reminder_date: string | null;
    notes: string | null;
    car?: CarOption;
};

type Props = { vehicleTaxes: VehicleTax[]; cars: CarOption[] };

export default function VehicleTaxesIndex({ vehicleTaxes, cars }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingTax, setEditingTax] = useState<VehicleTax | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        car_id: '' as number | string,
        stnk_number: '',
        valid_until: '',
        annual_tax: 0,
        five_year_tax: 0,
        reminder_date: '',
        notes: '',
    });

    const openCreate = () => { setEditingTax(null); reset(); clearErrors(); setIsOpen(true); };
    const openEdit = (t: VehicleTax) => {
        setEditingTax(t);
        clearErrors();
        setData({ car_id: t.car_id, stnk_number: t.stnk_number ?? '', valid_until: t.valid_until, annual_tax: parseFloat(t.annual_tax), five_year_tax: parseFloat(t.five_year_tax), reminder_date: t.reminder_date ?? '', notes: t.notes ?? '' });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTax) {
            put(`/vehicle-taxes/${editingTax.id}`, { onSuccess: () => { setIsOpen(false); reset(); } });
        } else {
            post('/vehicle-taxes', { onSuccess: () => { setIsOpen(false); reset(); } });
        }
    };

    const formatCurrency = (val: string | number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

    const getTaxStatus = (validUntil: string) => {
        const days = (new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (days < 0) return { label: 'Kadaluarsa', cls: 'bg-red-500/15 text-red-600 border-red-500/25' };
        if (days <= 30) return { label: 'Segera Habis', cls: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/25' };
        return { label: 'Aktif', cls: 'bg-green-500/15 text-green-600 border-green-500/25' };
    };

    const expiringSoon = vehicleTaxes.filter(t => {
        const days = (new Date(t.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 30;
    }).length;

    return (
        <>
            <Head title="Pajak / STNK" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Pajak / STNK</h1>
                        <p className="text-muted-foreground">Kelola data pajak kendaraan dan masa berlaku STNK.</p>
                    </div>
                    <Button onClick={openCreate} className="flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Tambah Data Pajak
                    </Button>
                </div>

                {expiringSoon > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                            <strong>{expiringSoon} kendaraan</strong> memiliki pajak/STNK yang akan habis dalam 30 hari ke depan.
                        </p>
                    </div>
                )}

                <Card>
                    <CardHeader><CardTitle>Daftar Pajak Kendaraan</CardTitle></CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3">Mobil</th>
                                        <th className="px-6 py-3">No. STNK</th>
                                        <th className="px-6 py-3">Berlaku Sampai</th>
                                        <th className="px-6 py-3">Pajak Tahunan</th>
                                        <th className="px-6 py-3">Pajak 5 Tahun</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {vehicleTaxes.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Belum ada data pajak.</td></tr>
                                    ) : vehicleTaxes.map((t) => {
                                        const status = getTaxStatus(t.valid_until);
                                        return (
                                            <tr key={t.id} className="hover:bg-muted/50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium">{t.car?.name}</div>
                                                    <div className="text-xs font-mono text-muted-foreground">{t.car?.plate_number}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs">{t.stnk_number ?? '-'}</td>
                                                <td className="px-6 py-4">{t.valid_until}</td>
                                                <td className="px-6 py-4">{formatCurrency(t.annual_tax)}</td>
                                                <td className="px-6 py-4">{formatCurrency(t.five_year_tax)}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={status.cls}>{status.label}</Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>{editingTax ? 'Edit Pajak' : 'Tambah Pajak Kendaraan'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Mobil</Label>
                                <Select value={String(data.car_id)} onValueChange={val => setData('car_id', Number(val))}>
                                    <SelectTrigger><SelectValue placeholder="Pilih mobil..." /></SelectTrigger>
                                    <SelectContent>{cars.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.plate_number}</SelectItem>)}</SelectContent>
                                </Select>
                                {errors.car_id && <p className="text-xs text-red-500">{errors.car_id}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label>Nomor STNK</Label>
                                    <Input value={data.stnk_number} onChange={e => setData('stnk_number', e.target.value)} placeholder="Nomor STNK" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Berlaku Sampai</Label>
                                    <Input type="date" value={data.valid_until} onChange={e => setData('valid_until', e.target.value)} required />
                                    {errors.valid_until && <p className="text-xs text-red-500">{errors.valid_until}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Tanggal Reminder</Label>
                                    <Input type="date" value={data.reminder_date} onChange={e => setData('reminder_date', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pajak Tahunan (Rp)</Label>
                                    <Input type="number" min={0} value={data.annual_tax} onChange={e => setData('annual_tax', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pajak 5 Tahun (Rp)</Label>
                                    <Input type="number" min={0} value={data.five_year_tax} onChange={e => setData('five_year_tax', parseFloat(e.target.value))} />
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processing}>{editingTax ? 'Simpan' : 'Tambah'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground py-4">Yakin ingin menghapus data pajak ini?</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                            <Button variant="destructive" onClick={() => { if (deleteId) router.delete(`/vehicle-taxes/${deleteId}`, { onSuccess: () => setDeleteId(null) }); }}>Hapus</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

VehicleTaxesIndex.layout = {
    breadcrumbs: [{ title: 'Pajak / STNK', href: vehicleTaxesIndex() }],
};
