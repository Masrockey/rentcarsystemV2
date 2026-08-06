import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { index as customersIndex } from '@/routes/customers';

type Customer = {
    id: number;
    name: string;
    nik: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    sim_number: string | null;
    sim_expiry: string | null;
    emergency_contact: string | null;
    ktp_photo: string | null;
    sim_photo: string | null;
    selfie_photo: string | null;
};

type Props = { customers: Customer[] };

export default function CustomersIndex({ customers }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        name: '',
        nik: '',
        phone: '',
        email: '',
        address: '',
        sim_number: '',
        sim_expiry: '',
        emergency_contact: '',
        ktp_photo: null as File | null,
        sim_photo: null as File | null,
        selfie_photo: null as File | null,
    });

    const openCreate = () => { setEditingCustomer(null); reset(); clearErrors(); setIsOpen(true); };
    const openEdit = (c: Customer) => {
        setEditingCustomer(c);
        clearErrors();
        setData({
            name: c.name, nik: c.nik ?? '', phone: c.phone ?? '', email: c.email ?? '',
            address: c.address ?? '', sim_number: c.sim_number ?? '', sim_expiry: c.sim_expiry ?? '',
            emergency_contact: c.emergency_contact ?? '',
            ktp_photo: null, sim_photo: null, selfie_photo: null,
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = { forceFormData: true, onSuccess: () => { setIsOpen(false); reset(); } };
        if (editingCustomer) {
            put(`/customers/${editingCustomer.id}`, options);
        } else {
            post('/customers', options);
        }
    };

    return (
        <>
            <Head title="Customer Management" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">Manajemen Customer</h1>
                        <p className="text-muted-foreground">Kelola data pelanggan dan dokumen identitas.</p>
                    </div>
                    <Button onClick={openCreate} className="flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Tambah Customer
                    </Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Semua Customer ({customers.length})</CardTitle></CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3">Nama</th>
                                        <th className="px-6 py-3">NIK</th>
                                        <th className="px-6 py-3">No. HP</th>
                                        <th className="px-6 py-3">No. SIM</th>
                                        <th className="px-6 py-3">Berlaku SIM</th>
                                        <th className="px-6 py-3">Kontak Darurat</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {customers.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Belum ada data customer.</td></tr>
                                    ) : customers.map((customer) => (
                                        <tr key={customer.id} className="hover:bg-muted/50">
                                            <td className="px-6 py-4 font-medium">
                                                <div>{customer.name}</div>
                                                <div className="text-xs text-muted-foreground">{customer.email ?? '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">{customer.nik ?? '-'}</td>
                                            <td className="px-6 py-4">{customer.phone ?? '-'}</td>
                                            <td className="px-6 py-4 font-mono">{customer.sim_number ?? '-'}</td>
                                            <td className="px-6 py-4">{customer.sim_expiry ?? '-'}</td>
                                            <td className="px-6 py-4">{customer.emergency_contact ?? '-'}</td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(customer.id)}><Trash2 className="h-4 w-4" /></Button>
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
                        <DialogHeader>
                            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Tambah Customer Baru'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">Data Pribadi</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="name">Nama Lengkap</Label>
                                    <Input id="name" value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Nama lengkap sesuai KTP" required />
                                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nik">NIK (KTP)</Label>
                                    <Input id="nik" value={data.nik} onChange={e => setData('nik', e.target.value)} placeholder="16 digit NIK" maxLength={20} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">No. HP</Label>
                                    <Input id="phone" value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="email@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact">Kontak Darurat</Label>
                                    <Input id="emergency_contact" value={data.emergency_contact} onChange={e => setData('emergency_contact', e.target.value)} placeholder="No. HP keluarga" />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="address">Alamat</Label>
                                    <Input id="address" value={data.address} onChange={e => setData('address', e.target.value)} placeholder="Alamat lengkap" />
                                </div>
                            </div>

                            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Data SIM</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sim_number">No. SIM</Label>
                                    <Input id="sim_number" value={data.sim_number} onChange={e => setData('sim_number', e.target.value)} placeholder="Nomor SIM" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sim_expiry">Masa Berlaku SIM</Label>
                                    <Input id="sim_expiry" type="date" value={data.sim_expiry} onChange={e => setData('sim_expiry', e.target.value)} />
                                </div>
                            </div>

                            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Upload Foto Dokumen</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ktp_photo">Foto KTP</Label>
                                    <Input id="ktp_photo" type="file" accept="image/*" onChange={e => setData('ktp_photo', e.target.files?.[0] ?? null)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sim_photo">Foto SIM</Label>
                                    <Input id="sim_photo" type="file" accept="image/*" onChange={e => setData('sim_photo', e.target.files?.[0] ?? null)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="selfie_photo">Foto Selfie</Label>
                                    <Input id="selfie_photo" type="file" accept="image/*" onChange={e => setData('selfie_photo', e.target.files?.[0] ?? null)} />
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processing}>{editingCustomer ? 'Simpan Perubahan' : 'Tambah Customer'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground py-4">Yakin ingin menghapus data customer ini? Tindakan ini tidak dapat dibatalkan.</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                            <Button variant="destructive" onClick={() => { if (deleteId) router.delete(`/customers/${deleteId}`, { onSuccess: () => setDeleteId(null) }); }}>Hapus</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

CustomersIndex.layout = {
    breadcrumbs: [{ title: 'Customer Management', href: customersIndex() }],
};
