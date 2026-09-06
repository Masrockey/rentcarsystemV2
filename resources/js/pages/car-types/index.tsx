import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Car, Search, Layers, X, Tag } from 'lucide-react';
import { index as carTypesIndex } from '@/routes/car-types';
import Pagination, { PaginatedData } from '@/components/pagination';

export type CarType = {
    id: number;
    name: string;
    type: string | null;
    category: string | null;
    description: string | null;
    created_at?: string;
    updated_at?: string;
};

type Props = {
    carTypes: PaginatedData<CarType> | CarType[];
};

export default function CarTypesIndex({ carTypes }: Props) {
    const carTypeList = useMemo(() => Array.isArray(carTypes) ? carTypes : (carTypes?.data || []), [carTypes]);
    const page = usePage();
    const user = page.props.auth?.user as any;
    const roles: string[] = user?.roles || [];
    const canManage = roles.includes('Admin') || roles.includes('Super Admin');

    const [isOpen, setIsOpen] = useState(false);
    const [editingCarType, setEditingCarType] = useState<CarType | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        name: '',
        type: '',
        category: '',
        description: '',
    });

    const filteredCarTypes = useMemo(() => {
        if (!searchQuery.trim()) return carTypeList;
        const q = searchQuery.toLowerCase();
        return carTypeList.filter((ct) => {
            const name = ct.name?.toLowerCase() || '';
            const type = ct.type?.toLowerCase() || '';
            const category = ct.category?.toLowerCase() || '';
            const desc = ct.description?.toLowerCase() || '';
            return name.includes(q) || type.includes(q) || category.includes(q) || desc.includes(q);
        });
    }, [carTypeList, searchQuery]);

    const openCreate = () => {
        setEditingCarType(null);
        reset();
        clearErrors();
        setIsOpen(true);
    };

    const openEdit = (ct: CarType) => {
        setEditingCarType(ct);
        clearErrors();
        setData({
            name: ct.name,
            type: ct.type ?? '',
            category: ct.category ?? '',
            description: ct.description ?? '',
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCarType) {
            put(`/car-types/${editingCarType.id}`, {
                onSuccess: () => {
                    setIsOpen(false);
                    reset();
                },
            });
        } else {
            post('/car-types', {
                onSuccess: () => {
                    setIsOpen(false);
                    reset();
                },
            });
        }
    };

    return (
        <>
            <Head title="Master Tipe & Jenis Mobil" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">Master Tipe & Jenis Mobil</h1>
                        <p className="text-muted-foreground">
                            Kelola daftar model, type kendaraan, dan jenis/kategori mobil untuk formulir booking dan data armada.
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreate} className="flex items-center gap-1 shrink-0">
                            <Plus className="h-4 w-4" /> Tambah Tipe Mobil
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg">Daftar Model & Tipe Mobil</CardTitle>
                            <CardDescription>
                                Total {'total' in carTypes ? carTypes.total : carTypeList.length} tipe mobil terdaftar di sistem.
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Cari nama, tipe, atau jenis..."
                                className="pl-9 h-9 text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Mobile Cards View */}
                        <div className="space-y-3 md:hidden">
                            {filteredCarTypes.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    {searchQuery ? 'Tidak ada data tipe mobil yang cocok dengan pencarian.' : 'Belum ada data tipe mobil.'}
                                </div>
                            ) : (
                                filteredCarTypes.map((ct) => (
                                    <div key={ct.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-xs space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <Car className="h-4 w-4" />
                                                </div>
                                                <span className="font-semibold text-base">{ct.name}</span>
                                            </div>
                                            {canManage && (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => openEdit(ct)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-600"
                                                        onClick={() => setDeleteId(ct.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {ct.type && (
                                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                                    <Layers className="h-3 w-3 mr-1" />
                                                    Type: {ct.type}
                                                </Badge>
                                            )}
                                            {ct.category && (
                                                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                                    <Tag className="h-3 w-3 mr-1" />
                                                    Jenis: {ct.category}
                                                </Badge>
                                            )}
                                        </div>

                                        {ct.description && (
                                            <p className="text-xs text-muted-foreground pt-1">
                                                {ct.description}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3">Nama Mobil</th>
                                        <th className="px-6 py-3">Type Mobil</th>
                                        <th className="px-6 py-3">Jenis / Kategori</th>
                                        <th className="px-6 py-3">Keterangan</th>
                                        {canManage && <th className="px-6 py-3 text-right">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredCarTypes.length === 0 ? (
                                        <tr>
                                            <td colSpan={canManage ? 5 : 4} className="px-6 py-8 text-center text-muted-foreground">
                                                {searchQuery ? 'Tidak ada data tipe mobil yang cocok dengan pencarian.' : 'Belum ada data tipe mobil.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCarTypes.map((ct) => (
                                            <tr key={ct.id} className="hover:bg-muted/50">
                                                <td className="px-6 py-4 font-semibold text-foreground">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                            <Car className="h-4 w-4" />
                                                        </div>
                                                        <span>{ct.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {ct.type ? (
                                                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                                            {ct.type}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {ct.category ? (
                                                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                                            {ct.category}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">
                                                    {ct.description || '-'}
                                                </td>
                                                {canManage && (
                                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => openEdit(ct)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-600"
                                                                onClick={() => setDeleteId(ct.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination data={carTypes} />
                    </CardContent>
                </Card>

                {/* Create / Edit Dialog */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingCarType ? 'Edit Tipe Mobil' : 'Tambah Tipe Mobil'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-2">
                            <div className="space-y-1">
                                <Label htmlFor="name">Nama Mobil *</Label>
                                <Input
                                    id="name"
                                    placeholder="Contoh: Avanza, Innova Zenix, Brio..."
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="type">Type Mobil</Label>
                                <Input
                                    id="type"
                                    placeholder="Contoh: MPV, SUV, Hatchback, Compact SUV, Sedan..."
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value)}
                                />
                                {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="category">Jenis / Kategori Mobil</Label>
                                <Input
                                    id="category"
                                    placeholder="Contoh: Mobil Keluarga, City Car, Luxury & VIP, Niaga..."
                                    value={data.category}
                                    onChange={(e) => setData('category', e.target.value)}
                                />
                                {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="description">Keterangan / Deskripsi (Opsional)</Label>
                                <Input
                                    id="description"
                                    placeholder="Keterangan tambahan..."
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                />
                                {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {editingCarType ? 'Simpan Perubahan' : 'Tambah Tipe Mobil'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Hapus Tipe Mobil</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                                Apakah Anda yakin ingin menghapus tipe mobil ini dari daftar? Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (deleteId) {
                                        router.delete(`/car-types/${deleteId}`, {
                                            onSuccess: () => setDeleteId(null),
                                        });
                                    }
                                }}
                            >
                                Hapus
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

CarTypesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Tipe & Jenis Mobil',
            href: carTypesIndex(),
        },
    ],
};
