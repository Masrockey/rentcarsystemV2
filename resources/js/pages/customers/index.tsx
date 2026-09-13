import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';
import { index as customersIndex } from '@/routes/customers';
import { maskPhoneNumber } from '@/lib/utils';

import Pagination, { PaginatedData } from '@/components/pagination';

type Customer = {
    id: number;
    user_id?: number | null;
    user?: { id: number; name: string } | null;
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

type Props = {
    customers: PaginatedData<Customer> | Customer[];
    marketingUsers?: { id: number; name: string }[];
    search?: string;
};

export default function CustomersIndex({ customers, marketingUsers = [], search = '' }: Props) {
    const { auth } = usePage().props;
    const authUser = (auth as any)?.user;
    const roles: string[] = authUser?.roles || [];
    const isSuperAdmin = roles.includes('Super Admin');
    const isAdmin = roles.includes('Admin') || isSuperAdmin;
    const shouldMaskPhone = roles.includes('Admin') && !isSuperAdmin;

    const customerList = Array.isArray(customers) ? customers : (customers?.data || []);
    const totalCount = Array.isArray(customers) ? customers.length : (customers?.total ?? customerList.length);

    const [searchQuery, setSearchQuery] = useState(search);
    const [isOpen, setIsOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const handleSearch = (customSearch?: string) => {
        const querySearch = customSearch !== undefined ? customSearch : searchQuery;
        router.get(
            '/customers',
            querySearch ? { search: querySearch } : {},
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        handleSearch('');
    };

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        name: '',
        user_id: '' as string | number,
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

    const openCreate = () => {
        setEditingCustomer(null);
        reset();
        clearErrors();
        setData('user_id', authUser?.id ? String(authUser.id) : '');
        setIsOpen(true);
    };

    const openEdit = (c: Customer) => {
        setEditingCustomer(c);
        clearErrors();
        setData({
            name: c.name,
            user_id: c.user_id ? String(c.user_id) : (c.user?.id ? String(c.user.id) : ''),
            nik: c.nik ?? '',
            phone: c.phone ? (shouldMaskPhone ? maskPhoneNumber(c.phone) : c.phone) : '',
            email: c.email ?? '',
            address: c.address ?? '',
            sim_number: c.sim_number ?? '',
            sim_expiry: c.sim_expiry ?? '',
            emergency_contact: c.emergency_contact ?? '',
            ktp_photo: null,
            sim_photo: null,
            selfie_photo: null,
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
            <Head title="Manajemen Pelanggan" />
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
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-bold">Semua Customer ({totalCount})</CardTitle>
                            {searchQuery && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Hasil pencarian untuk: <span className="font-semibold text-foreground">"{searchQuery}"</span>
                                </p>
                            )}
                        </div>
                        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Cari nama, NIK, HP, email, staf..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-8 text-xs h-9"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                    title="Hapus pencarian"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </form>
                    </CardHeader>
                    <CardContent className="space-y-3">
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
                                        <th className="px-6 py-3">Dibuat Oleh</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {customerList.length === 0 ? (
                                        <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Belum ada data customer.</td></tr>
                                    ) : customerList.map((customer) => (
                                        <tr key={customer.id} className="hover:bg-muted/50">
                                            <td className="px-6 py-4 font-medium">
                                                <div>{customer.name}</div>
                                                <div className="text-xs text-muted-foreground">{customer.email ?? '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">{customer.nik ?? '-'}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{customer.phone ? (shouldMaskPhone ? maskPhoneNumber(customer.phone) : customer.phone) : '-'}</td>
                                            <td className="px-6 py-4 font-mono">{customer.sim_number ?? '-'}</td>
                                            <td className="px-6 py-4">{customer.sim_expiry ?? '-'}</td>
                                            <td className="px-6 py-4">{customer.emergency_contact ?? '-'}</td>
                                            <td className="px-6 py-4">
                                                {customer.user ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                        {customer.user.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(customer.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination data={customers} />
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
                                {isAdmin && (
                                    <div className="col-span-2 space-y-1.5 p-3 rounded-lg bg-muted/40 border">
                                        <Label htmlFor="user_id" className="text-xs font-semibold text-foreground">
                                            Dibuat Oleh (Marketing / User)
                                        </Label>
                                        <select
                                            id="user_id"
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={data.user_id}
                                            onChange={(e) => setData('user_id', e.target.value)}
                                        >
                                            <option value="">- Tanpa Marketing / Default User -</option>
                                            {marketingUsers.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-muted-foreground">
                                            {editingCustomer
                                                ? 'Hanya Admin & Super Admin yang dapat mengganti marketing pembuat data pelanggan ini.'
                                                : 'Pilih marketing yang bertanggung jawab atas data pelanggan ini.'}
                                        </p>
                                        {errors.user_id && <p className="text-xs text-red-500">{errors.user_id}</p>}
                                    </div>
                                )}
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="name">Nama Lengkap</Label>
                                    <Input id="name" value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Nama lengkap sesuai KTP" required />
                                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nik">NIK (KTP)</Label>
                                    <Input id="nik" value={data.nik} onChange={e => setData('nik', e.target.value)} placeholder="16 digit NIK" maxLength={20} />
                                    {errors.nik && <p className="text-xs text-red-500">{errors.nik}</p>}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="phone">No. HP</Label>
                                        {shouldMaskPhone && editingCustomer && (
                                            <span className="text-[10px] text-muted-foreground font-medium">Disamarkan</span>
                                        )}
                                    </div>
                                    <Input
                                        id="phone"
                                        value={data.phone}
                                        onChange={e => setData('phone', e.target.value)}
                                        placeholder="08xxxxxxxxxx"
                                        className={shouldMaskPhone && editingCustomer && data.phone.includes('*') ? 'font-mono' : ''}
                                    />
                                    {shouldMaskPhone && editingCustomer && (
                                        <p className="text-[11px] text-muted-foreground">
                                            Biarkan bertanda bintang jika tidak ingin mengubah nomor HP. Masukkan nomor baru jika ingin memperbarui.
                                        </p>
                                    )}
                                    {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="email@example.com" />
                                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact">Kontak Darurat</Label>
                                    <Input id="emergency_contact" value={data.emergency_contact} onChange={e => setData('emergency_contact', e.target.value)} placeholder="No. HP keluarga" />
                                    {errors.emergency_contact && <p className="text-xs text-red-500">{errors.emergency_contact}</p>}
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="address">Alamat</Label>
                                    <Input id="address" value={data.address} onChange={e => setData('address', e.target.value)} placeholder="Alamat lengkap" />
                                    {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                                </div>
                            </div>

                            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Data SIM</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sim_number">No. SIM</Label>
                                    <Input id="sim_number" value={data.sim_number} onChange={e => setData('sim_number', e.target.value)} placeholder="Nomor SIM" />
                                    {errors.sim_number && <p className="text-xs text-red-500">{errors.sim_number}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sim_expiry">Masa Berlaku SIM</Label>
                                    <Input id="sim_expiry" type="date" value={data.sim_expiry} onChange={e => setData('sim_expiry', e.target.value)} />
                                    {errors.sim_expiry && <p className="text-xs text-red-500">{errors.sim_expiry}</p>}
                                </div>
                            </div>

                            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Upload Foto Dokumen</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ktp_photo">Foto KTP</Label>
                                    <Input id="ktp_photo" type="file" accept="image/*" onChange={e => setData('ktp_photo', e.target.files?.[0] ?? null)} />
                                    {errors.ktp_photo && <p className="text-xs text-red-500">{errors.ktp_photo}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sim_photo">Foto SIM</Label>
                                    <Input id="sim_photo" type="file" accept="image/*" onChange={e => setData('sim_photo', e.target.files?.[0] ?? null)} />
                                    {errors.sim_photo && <p className="text-xs text-red-500">{errors.sim_photo}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="selfie_photo">Foto Selfie</Label>
                                    <Input id="selfie_photo" type="file" accept="image/*" onChange={e => setData('selfie_photo', e.target.files?.[0] ?? null)} />
                                    {errors.selfie_photo && <p className="text-xs text-red-500">{errors.selfie_photo}</p>}
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
    breadcrumbs: [{ title: 'Manajemen Pelanggan', href: customersIndex() }],
};
