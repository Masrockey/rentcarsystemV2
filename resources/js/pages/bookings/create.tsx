import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useState, useMemo } from 'react';
import { ArrowLeft, Car, Calendar, User, DollarSign, MapPin, Plus, CheckCircle2 } from 'lucide-react';

type Customer = {
    id: number;
    name: string;
    phone?: string | null;
    nik?: string | null;
    address?: string | null;
};

type CarTypeRef = {
    id?: number;
    name: string;
    type?: string | null;
    category?: string | null;
};

type UserType = {
    id: number;
    name: string;
    roles?: string[];
};

type Props = {
    customers: Customer[];
    carTypes?: CarTypeRef[];
    marketingUsers?: UserType[];
};

const DEFAULT_CAR_TYPES = [
    'Avanza',
    'Innova',
    'Brio',
    'Xpander',
    'Fortuner',
    'Alphard',
    'Calya',
    'Hiace',
    'Ertiga',
    'Yaris',
    'HR-V',
    'CR-V',
    'Pajero Sport',
    'Mini Bus',
];

const LOCATION_PRESETS = [
    'Garasi',
    'Mataram',
    'Bandara',
    'Pelabuhan Lembar',
    'Sengigi',
    'Kuta Mandalika',
    'Pelabuhan Bangsal',
    'Lokasi Lain',
];

export default function BookingCreate({ customers = [], carTypes = [], marketingUsers = [] }: Props) {
    const { auth } = usePage().props as any;
    const roles: string[] = auth?.user?.roles || [];
    const hasRole = (role: string) => roles.includes(role) || roles.includes('Super Admin');

    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [isCustomCarType, setIsCustomCarType] = useState(false);

    const [pickupOption, setPickupOption] = useState<string>('');
    const [customPickup, setCustomPickup] = useState<string>('');
    const [dropoffOption, setDropoffOption] = useState<string>('');
    const [customDropoff, setCustomDropoff] = useState<string>('');

    const availableCarTypeNames = useMemo(() => {
        if (carTypes && carTypes.length > 0) {
            return carTypes.map((c) => c.name);
        }
        return DEFAULT_CAR_TYPES;
    }, [carTypes]);

    const customerOptions = useMemo(() => {
        return customers.map((c) => ({
            value: c.id.toString(),
            label: `${c.name}${c.phone ? ` (${c.phone})` : ''}`,
            searchTerms: `${c.name} ${c.phone || ''} ${c.nik || ''}`,
        }));
    }, [customers]);

    const carTypeOptions = useMemo(() => {
        return availableCarTypeNames.map((name) => ({
            value: name,
            label: name,
        }));
    }, [availableCarTypeNames]);

    const {
        data,
        setData,
        post,
        processing,
        errors,
        transform,
    } = useForm({
        user_id: '',
        customer_id: customers.length > 0 ? customers[0].id.toString() : '',
        new_customer_name: '',
        new_customer_nik: '',
        new_customer_phone: '',
        new_customer_email: '',
        new_customer_emergency_contact: '',
        new_customer_address: '',
        new_customer_sim_number: '',
        new_customer_sim_expiry: '',
        new_customer_ktp_photo: null as File | null,
        new_customer_sim_photo: null as File | null,
        new_customer_selfie_photo: null as File | null,
        car_type: availableCarTypeNames.length > 0 ? availableCarTypeNames[0] : '',
        rental_type: 'Lepas Kunci' as 'Lepas Kunci' | 'With Driver',
        price: '',
        duration_type: 'Hari' as 'Hari' | '24 Jam',
        duration_days: '1',
        delivery_fee: '',
        driver_fee: '',
        booking_date: '',
        return_date: '',
        pickup_time: '',
        return_time: '',
        pickup_location: '',
        dropoff_location: '',
        payment_method: 'Cash',
        dp_amount: '',
        payment_status: 'Pending',
        amount: '0',
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val);
    };

    const handlePickupOptionChange = (val: string) => {
        setPickupOption(val);
        if (val === 'Lokasi Lain') {
            setData('pickup_location', customPickup);
        } else {
            setData('pickup_location', val);
        }
    };

    const handleCustomPickupChange = (text: string) => {
        setCustomPickup(text);
        setData('pickup_location', text);
    };

    const handleDropoffOptionChange = (val: string) => {
        setDropoffOption(val);
        if (val === 'Lokasi Lain') {
            setData('dropoff_location', customDropoff);
        } else {
            setData('dropoff_location', val);
        }
    };

    const handleCustomDropoffChange = (text: string) => {
        setCustomDropoff(text);
        setData('dropoff_location', text);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseFloat(data.price) || 0;
        const d = parseInt(data.duration_days, 10) || 1;
        const f = parseFloat(data.delivery_fee) || 0;
        transform((form) => ({
            ...form,
            amount: ((p * d) + f).toString(),
            driver_fee: '0',
            dp_amount: form.payment_method === 'DP' ? form.dp_amount : '0',
            payment_status: form.payment_method === 'DP' ? 'Down Payment' : form.payment_status,
        }));
        post('/bookings');
    };

    const calculatedTotal = useMemo(() => {
        const p = parseFloat(data.price) || 0;
        const d = parseInt(data.duration_days, 10) || 1;
        const f = parseFloat(data.delivery_fee) || 0;
        return (p * d) + f;
    }, [data.price, data.duration_days, data.delivery_fee]);

    return (
        <>
            <Head title="Tambah Booking Sewa" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
                {/* Header Page */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" asChild className="h-9 w-9">
                            <Link href="/bookings">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Tambah Booking Sewa</h1>
                            <p className="text-xs text-muted-foreground">
                                Lengkapi formulir di bawah ini untuk membuat pesanan booking sewa armada baru.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild className="h-9 text-xs">
                            <Link href="/bookings">Batal</Link>
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={processing}
                            className="h-9 text-xs font-semibold gap-1.5 shadow-sm"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Simpan Booking
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Customer & Marketing */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base font-semibold">Data Pelanggan & Marketing</CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Tentukan pelanggan pemesan atau input customer baru jika belum terdaftar.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {hasRole('Admin') && (
                                <div className="space-y-1">
                                    <Label htmlFor="create_user_id" className="text-xs font-semibold">
                                        Nama Marketing <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={data.user_id}
                                        onValueChange={(val) => setData('user_id', val)}
                                    >
                                        <SelectTrigger id="create_user_id" className={`h-9 ${errors.user_id ? 'border-destructive' : ''}`}>
                                            <SelectValue placeholder="Pilih Marketing..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {marketingUsers.map((m) => (
                                                <SelectItem key={m.id} value={m.id.toString()}>
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.user_id && (
                                        <p className="text-xs text-destructive font-medium">{errors.user_id}</p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="customer_id" className="text-xs font-semibold">
                                        {isNewCustomer ? 'Customer Baru' : 'Pilih Customer'} <span className="text-red-500">*</span>
                                    </Label>
                                    <button
                                        type="button"
                                        className="text-xs text-primary hover:underline font-medium focus:outline-none"
                                        onClick={() => {
                                            const nextState = !isNewCustomer;
                                            setIsNewCustomer(nextState);
                                            if (nextState) {
                                                setData('customer_id', '');
                                            } else {
                                                setData('new_customer_name', '');
                                                setData('new_customer_nik', '');
                                                setData('new_customer_phone', '');
                                                setData('new_customer_email', '');
                                                setData('new_customer_emergency_contact', '');
                                                setData('new_customer_address', '');
                                                setData('new_customer_sim_number', '');
                                                setData('new_customer_sim_expiry', '');
                                                setData('new_customer_ktp_photo', null);
                                                setData('new_customer_sim_photo', null);
                                                setData('new_customer_selfie_photo', null);
                                                if (customers.length > 0) {
                                                    setData('customer_id', customers[0].id.toString());
                                                }
                                            }
                                        }}
                                    >
                                        {isNewCustomer ? '← Pilih Customer Terdaftar' : '+ Tambah Customer Baru'}
                                    </button>
                                </div>

                                {!isNewCustomer ? (
                                    <SearchableSelect
                                        options={customerOptions}
                                        value={data.customer_id}
                                        onValueChange={(val) => setData('customer_id', val)}
                                        placeholder="Pilih customer terdaftar..."
                                        searchPlaceholder="Cari nama / HP customer..."
                                        emptyText="Customer tidak ditemukan."
                                    />
                                ) : (
                                    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                                Data Pribadi Customer Baru
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_name" className="text-xs font-semibold">
                                                        Nama Lengkap <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="new_customer_name"
                                                        type="text"
                                                        placeholder="Masukkan nama lengkap..."
                                                        value={data.new_customer_name}
                                                        onChange={(e) => setData('new_customer_name', e.target.value)}
                                                        required={isNewCustomer}
                                                    />
                                                    {errors.new_customer_name && <p className="text-[11px] text-red-500">{errors.new_customer_name}</p>}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_nik" className="text-xs">NIK (KTP)</Label>
                                                    <Input
                                                        id="new_customer_nik"
                                                        type="text"
                                                        placeholder="Masukkan 16 digit NIK..."
                                                        value={data.new_customer_nik}
                                                        onChange={(e) => setData('new_customer_nik', e.target.value)}
                                                    />
                                                    {errors.new_customer_nik && <p className="text-[11px] text-red-500">{errors.new_customer_nik}</p>}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_phone" className="text-xs">No. HP</Label>
                                                    <Input
                                                        id="new_customer_phone"
                                                        type="text"
                                                        placeholder="081234567890..."
                                                        value={data.new_customer_phone}
                                                        onChange={(e) => setData('new_customer_phone', e.target.value)}
                                                    />
                                                    {errors.new_customer_phone && <p className="text-[11px] text-red-500">{errors.new_customer_phone}</p>}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_email" className="text-xs">Email</Label>
                                                    <Input
                                                        id="new_customer_email"
                                                        type="email"
                                                        placeholder="email@example.com..."
                                                        value={data.new_customer_email}
                                                        onChange={(e) => setData('new_customer_email', e.target.value)}
                                                    />
                                                    {errors.new_customer_email && <p className="text-[11px] text-red-500">{errors.new_customer_email}</p>}
                                                </div>

                                                <div className="space-y-1 md:col-span-2">
                                                    <Label htmlFor="new_customer_emergency_contact" className="text-xs">Kontak Darurat (Opsional)</Label>
                                                    <Input
                                                        id="new_customer_emergency_contact"
                                                        type="text"
                                                        placeholder="Nama & No HP kontak darurat..."
                                                        value={data.new_customer_emergency_contact}
                                                        onChange={(e) => setData('new_customer_emergency_contact', e.target.value)}
                                                    />
                                                    {errors.new_customer_emergency_contact && <p className="text-[11px] text-red-500">{errors.new_customer_emergency_contact}</p>}
                                                </div>

                                                <div className="space-y-1 md:col-span-2">
                                                    <Label htmlFor="new_customer_address" className="text-xs">Alamat Lengkap</Label>
                                                    <Input
                                                        id="new_customer_address"
                                                        type="text"
                                                        placeholder="Alamat lengkap domisili..."
                                                        value={data.new_customer_address}
                                                        onChange={(e) => setData('new_customer_address', e.target.value)}
                                                    />
                                                    {errors.new_customer_address && <p className="text-[11px] text-red-500">{errors.new_customer_address}</p>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t">
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                                Data SIM Customer
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_sim_number" className="text-xs">No. SIM</Label>
                                                    <Input
                                                        id="new_customer_sim_number"
                                                        type="text"
                                                        placeholder="Nomor SIM A..."
                                                        value={data.new_customer_sim_number}
                                                        onChange={(e) => setData('new_customer_sim_number', e.target.value)}
                                                    />
                                                    {errors.new_customer_sim_number && <p className="text-[11px] text-red-500">{errors.new_customer_sim_number}</p>}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_sim_expiry" className="text-xs">Masa Berlaku SIM</Label>
                                                    <Input
                                                        id="new_customer_sim_expiry"
                                                        type="date"
                                                        value={data.new_customer_sim_expiry}
                                                        onChange={(e) => setData('new_customer_sim_expiry', e.target.value)}
                                                    />
                                                    {errors.new_customer_sim_expiry && <p className="text-[11px] text-red-500">{errors.new_customer_sim_expiry}</p>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t">
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                                Upload Dokumen Identitas
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_ktp_photo" className="text-xs">Foto KTP</Label>
                                                    <Input
                                                        id="new_customer_ktp_photo"
                                                        type="file"
                                                        accept="image/*"
                                                        className="text-xs h-9 cursor-pointer"
                                                        onChange={(e) => setData('new_customer_ktp_photo', e.target.files ? e.target.files[0] : null)}
                                                    />
                                                    {errors.new_customer_ktp_photo && <p className="text-[11px] text-red-500">{errors.new_customer_ktp_photo}</p>}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_sim_photo" className="text-xs">Foto SIM</Label>
                                                    <Input
                                                        id="new_customer_sim_photo"
                                                        type="file"
                                                        accept="image/*"
                                                        className="text-xs h-9 cursor-pointer"
                                                        onChange={(e) => setData('new_customer_sim_photo', e.target.files ? e.target.files[0] : null)}
                                                    />
                                                    {errors.new_customer_sim_photo && <p className="text-[11px] text-red-500">{errors.new_customer_sim_photo}</p>}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor="new_customer_selfie_photo" className="text-xs">Foto Selfie (Opsional)</Label>
                                                    <Input
                                                        id="new_customer_selfie_photo"
                                                        type="file"
                                                        accept="image/*"
                                                        className="text-xs h-9 cursor-pointer"
                                                        onChange={(e) => setData('new_customer_selfie_photo', e.target.files ? e.target.files[0] : null)}
                                                    />
                                                    {errors.new_customer_selfie_photo && <p className="text-[11px] text-red-500">{errors.new_customer_selfie_photo}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {errors.customer_id && <p className="text-xs text-red-500">{errors.customer_id}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 2: Kendaraan & Type Sewa */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base font-semibold">Detail Kendaraan & Type Sewa</CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Pilih jenis tipe mobil dan paket sewa yang diinginkan pelanggan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Tipe Mobil yang Dipesan */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="car_type" className="text-xs font-semibold">
                                        Tipe Mobil yang Dipesan <span className="text-red-500">*</span>
                                    </Label>
                                    {hasRole('Admin') && (
                                        <button
                                            type="button"
                                            className="text-xs text-primary hover:underline font-medium focus:outline-none"
                                            onClick={() => {
                                                const nextState = !isCustomCarType;
                                                setIsCustomCarType(nextState);
                                                if (nextState) {
                                                    setData('car_type', '');
                                                } else if (availableCarTypeNames.length > 0) {
                                                    setData('car_type', availableCarTypeNames[0]);
                                                }
                                            }}
                                        >
                                            {isCustomCarType ? '← Pilih Dari Daftar Type' : '+ Ketik Manual'}
                                        </button>
                                    )}
                                </div>

                                {!isCustomCarType ? (
                                    <SearchableSelect
                                        id="car_type"
                                        options={carTypeOptions}
                                        value={data.car_type}
                                        onValueChange={(val) => setData('car_type', val)}
                                        placeholder="Pilih type kendaraan..."
                                        searchPlaceholder="Cari type kendaraan (Avanza, Innova, etc)..."
                                        emptyText="Type kendaraan tidak ditemukan."
                                    />
                                ) : (
                                    <Input
                                        id="car_type"
                                        type="text"
                                        placeholder="Contoh: Avanza, Innova, Hiace..."
                                        value={data.car_type}
                                        onChange={(e) => setData('car_type', e.target.value)}
                                        required
                                    />
                                )}
                                {errors.car_type && <p className="text-xs text-red-500">{errors.car_type}</p>}
                            </div>

                            {/* Type Sewa (DI BAWAH TIPE MOBIL YANG DIPESAN) */}
                            <div className="space-y-1">
                                <Label htmlFor="rental_type" className="text-xs font-semibold">
                                    Type Sewa <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={data.rental_type}
                                    onValueChange={(val: any) => setData('rental_type', val)}
                                >
                                    <SelectTrigger id="rental_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Lepas Kunci">Lepas Kunci</SelectItem>
                                        <SelectItem value="With Driver">With Driver</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.rental_type && <p className="text-[11px] text-red-500">{errors.rental_type}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 3: Waktu, Durasi, & Lokasi */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base font-semibold">Jadwal Sewa & Lokasi</CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Tentukan tanggal pengambilan, pengembalian, durasi hari, dan lokasi penyerahan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="booking_date" className="text-xs font-semibold">
                                        Tanggal Sewa <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="booking_date"
                                        type="date"
                                        value={data.booking_date}
                                        onChange={(e) => setData('booking_date', e.target.value)}
                                        required
                                    />
                                    {errors.booking_date && <p className="text-[11px] text-red-500">{errors.booking_date}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="pickup_time" className="text-xs font-semibold">
                                        Jam Pengambilan <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="pickup_time"
                                        type="time"
                                        value={data.pickup_time}
                                        onChange={(e) => setData('pickup_time', e.target.value)}
                                        required
                                    />
                                    {errors.pickup_time && <p className="text-[11px] text-red-500">{errors.pickup_time}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="return_date" className="text-xs font-semibold">
                                        Tanggal Balik <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="return_date"
                                        type="date"
                                        value={data.return_date}
                                        onChange={(e) => setData('return_date', e.target.value)}
                                        required
                                    />
                                    {errors.return_date && <p className="text-[11px] text-red-500">{errors.return_date}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="return_time" className="text-xs font-semibold">
                                        Jam Pengembalian <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="return_time"
                                        type="time"
                                        value={data.return_time}
                                        onChange={(e) => setData('return_time', e.target.value)}
                                        required
                                    />
                                    {errors.return_time && <p className="text-[11px] text-red-500">{errors.return_time}</p>}
                                </div>
                            </div>

                            {/* Kolom Durasi Hari (DI BAWAH TANGGAL KEMBALI) */}
                            <div className="space-y-1">
                                <Label htmlFor="duration_days" className="text-xs font-semibold">
                                    Durasi ({data.duration_type === '24 Jam' ? '24 Jam' : 'Hari'}) <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="duration_days"
                                        type="number"
                                        min={1}
                                        placeholder="1"
                                        value={data.duration_days}
                                        onChange={(e) => setData('duration_days', e.target.value)}
                                        className="pr-20"
                                        required
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none font-medium">
                                        {data.duration_type === '24 Jam' ? 'x 24 Jam' : 'Hari'}
                                    </span>
                                </div>
                                {errors.duration_days && <p className="text-[11px] text-red-500">{errors.duration_days}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                                <div className="space-y-1">
                                    <Label htmlFor="pickup_location_select" className="text-xs font-semibold flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                        Tempat Pengambilan <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={pickupOption}
                                        onValueChange={handlePickupOptionChange}
                                    >
                                        <SelectTrigger id="pickup_location_select">
                                            <SelectValue placeholder="Pilih Tempat Pengambilan..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LOCATION_PRESETS.map((loc) => (
                                                <SelectItem key={loc} value={loc}>
                                                    {loc}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {pickupOption === 'Lokasi Lain' && (
                                        <div className="pt-1.5 space-y-1">
                                            <Input
                                                id="custom_pickup_location"
                                                type="text"
                                                placeholder="Ketik alamat / detail lokasi penjemputan..."
                                                value={customPickup}
                                                onChange={(e) => handleCustomPickupChange(e.target.value)}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                    {errors.pickup_location && <p className="text-[11px] text-red-500">{errors.pickup_location}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="dropoff_location_select" className="text-xs font-semibold flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                        Tempat Pengantaran / Pengembalian <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={dropoffOption}
                                        onValueChange={handleDropoffOptionChange}
                                    >
                                        <SelectTrigger id="dropoff_location_select">
                                            <SelectValue placeholder="Pilih Tempat Pengantaran / Pengembalian..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LOCATION_PRESETS.map((loc) => (
                                                <SelectItem key={loc} value={loc}>
                                                    {loc}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {dropoffOption === 'Lokasi Lain' && (
                                        <div className="pt-1.5 space-y-1">
                                            <Input
                                                id="custom_dropoff_location"
                                                type="text"
                                                placeholder="Ketik alamat / detail lokasi pengembalian..."
                                                value={customDropoff}
                                                onChange={(e) => handleCustomDropoffChange(e.target.value)}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                    {errors.dropoff_location && <p className="text-[11px] text-red-500">{errors.dropoff_location}</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 4: Tarif & Pembayaran */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base font-semibold">Tarif Sewa & Pembayaran</CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Masukkan harga sewa, satuan tarif (Hari atau 24 Jam), fee pengantaran, dan metode pembayaran.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Kolom Metode Pembayaran & Jumlah DP (jika DP) */}
                            {data.payment_method === 'DP' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="payment_method" className="text-xs font-semibold">
                                            Metode Pembayaran <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={data.payment_method}
                                            onValueChange={(val: any) => setData('payment_method', val)}
                                        >
                                            <SelectTrigger id="payment_method">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="Transfer">Transfer</SelectItem>
                                                <SelectItem value="DP">DP (Down Payment)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.payment_method && <p className="text-[11px] text-red-500">{errors.payment_method}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="dp_amount" className="text-xs font-semibold text-primary flex items-center gap-1">
                                            Jumlah DP (Rp) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="dp_amount"
                                            type="number"
                                            min={0}
                                            placeholder="Contoh: 100000"
                                            value={data.dp_amount}
                                            onChange={(e) => setData('dp_amount', e.target.value)}
                                            required={data.payment_method === 'DP'}
                                        />
                                        {errors.dp_amount && <p className="text-[11px] text-red-500">{errors.dp_amount}</p>}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <Label htmlFor="payment_method" className="text-xs font-semibold">
                                        Metode Pembayaran <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={data.payment_method}
                                        onValueChange={(val: any) => setData('payment_method', val)}
                                    >
                                        <SelectTrigger id="payment_method">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Transfer">Transfer</SelectItem>
                                            <SelectItem value="DP">DP (Down Payment)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.payment_method && <p className="text-[11px] text-red-500">{errors.payment_method}</p>}
                                </div>
                            )}

                            {/* Kolom Harga & Pilihan Hari / 24 Jam */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="price" className="text-xs font-semibold">
                                        Harga Sewa (Rp) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        min={0}
                                        placeholder="Contoh: 350000"
                                        value={data.price}
                                        onChange={(e) => setData('price', e.target.value)}
                                        required
                                    />
                                    {errors.price && <p className="text-[11px] text-red-500">{errors.price}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="duration_type" className="text-xs font-semibold">
                                        Pilihan Tarif <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={data.duration_type}
                                        onValueChange={(val: any) => setData('duration_type', val)}
                                    >
                                        <SelectTrigger id="duration_type">
                                            <SelectValue placeholder="Pilih..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Hari">Hari</SelectItem>
                                            <SelectItem value="24 Jam">24 Jam</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.duration_type && <p className="text-[11px] text-red-500">{errors.duration_type}</p>}
                                </div>
                            </div>

                            {/* Kolom Fee Pengantaran */}
                            <div className="space-y-1">
                                <Label htmlFor="delivery_fee" className="text-xs font-semibold">
                                    Fee Pengantaran (Rp)
                                </Label>
                                <Input
                                    id="delivery_fee"
                                    type="number"
                                    min={0}
                                    placeholder="0 (Opsional / kosongkan jika tanpa fee)"
                                    value={data.delivery_fee}
                                    onChange={(e) => setData('delivery_fee', e.target.value)}
                                />
                                {errors.delivery_fee && <p className="text-[11px] text-red-500">{errors.delivery_fee}</p>}
                            </div>

                            {/* Live Total Estimasi Tarif Banner */}
                            <div className="p-4 bg-muted/40 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                                <div>
                                    <span className="font-semibold text-sm text-foreground">Total Estimasi Tarif:</span>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        ({formatCurrency(parseFloat(data.price) || 0)} × {data.duration_type === '24 Jam' ? (Number(data.duration_days) > 1 ? `${data.duration_days || 1} x 24 Jam` : '24 Jam') : `${data.duration_days || 1} Hari`})
                                        {parseFloat(data.delivery_fee) > 0 ? ` + Fee Antar ${formatCurrency(parseFloat(data.delivery_fee))}` : ''}
                                    </div>
                                    {data.payment_method === 'DP' && parseFloat(data.dp_amount) > 0 && (
                                        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                                            DP: {formatCurrency(parseFloat(data.dp_amount))} • Sisa: {formatCurrency(Math.max(0, calculatedTotal - (parseFloat(data.dp_amount) || 0)))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xl font-bold text-primary">
                                    {formatCurrency(calculatedTotal)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bottom Action Footer */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button variant="outline" asChild>
                            <Link href="/bookings">Batal</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="font-semibold gap-1.5 min-w-36"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            {processing ? 'Menyimpan...' : 'Simpan Booking'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

BookingCreate.layout = {
    breadcrumbs: [
        {
            title: 'Data Booking',
            href: '/bookings',
        },
        {
            title: 'Tambah Booking',
            href: '/bookings/create',
        },
    ],
};
