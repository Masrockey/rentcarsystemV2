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
import { useState } from 'react';
import { Plus, Edit, Trash2, Wrench } from 'lucide-react';
import { index as servicesIndex } from '@/routes/services';

type CarOption = { id: number; name: string; plate_number: string };
type ServiceRecord = {
    id: number;
    car_id: number;
    service_date: string;
    workshop: string | null;
    service_type: string;
    km: number;
    cost: string;
    next_service_date: string | null;
    notes: string | null;
    car?: CarOption;
};

type Props = { services: ServiceRecord[]; cars: CarOption[] };

export default function ServicesIndex({ services, cars }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        car_id: '' as number | string,
        service_date: new Date().toISOString().split('T')[0],
        workshop: '',
        service_type: '',
        km: 0,
        cost: 0,
        next_service_date: '',
        notes: '',
    });

    const openCreate = () => { setEditingService(null); reset(); clearErrors(); setIsOpen(true); };
    const openEdit = (s: ServiceRecord) => {
        setEditingService(s);
        clearErrors();
        setData({ car_id: s.car_id, service_date: s.service_date, workshop: s.workshop ?? '', service_type: s.service_type, km: s.km, cost: parseFloat(s.cost), next_service_date: s.next_service_date ?? '', notes: s.notes ?? '' });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingService) {
            put(`/services/${editingService.id}`, { onSuccess: () => { setIsOpen(false); reset(); } });
        } else {
            post('/services', { onSuccess: () => { setIsOpen(false); reset(); } });
        }
    };

    const formatCurrency = (val: string | number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

    return (
        <>
            <Head title="Servis Mobil" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Riwayat Service</h1>
                        <p className="text-muted-foreground">Kelola riwayat perawatan dan servis kendaraan.</p>
                    </div>
                    <Button onClick={openCreate} className="flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Tambah Record Service
                    </Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Daftar Service</CardTitle></CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3">Mobil</th>
                                        <th className="px-6 py-3">Tgl Service</th>
                                        <th className="px-6 py-3">Jenis Service</th>
                                        <th className="px-6 py-3">Bengkel</th>
                                        <th className="px-6 py-3">KM</th>
                                        <th className="px-6 py-3">Biaya</th>
                                        <th className="px-6 py-3">Service Berikutnya</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {services.length === 0 ? (
                                        <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Belum ada riwayat service.</td></tr>
                                    ) : services.map((s) => (
                                        <tr key={s.id} className="hover:bg-muted/50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{s.car?.name}</div>
                                                <div className="text-xs font-mono text-muted-foreground">{s.car?.plate_number}</div>
                                            </td>
                                            <td className="px-6 py-4">{s.service_date}</td>
                                            <td className="px-6 py-4">{s.service_type}</td>
                                            <td className="px-6 py-4">{s.workshop ?? '-'}</td>
                                            <td className="px-6 py-4">{s.km.toLocaleString('id-ID')} km</td>
                                            <td className="px-6 py-4 font-semibold">{formatCurrency(s.cost)}</td>
                                            <td className="px-6 py-4">{s.next_service_date ?? '-'}</td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4" /></Button>
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
                        <DialogHeader><DialogTitle>{editingService ? 'Edit Service' : 'Tambah Service'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Mobil</Label>
                                <Select value={String(data.car_id)} onValueChange={val => setData('car_id', Number(val))}>
                                    <SelectTrigger><SelectValue placeholder="Pilih mobil..." /></SelectTrigger>
                                    <SelectContent>
                                        {cars.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.plate_number}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {errors.car_id && <p className="text-xs text-red-500">{errors.car_id}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tanggal Service</Label>
                                    <Input type="date" value={data.service_date} onChange={e => setData('service_date', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Jenis Service</Label>
                                    <Input value={data.service_type} onChange={e => setData('service_type', e.target.value)} placeholder="e.g. Ganti Oli" required />
                                    {errors.service_type && <p className="text-xs text-red-500">{errors.service_type}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Bengkel</Label>
                                    <Input value={data.workshop} onChange={e => setData('workshop', e.target.value)} placeholder="Nama bengkel" />
                                </div>
                                <div className="space-y-2">
                                    <Label>KM Saat Service</Label>
                                    <Input type="number" min={0} value={data.km} onChange={e => setData('km', parseInt(e.target.value))} />
                                    {errors.km && <p className="text-xs text-red-500">{errors.km}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Biaya (Rp)</Label>
                                    <Input type="number" min={0} value={data.cost} onChange={e => setData('cost', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Service Berikutnya</Label>
                                    <Input type="date" value={data.next_service_date} onChange={e => setData('next_service_date', e.target.value)} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Catatan</Label>
                                    <Input value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Catatan tambahan..." />
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processing}>{editingService ? 'Simpan' : 'Tambah'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground py-4">Yakin ingin menghapus record service ini?</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                            <Button variant="destructive" onClick={() => { if (deleteId) router.delete(`/services/${deleteId}`, { onSuccess: () => setDeleteId(null) }); }}>Hapus</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

ServicesIndex.layout = {
    breadcrumbs: [{ title: 'Servis Mobil', href: servicesIndex() }],
};
