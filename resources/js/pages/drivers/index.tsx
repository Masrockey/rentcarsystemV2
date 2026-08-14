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
import { Plus, Edit, Trash2, Truck } from 'lucide-react';
import { index as driversIndex } from '@/routes/drivers';

type Driver = {
    id: number;
    name: string;
    phone: string | null;
    sim: string | null;
    address: string | null;
    status: 'Active' | 'Inactive';
    daily_rate: string;
};

type Props = { drivers: Driver[] };

export default function DriversIndex({ drivers }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        name: '',
        phone: '',
        sim: '',
        address: '',
        status: 'Active',
        daily_rate: 0,
    });

    const openCreate = () => { setEditingDriver(null); reset(); clearErrors(); setIsOpen(true); };
    const openEdit = (d: Driver) => {
        setEditingDriver(d);
        clearErrors();
        setData({ name: d.name, phone: d.phone ?? '', sim: d.sim ?? '', address: d.address ?? '', status: d.status, daily_rate: parseFloat(d.daily_rate) });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDriver) {
            put(`/drivers/${editingDriver.id}`, { onSuccess: () => { setIsOpen(false); reset(); } });
        } else {
            post('/drivers', { onSuccess: () => { setIsOpen(false); reset(); } });
        }
    };

    const formatCurrency = (val: string | number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

    return (
        <>
            <Head title="Manajemen Driver" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">Manajemen Driver</h1>
                        <p className="text-muted-foreground">Kelola data driver / pengemudi armada.</p>
                    </div>
                    <Button onClick={openCreate} className="flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Tambah Driver
                    </Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Daftar Driver</CardTitle></CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3">Nama</th>
                                        <th className="px-6 py-3">No. HP</th>
                                        <th className="px-6 py-3">No. SIM</th>
                                        <th className="px-6 py-3">Tarif Harian</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {drivers.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Belum ada driver.</td></tr>
                                    ) : drivers.map((d) => (
                                        <tr key={d.id} className="hover:bg-muted/50">
                                            <td className="px-6 py-4 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15">
                                                        <Truck className="h-4 w-4 text-blue-500" />
                                                    </div>
                                                    {d.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{d.phone ?? '-'}</td>
                                            <td className="px-6 py-4 font-mono">{d.sim ?? '-'}</td>
                                            <td className="px-6 py-4 font-semibold">{formatCurrency(d.daily_rate)}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={d.status === 'Active' ? 'bg-green-500/15 text-green-600 border-green-500/25' : 'bg-red-500/15 text-red-600 border-red-500/25'}>
                                                    {d.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(d.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Create / Edit Dialog */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingDriver ? 'Edit Driver' : 'Tambah Driver'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="name">Nama Lengkap</Label>
                                    <Input id="name" value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. Budi Santoso" required />
                                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">No. HP</Label>
                                    <Input id="phone" value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
                                    {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sim">No. SIM</Label>
                                    <Input id="sim" value={data.sim} onChange={e => setData('sim', e.target.value)} placeholder="A1234567" />
                                    {errors.sim && <p className="text-xs text-red-500">{errors.sim}</p>}
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="address">Alamat</Label>
                                    <Input id="address" value={data.address} onChange={e => setData('address', e.target.value)} placeholder="Alamat lengkap" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="daily_rate">Tarif Harian (Rp)</Label>
                                    <Input id="daily_rate" type="number" min={0} value={data.daily_rate} onChange={e => setData('daily_rate', parseFloat(e.target.value))} />
                                    {errors.daily_rate && <p className="text-xs text-red-500">{errors.daily_rate}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={data.status} onValueChange={val => setData('status', val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processing}>{editingDriver ? 'Simpan' : 'Tambah'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Dialog */}
                <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground py-4">Yakin ingin menghapus driver ini?</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                            <Button variant="destructive" onClick={() => { if (deleteId) { router.delete(`/drivers/${deleteId}`, { onSuccess: () => setDeleteId(null) }); } }}>Hapus</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

DriversIndex.layout = {
    breadcrumbs: [{ title: 'Manajemen Driver', href: driversIndex() }],
};
