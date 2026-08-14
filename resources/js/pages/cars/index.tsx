import { Head, router, useForm, usePage } from '@inertiajs/react';
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
import { Plus, Edit, Trash2, Car } from 'lucide-react';
import { index as carsIndex } from '@/routes/cars';

type CarRecord = {
    id: number;
    name: string;
    brand: string | null;
    model: string | null;
    type: string | null;
    year: number;
    plate_number: string;
    color: string | null;
    transmission: string;
    fuel_type: string;
    passenger_capacity: number;
    chassis_number: string | null;
    engine_number: string | null;
    last_km: number;
    daily_price: string;
    weekly_price: string;
    monthly_price: string;
    photo: string | null;
    owner_partner: string | null;
    status: string;
};

type Props = {
    cars: CarRecord[];
    allCars?: CarRecord[];
    selectedStatus?: string;
    statusCounts?: {
        all: number;
        ready: number;
        not_ready: number;
        belum_dicuci: number;
        service: number;
    };
};

export default function CarsIndex({ cars, allCars, selectedStatus = 'all', statusCounts }: Props) {
    const page = usePage();
    const user = page.props.auth?.user as any;
    const roles: string[] = user?.roles || [];
    const canManageCars = roles.includes('Admin') || roles.includes('Super Admin');

    const list = allCars && allCars.length > 0 ? allCars : cars;
    const [activeFilter, setActiveFilter] = useState<string>(selectedStatus);
    const [isOpen, setIsOpen] = useState(false);
    const [editingCar, setEditingCar] = useState<CarRecord | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const counts = statusCounts ?? {
        all: list.length,
        ready: list.filter(c => c.status === 'Ready').length,
        not_ready: list.filter(c => c.status === 'Not Ready').length,
        belum_dicuci: list.filter(c => c.status === 'Belum Dicuci').length,
        service: list.filter(c => c.status === 'Service').length,
    };

    const filteredCars = activeFilter === 'all'
        ? list
        : list.filter(c => c.status === activeFilter);

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        name: '',
        brand: '',
        model: '',
        type: '',
        year: new Date().getFullYear(),
        plate_number: '',
        color: '',
        transmission: 'Manual',
        fuel_type: 'Bensin',
        passenger_capacity: 4,
        chassis_number: '',
        engine_number: '',
        last_km: 0,
        daily_price: 0,
        weekly_price: 0,
        monthly_price: 0,
        photo: null as File | null,
        owner_partner: '',
        status: 'Ready',
    });

    const openCreate = () => { setEditingCar(null); reset(); clearErrors(); setIsOpen(true); };
    const openEdit = (car: CarRecord) => {
        setEditingCar(car);
        clearErrors();
        setData({
            name: car.name, brand: car.brand ?? '', model: car.model ?? '', type: car.type ?? '',
            year: car.year, plate_number: car.plate_number, color: car.color ?? '',
            transmission: car.transmission, fuel_type: car.fuel_type,
            passenger_capacity: car.passenger_capacity, chassis_number: car.chassis_number ?? '',
            engine_number: car.engine_number ?? '', last_km: car.last_km,
            daily_price: parseFloat(car.daily_price), weekly_price: parseFloat(car.weekly_price),
            monthly_price: parseFloat(car.monthly_price), photo: null,
            owner_partner: car.owner_partner ?? '', status: car.status,
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = { forceFormData: true, onSuccess: () => { setIsOpen(false); reset(); } };
        if (editingCar) {
            put(`/cars/${editingCar.id}`, options);
        } else {
            post('/cars', options);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Ready': return 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25';
            case 'Not Ready': return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25';
            case 'Belum Dicuci': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25';
            case 'Service': return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25';
            default: return 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/25';
        }
    };

    const formatCurrency = (val: string | number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

    const cardConfigs = [
        { status: 'Ready', label: 'Mobil Ready', count: counts.ready, color: 'text-green-600 dark:text-green-400' },
        { status: 'Not Ready', label: 'Sedang Disewa', count: counts.not_ready, color: 'text-purple-600 dark:text-purple-400' },
        { status: 'Belum Dicuci', label: 'Perlu Dicuci', count: counts.belum_dicuci, color: 'text-amber-600 dark:text-amber-400' },
        { status: 'Service', label: 'Sedang Service', count: counts.service, color: 'text-blue-600 dark:text-blue-400' },
    ];

    return (
        <>
            <Head title="Manajemen Armada" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">Manajemen Armada</h1>
                        <p className="text-muted-foreground">Kelola data dan status semua kendaraan rental.</p>
                    </div>
                    {canManageCars && (
                        <Button onClick={openCreate} className="flex items-center gap-1">
                            <Plus className="h-4 w-4" /> Tambah Mobil
                        </Button>
                    )}
                </div>

                {/* Summary Cards (Clickable) */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {cardConfigs.map(item => (
                        <Card
                            key={item.status}
                            className={`cursor-pointer transition-all hover:scale-[1.02] ${activeFilter === item.status ? 'ring-2 ring-primary shadow-sm' : ''}`}
                            onClick={() => setActiveFilter(activeFilter === item.status ? 'all' : item.status)}
                        >
                            <CardContent className="pt-6">
                                <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
                                <Badge variant="outline" className={`mt-1 ${getStatusColor(item.status)}`}>
                                    {item.label}
                                </Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle>
                            {activeFilter === 'all'
                                ? `Semua Kendaraan (${filteredCars.length})`
                                : `Kendaraan Status: ${activeFilter === 'Not Ready' ? 'Sedang Disewa' : activeFilter} (${filteredCars.length})`}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                variant={activeFilter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setActiveFilter('all')}
                            >
                                Semua ({counts.all})
                            </Button>
                            <Button
                                variant={activeFilter === 'Ready' ? 'default' : 'outline'}
                                size="sm"
                                className={`h-8 text-xs ${activeFilter === 'Ready' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={() => setActiveFilter('Ready')}
                            >
                                Ready ({counts.ready})
                            </Button>
                            <Button
                                variant={activeFilter === 'Not Ready' ? 'default' : 'outline'}
                                size="sm"
                                className={`h-8 text-xs ${activeFilter === 'Not Ready' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                                onClick={() => setActiveFilter('Not Ready')}
                            >
                                Disewa ({counts.not_ready})
                            </Button>
                            <Button
                                variant={activeFilter === 'Belum Dicuci' ? 'default' : 'outline'}
                                size="sm"
                                className={`h-8 text-xs ${activeFilter === 'Belum Dicuci' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                                onClick={() => setActiveFilter('Belum Dicuci')}
                            >
                                Cuci ({counts.belum_dicuci})
                            </Button>
                            <Button
                                variant={activeFilter === 'Service' ? 'default' : 'outline'}
                                size="sm"
                                className={`h-8 text-xs ${activeFilter === 'Service' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                onClick={() => setActiveFilter('Service')}
                            >
                                Service ({counts.service})
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Mobile Cards View */}
                        <div className="space-y-3 md:hidden">
                            {filteredCars.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    Tidak ada kendaraan dengan status ini.
                                </div>
                            ) : (
                                filteredCars.map((car) => (
                                    <div key={car.id} className="flex flex-col gap-3 p-4 rounded-lg border bg-card text-card-foreground shadow-xs">
                                        <div className="flex items-center gap-3">
                                            {car.photo ? (
                                                <img src={`/storage/${car.photo}`} alt={car.name} className="h-12 w-16 rounded object-cover" />
                                            ) : (
                                                <div className="flex h-12 w-16 items-center justify-center rounded bg-muted">
                                                    <Car className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm truncate">{car.brand} {car.model}</div>
                                                <div className="text-xs text-muted-foreground truncate">{car.name} · {car.year}</div>
                                            </div>
                                            <Badge variant="outline" className={getStatusColor(car.status)}>{car.status}</Badge>
                                        </div>
                                        
                                        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                                            <div className="flex justify-between">
                                                <span>No. Polisi:</span>
                                                <span className="font-mono font-semibold text-foreground">{car.plate_number}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Mitra / Pemilik:</span>
                                                <span className="font-medium text-foreground">{car.owner_partner || 'Milik Sendiri'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Spesifikasi:</span>
                                                <span className="text-foreground">{car.transmission} · {car.fuel_type} · {car.passenger_capacity} Penumpang</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Harga/Hari:</span>
                                                <span className="font-semibold text-foreground">{formatCurrency(car.daily_price)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>KM Terakhir:</span>
                                                <span className="text-foreground">{car.last_km.toLocaleString('id-ID')} km</span>
                                            </div>
                                        </div>

                                        {canManageCars && (
                                            <div className="flex justify-end gap-2 pt-2 border-t mt-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(car)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteId(car.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
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
                                        <th className="px-6 py-3">Kendaraan</th>
                                        <th className="px-6 py-3">No. Polisi</th>
                                        <th className="px-6 py-3">Mitra / Pemilik</th>
                                        <th className="px-6 py-3">Spesifikasi</th>
                                        <th className="px-6 py-3">Harga/Hari</th>
                                        <th className="px-6 py-3">KM Terakhir</th>
                                        <th className="px-6 py-3">Status</th>
                                        {canManageCars && <th className="px-6 py-3 text-right">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredCars.length === 0 ? (
                                        <tr><td colSpan={canManageCars ? 8 : 7} className="px-6 py-8 text-center text-muted-foreground">Tidak ada kendaraan dengan status ini.</td></tr>
                                    ) : filteredCars.map((car) => (
                                        <tr key={car.id} className="hover:bg-muted/50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {car.photo ? (
                                                        <img src={`/storage/${car.photo}`} alt={car.name} className="h-10 w-14 rounded object-cover" />
                                                    ) : (
                                                        <div className="flex h-10 w-14 items-center justify-center rounded bg-muted">
                                                            <Car className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold">{car.brand} {car.model}</div>
                                                        <div className="text-xs text-muted-foreground">{car.name} · {car.year} · {car.color}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-semibold">{car.plate_number}</td>
                                            <td className="px-6 py-4 text-xs font-medium">
                                                {car.owner_partner ? (
                                                    <span className="font-semibold text-foreground">{car.owner_partner}</span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">Milik Sendiri</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div>{car.transmission} · {car.fuel_type}</div>
                                                <div>{car.passenger_capacity} penumpang · {car.type}</div>
                                            </td>
                                            <td className="px-6 py-4 font-semibold">{formatCurrency(car.daily_price)}</td>
                                            <td className="px-6 py-4">{car.last_km.toLocaleString('id-ID')} km</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={getStatusColor(car.status)}>{car.status}</Badge>
                                            </td>
                                            {canManageCars && (
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(car)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(car.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Create / Edit Dialog */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingCar ? 'Edit Kendaraan' : 'Tambah Kendaraan Baru'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">Identitas Kendaraan</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="brand">Merk</Label>
                                    <Input id="brand" value={data.brand} onChange={e => setData('brand', e.target.value)} placeholder="Toyota" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model">Model</Label>
                                    <Input id="model" value={data.model} onChange={e => setData('model', e.target.value)} placeholder="Avanza" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nama / Tipe Lengkap</Label>
                                    <Input id="name" value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Toyota Avanza 1.3 G" required />
                                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">Jenis</Label>
                                    <Input id="type" value={data.type} onChange={e => setData('type', e.target.value)} placeholder="MPV, SUV, Sedan..." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="year">Tahun</Label>
                                    <Input id="year" type="number" value={data.year} onChange={e => setData('year', parseInt(e.target.value))} required />
                                    {errors.year && <p className="text-xs text-red-500">{errors.year}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="plate_number">No. Polisi</Label>
                                    <Input id="plate_number" value={data.plate_number} onChange={e => setData('plate_number', e.target.value.toUpperCase())} placeholder="B 1234 ABC" required />
                                    {errors.plate_number && <p className="text-xs text-red-500">{errors.plate_number}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="color">Warna</Label>
                                    <Input id="color" value={data.color} onChange={e => setData('color', e.target.value)} placeholder="Putih" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Transmisi</Label>
                                    <Select value={data.transmission} onValueChange={val => setData('transmission', val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Manual">Manual</SelectItem>
                                            <SelectItem value="Automatic">Automatic</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Bahan Bakar</Label>
                                    <Select value={data.fuel_type} onValueChange={val => setData('fuel_type', val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bensin">Bensin</SelectItem>
                                            <SelectItem value="Diesel">Diesel</SelectItem>
                                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                                            <SelectItem value="Listrik">Listrik</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="passenger_capacity">Kapasitas Penumpang</Label>
                                    <Input id="passenger_capacity" type="number" min={1} max={50} value={data.passenger_capacity} onChange={e => setData('passenger_capacity', parseInt(e.target.value))} />
                                </div>
                            </div>

                            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Nomor Identifikasi</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="chassis_number">Nomor Rangka</Label>
                                    <Input id="chassis_number" value={data.chassis_number} onChange={e => setData('chassis_number', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="engine_number">Nomor Mesin</Label>
                                    <Input id="engine_number" value={data.engine_number} onChange={e => setData('engine_number', e.target.value)} />
                                </div>
                            </div>

                            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Harga & Kondisi</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="daily_price">Harga Harian (Rp)</Label>
                                    <Input id="daily_price" type="number" min={0} value={data.daily_price} onChange={e => setData('daily_price', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weekly_price">Harga Mingguan (Rp)</Label>
                                    <Input id="weekly_price" type="number" min={0} value={data.weekly_price} onChange={e => setData('weekly_price', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="monthly_price">Harga Bulanan (Rp)</Label>
                                    <Input id="monthly_price" type="number" min={0} value={data.monthly_price} onChange={e => setData('monthly_price', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_km">KM Terakhir</Label>
                                    <Input id="last_km" type="number" min={0} value={data.last_km} onChange={e => setData('last_km', parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="owner_partner">Mitra Pemilik</Label>
                                    <Input id="owner_partner" value={data.owner_partner} onChange={e => setData('owner_partner', e.target.value)} placeholder="Nama mitra" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={data.status} onValueChange={val => setData('status', val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ready">Ready</SelectItem>
                                            <SelectItem value="Not Ready">Not Ready</SelectItem>
                                            <SelectItem value="Belum Dicuci">Belum Dicuci</SelectItem>
                                            <SelectItem value="Service">Service</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.status && <p className="text-xs text-red-500">{errors.status}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="photo">Foto Kendaraan</Label>
                                <Input id="photo" type="file" accept="image/*" onChange={e => setData('photo', e.target.files?.[0] ?? null)} />
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={processing}>{editingCar ? 'Simpan Perubahan' : 'Tambah Kendaraan'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
                        <div className="py-4"><p className="text-sm text-muted-foreground">Yakin ingin menghapus kendaraan ini? Tindakan ini tidak dapat dibatalkan.</p></div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                            <Button variant="destructive" onClick={() => { if (deleteId) router.delete(`/cars/${deleteId}`, { onSuccess: () => setDeleteId(null) }); }}>Hapus</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

CarsIndex.layout = {
    breadcrumbs: [{ title: 'Manajemen Armada', href: carsIndex() }],
};
