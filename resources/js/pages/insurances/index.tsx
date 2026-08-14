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
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { index as insurancesIndex } from '@/routes/insurances';

type CarOption = { id: number; name: string; plate_number: string };
type Insurance = {
    id: number;
    car_id: number;
    insurance_name: string;
    policy_number: string;
    start_date: string;
    end_date: string;
    premium: string;
    notes: string | null;
    car?: CarOption;
};

type Props = { insurances: Insurance[]; cars: CarOption[] };

export default function InsurancesIndex({ insurances, cars }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingIns, setEditingIns] = useState<Insurance | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        car_id: '' as number | string,
        insurance_name: '',
        policy_number: '',
        start_date: '',
        end_date: '',
        premium: 0,
        notes: '',
    });

    const openCreate = () => { setEditingIns(null); reset(); clearErrors(); setIsOpen(true); };
    const openEdit = (ins: Insurance) => {
        setEditingIns(ins);
        clearErrors();
        setData({ car_id: ins.car_id, insurance_name: ins.insurance_name, policy_number: ins.policy_number, start_date: ins.start_date, end_date: ins.end_date, premium: parseFloat(ins.premium), notes: ins.notes ?? '' });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingIns) {
            put(`/insurances/${editingIns.id}`, { onSuccess: () => { setIsOpen(false); reset(); } });
        } else {
            post('/insurances', { onSuccess: () => { setIsOpen(false); reset(); } });
        }
    };

    const formatCurrency = (val: string | number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

    const isExpiringSoon = (endDate: string) => {
        const days = (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return days <= 30 && days >= 0;
    };

    const isExpired = (endDate: string) => new Date(endDate) < new Date();

    return (
        <>
            <Head title="Asuransi Mobil" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Manajemen Asuransi</h1>
                        <p className="text-muted-foreground">Kelola data asuransi kendaraan armada.</p>
                    </div>
                    <Button onClick={openCreate} className="flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Tambah Asuransi
                    </Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Daftar Asuransi</CardTitle></CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3">Mobil</th>
                                        <th className="px-6 py-3">Nama Asuransi</th>
                                        <th className="px-6 py-3">No. Polis</th>
                                        <th className="px-6 py-3">Berlaku</th>
                                        <th className="px-6 py-3">Berakhir</th>
                                        <th className="px-6 py-3">Premi</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {insurances.length === 0 ? (
                                        <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Belum ada data asuransi.</td></tr>
                                    ) : insurances.map((ins) => (
                                        <tr key={ins.id} className="hover:bg-muted/50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{ins.car?.name}</div>
                                                <div className="text-xs font-mono text-muted-foreground">{ins.car?.plate_number}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium">{ins.insurance_name}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{ins.policy_number}</td>
                                            <td className="px-6 py-4">{ins.start_date}</td>
                                            <td className="px-6 py-4">{ins.end_date}</td>
                                            <td className="px-6 py-4">{formatCurrency(ins.premium)}</td>
                                            <td className="px-6 py-4">
                                                {isExpired(ins.end_date) ? (
                                                    <Badge variant="outline" className="bg-red-500/15 text-red-600 border-red-500/25">Kadaluarsa</Badge>
                                                ) : isExpiringSoon(ins.end_date) ? (
                                                    <Badge variant="outline" className="bg-yellow-500/15 text-yellow-600 border-yellow-500/25">Segera Habis</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-green-500/15 text-green-600 border-green-500/25">Aktif</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(ins)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(ins.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>{editingIns ? 'Edit Asuransi' : 'Tambah Asuransi'}</DialogTitle></DialogHeader>
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
                                    <Label>Nama Asuransi</Label>
                                    <Input value={data.insurance_name} onChange={e => setData('insurance_name', e.target.value)} placeholder="e.g. Jasa Raharja" required />
                                    {errors.insurance_name && <p className="text-xs text-red-500">{errors.insurance_name}</p>}
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Nomor Polis</Label>
                                    <Input value={data.policy_number} onChange={e => setData('policy_number', e.target.value)} placeholder="Nomor polis asuransi" required />
                                    {errors.policy_number && <p className="text-xs text-red-500">{errors.policy_number}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Mulai Berlaku</Label>
                                    <Input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Berakhir</Label>
                                    <Input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} required />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Premi (Rp)</Label>
                                    <Input type="number" min={0} value={data.premium} onChange={e => setData('premium', parseFloat(e.target.value))} />
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processing}>{editingIns ? 'Simpan' : 'Tambah'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground py-4">Yakin ingin menghapus data asuransi ini?</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                            <Button variant="destructive" onClick={() => { if (deleteId) router.delete(`/insurances/${deleteId}`, { onSuccess: () => setDeleteId(null) }); }}>Hapus</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

InsurancesIndex.layout = {
    breadcrumbs: [{ title: 'Asuransi Mobil', href: insurancesIndex() }],
};
