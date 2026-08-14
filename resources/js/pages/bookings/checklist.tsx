import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { MapPin, ArrowLeft, Fuel, Key, FileText, Wrench, Volume2, Snowflake, Disc, ShieldCheck, Printer, Check, AlertCircle, User, Car, Camera, UploadCloud, X, Image as ImageIcon } from 'lucide-react';
import { index as bookingsIndex } from '@/routes/bookings';
import { Link } from '@inertiajs/react';

type Booking = {
    id: number;
    car_type: string;
    booking_date: string;
    rental_type?: string;
    fuel_range_km?: number | null;
    status: 'Pending' | 'Confirmed' | 'On Trip' | 'Returned' | 'Completed';
    delivery_checklist?: Record<string, any> | null;
    return_checklist?: Record<string, any> | null;
    customer?: {
        name: string;
        phone: string | null;
        nik?: string | null;
        sim_number?: string | null;
        address?: string | null;
    };
    car?: {
        name: string;
        plate_number: string;
        mitra_name?: string | null;
        last_km?: number | null;
    };
};

type Props = {
    booking: Booking;
};

type ItemStatus = 'OK' | 'Tidak';

const CHECKLIST_ITEMS = [
    { key: 'kunci_kontak', label: 'Kunci Kontak', icon: Key },
    { key: 'copy_stnk', label: 'Copy STNK', icon: FileText },
    { key: 'ban_serep', label: 'Ban Serep', icon: Disc },
    { key: 'dongkrak', label: 'Dongkrak', icon: Wrench },
    { key: 'kunci_roda', label: 'Kunci Roda', icon: Wrench },
    { key: 'stang_dongkrak', label: 'Stang Dongkrak', icon: Wrench },
    { key: 'ac_mobil', label: 'AC Mobil', icon: Snowflake },
    { key: 'audio_mobil', label: 'Audio Mobil', icon: Volume2 },
];

export default function BookingChecklist({ booking }: Props) {
    const isDelivery = booking.status === 'Confirmed';
    const [geoStatus, setGeoStatus] = useState<string>('');
    const [gaugeModel, setGaugeModel] = useState<'dial' | 'tangga' | 'kotak'>('dial');

    const [photoPreviews, setPhotoPreviews] = useState<string[]>(() => {
        const existing = isDelivery ? booking.delivery_checklist?.photos : booking.return_checklist?.photos;
        return Array.isArray(existing) ? existing : [];
    });

    const getCurrentDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getCurrentTime = () => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const { data, setData, post, processing, errors, transform } = useForm({
        checklist: {
            kunci_kontak: 'Tidak' as ItemStatus,
            copy_stnk: 'Tidak' as ItemStatus,
            ban_serep: 'Tidak' as ItemStatus,
            dongkrak: 'Tidak' as ItemStatus,
            kunci_roda: 'Tidak' as ItemStatus,
            stang_dongkrak: 'Tidak' as ItemStatus,
            ac_mobil: 'Tidak' as ItemStatus,
            audio_mobil: 'Tidak' as ItemStatus,
            body_depan: 'Baik',
            body_belakang: 'Baik',
            body_kiri: 'Baik',
            body_kanan: 'Baik',
            body_atap: 'Baik',
            body_depan_note: '',
            body_belakang_note: '',
            body_kiri_note: '',
            body_kanan_note: '',
            body_atap_note: '',
        } as Record<string, string>,
        km_out: booking.car?.last_km ?? 0,
        fuel_out: 100,
        fuel_range_km: booking.fuel_range_km ?? 0,
        handover_location: '',
        checkout_date: getCurrentDate(),
        checkout_time: getCurrentTime(),
        checkout_datetime: '',
        latitude: '',
        longitude: '',
        notes: '',
        photos: [] as (File | string)[],
    });

    const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const currentPhotos = (data.photos || []) as (File | string)[];
        const updatedPhotos = [...currentPhotos, ...files];
        setData('photos', updatedPhotos);

        const newObjectURLs = files.map((file) => URL.createObjectURL(file));
        setPhotoPreviews((prev) => [...prev, ...newObjectURLs]);
    };

    const handlePhotoRemove = (index: number) => {
        const currentPhotos = [...((data.photos || []) as (File | string)[])];
        currentPhotos.splice(index, 1);
        setData('photos', currentPhotos);

        const updatedPreviews = [...photoPreviews];
        const removedUrl = updatedPreviews.splice(index, 1)[0];
        if (removedUrl && removedUrl.startsWith('blob:')) {
            URL.revokeObjectURL(removedUrl);
        }
        setPhotoPreviews(updatedPreviews);
    };

    const handleItemToggle = (key: string, status: ItemStatus) => {
        setData('checklist', {
            ...data.checklist,
            [key]: status,
        });
    };

    const captureLocation = () => {
        setGeoStatus('Mencari posisi lokasi...');
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setData((prevData) => ({
                        ...prevData,
                        latitude: position.coords.latitude.toString(),
                        longitude: position.coords.longitude.toString(),
                    }));
                    setGeoStatus('Geotag lokasi berhasil dikunci!');
                },
                (error) => {
                    console.error(error);
                    setGeoStatus('Gagal mengambil GPS otomatis. Silakan isi manual.');
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            setGeoStatus('Browser Anda tidak mendukung Geolocation.');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isDelivery) {
            transform((data) => ({
                ...data,
                checkout_datetime: data.checkout_date && data.checkout_time ? `${data.checkout_date} ${data.checkout_time}:00` : null,
            }));
            post(`/bookings/${booking.id}/delivery`);
        } else {
            post(`/bookings/${booking.id}/return`);
        }
    };

    return (
        <>
            <Head title={isDelivery ? 'Checklist Serah Terima Mobil' : 'Checklist Pengembalian Mobil'} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <Link href={bookingsIndex().url} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-4 w-4" /> Kembali ke Data Booking
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden md:flex items-center gap-1.5">
                        <Printer className="h-4 w-4" /> Cetak Form Checklist
                    </Button>
                </div>

                {/* Form Header Title */}
                <div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary mb-1.5">
                            {isDelivery ? 'FORM SEBELUM SEWA (PENYERAHAN)' : 'FORM SESUDAH SEWA (PENGEMBALIAN)'}
                        </span>
                        <h1 className="text-2xl font-bold tracking-tight">Check List Serah Terima Mobil</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Verifikasi fisik kendaraan, kelengkapan unit, meteran BBM & KM bersama penyewa.
                        </p>
                    </div>
                </div>

                {/* PIHAK PENYEWA & UNIT ARMADA CARD (Mirroring physical paper form) */}
                <div className="bg-card rounded-xl border shadow-xs p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* PIHAK PENYEWA */}
                        <div className="space-y-2 border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b pb-2">
                                <User className="h-4 w-4" /> Pihak Penyewa
                            </h3>
                            <div className="space-y-2 text-xs pt-1">
                                <div className="grid grid-cols-12 items-baseline py-1 border-b border-dashed border-muted">
                                    <span className="col-span-5 text-muted-foreground font-medium">Nama</span>
                                    <span className="col-span-7 font-bold text-foreground text-right">{booking.customer?.name || '-'}</span>
                                </div>
                                <div className="grid grid-cols-12 items-baseline py-1 border-b border-dashed border-muted">
                                    <span className="col-span-5 text-muted-foreground font-medium">No. Identitas ( KTP/SIM )</span>
                                    <span className="col-span-7 font-mono font-semibold text-foreground text-right">{booking.customer?.nik || booking.customer?.sim_number || '-'}</span>
                                </div>
                                <div className="grid grid-cols-12 items-baseline py-1 border-b border-dashed border-muted">
                                    <span className="col-span-5 text-muted-foreground font-medium">Alamat</span>
                                    <span className="col-span-7 font-medium text-foreground text-right leading-snug">{booking.customer?.address || '-'}</span>
                                </div>
                                <div className="grid grid-cols-12 items-baseline py-1 border-b border-dashed border-muted">
                                    <span className="col-span-5 text-muted-foreground font-medium">No. Telpon Aktif</span>
                                    <span className="col-span-7 font-mono font-semibold text-foreground text-right">{booking.customer?.phone || '-'}</span>
                                </div>
                                <div className="grid grid-cols-12 items-baseline py-1">
                                    <span className="col-span-5 text-muted-foreground font-medium">Kelengkapan Penyewa</span>
                                    <span className="col-span-7 font-semibold text-amber-600 dark:text-amber-400 text-right">KTP / SIM / Deposit Unit</span>
                                </div>
                            </div>
                        </div>

                        {/* UNIT ARMADA */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b pb-2">
                                <Car className="h-4 w-4" /> Data Unit Armada
                            </h3>
                            <div className="space-y-2 text-xs pt-1">
                                <div className="grid grid-cols-12 items-baseline py-1 border-b border-dashed border-muted">
                                    <span className="col-span-5 text-muted-foreground font-medium">Nama Kendaraan</span>
                                    <span className="col-span-7 font-bold text-foreground text-right">{booking.car?.name || '-'}</span>
                                </div>
                                <div className="grid grid-cols-12 items-baseline py-1 border-b border-dashed border-muted">
                                    <span className="col-span-5 text-muted-foreground font-medium">No. Polisi (Plat)</span>
                                    <span className="col-span-7 font-mono font-bold text-foreground text-right bg-muted/40 px-2 py-0.5 rounded border inline-block">{booking.car?.plate_number || '-'}</span>
                                </div>
                                <div className="grid grid-cols-12 items-baseline py-1 border-b border-dashed border-muted">
                                    <span className="col-span-5 text-muted-foreground font-medium">Tipe Layanan</span>
                                    <span className="col-span-7 font-semibold text-foreground text-right">{booking.rental_type || 'Lepas Kunci'}</span>
                                </div>
                                <div className="grid grid-cols-12 items-baseline py-1">
                                    <span className="col-span-5 text-muted-foreground font-medium">KM Terakhir</span>
                                    <span className="col-span-7 font-mono font-semibold text-foreground text-right">{booking.car?.last_km ? `${booking.car.last_km.toLocaleString()} KM` : '0 KM'}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Main Physical Checklist Grid (Form Mirroring physical document) */}
                    <div className="grid gap-6 md:grid-cols-12">

                        {/* LEFT COLUMN: Data Sebelum / Sesudah Sewa & Fuel Gauge */}
                        <div className="md:col-span-6 space-y-6">
                            <Card className="border-2 border-primary/20 shadow-xs h-full flex flex-col justify-between">
                                <CardHeader className="bg-primary/5 border-b pb-3">
                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                        <span>{isDelivery ? 'SEBELUM SEWA' : 'SESUDAH SEWA (PENGEMBALIAN)'}</span>
                                        <span className="text-xs font-normal text-muted-foreground">Detail Meteran Unit</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4 flex-1">
                                    {/* Range / KM Keluar / Masuk */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="km_out" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {isDelivery ? 'Range (KM Keluar)' : 'Range / KM Masuk (Saat Kembali)'}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="km_out"
                                                type="number"
                                                min={0}
                                                value={data.km_out}
                                                onChange={(e) => setData('km_out', parseInt(e.target.value) || 0)}
                                                className="font-mono text-lg font-bold pr-12"
                                                required
                                            />
                                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">KM</span>
                                        </div>
                                        {errors.km_out && <p className="text-xs text-red-500">{errors.km_out}</p>}
                                    </div>

                                    {/* Jam & Tanggal */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="checkout_time" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {isDelivery ? 'Jam Keluar' : 'Jam Masuk'}
                                            </Label>
                                            <Input
                                                id="checkout_time"
                                                type="time"
                                                value={data.checkout_time}
                                                onChange={(e) => setData('checkout_time', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="checkout_date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {isDelivery ? 'Tanggal Keluar' : 'Tanggal Masuk'}
                                            </Label>
                                            <Input
                                                id="checkout_date"
                                                type="date"
                                                value={data.checkout_date}
                                                onChange={(e) => setData('checkout_date', e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Lokasi Penyerahan / Pengembalian */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="handover_location" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {isDelivery ? 'Lok. Penyerahan' : 'Lok. Pengembalian'}
                                        </Label>
                                        <Input
                                            id="handover_location"
                                            value={data.handover_location}
                                            onChange={(e) => setData('handover_location', e.target.value)}
                                            placeholder="Misal: Bandara, Alamat Rumah, Garasi Unit"
                                        />
                                    </div>

                                    {/* Three Fuel Indicators with Dropdown Selector */}
                                    <div className="pt-2 border-t mt-4 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <Label htmlFor="gauge_model" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <Fuel className="h-4 w-4 text-amber-500" /> Indicator Fuel (BBM)
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    id="gauge_model"
                                                    value={gaugeModel}
                                                    onChange={(e) => setGaugeModel(e.target.value as any)}
                                                    className="text-xs font-medium bg-background border rounded-md px-2.5 py-1 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-xs"
                                                >
                                                    <option value="dial">Model 1: Dial / Busur</option>
                                                    <option value="tangga">Model 2: Tangga (Vertikal)</option>
                                                    <option value="kotak">Model 3: Kotak (Horisontal)</option>
                                                </select>
                                                <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900 whitespace-nowrap">
                                                    {data.fuel_out}% ({data.fuel_out >= 100 ? 'Full' : data.fuel_out >= 75 ? '3/4' : data.fuel_out >= 50 ? '1/2' : data.fuel_out >= 25 ? '1/4' : 'Empty'})
                                                </span>
                                            </div>
                                        </div>

                                        {/* Active Selected Model Display */}
                                        <div className="bg-card p-4 rounded-xl border shadow-xs flex flex-col items-center justify-center space-y-4">
                                            {/* Model 1: Dial / Busur */}
                                            {gaugeModel === 'dial' && (
                                                <div className="flex flex-col items-center justify-center py-2">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase mb-2">Tampilan Model Dial / Busur</span>
                                                    <div className="relative w-44 h-24 flex items-end justify-center">
                                                        <svg viewBox="0 0 100 55" className="w-full h-full">
                                                            <path
                                                                d="M 10 50 A 40 40 0 0 1 90 50"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="8"
                                                                className="text-muted/50"
                                                            />
                                                            <path
                                                                d="M 10 50 A 40 40 0 0 1 90 50"
                                                                fill="none"
                                                                stroke="url(#fuelGradMain)"
                                                                strokeWidth="8"
                                                                strokeDasharray="126"
                                                                strokeDashoffset={126 - (data.fuel_out / 100) * 126}
                                                                className="transition-all duration-300"
                                                            />
                                                            <defs>
                                                                <linearGradient id="fuelGradMain" x1="0%" y1="0%" x2="100%" y2="0%">
                                                                    <stop offset="0%" stopColor="#ef4444" />
                                                                    <stop offset="50%" stopColor="#f59e0b" />
                                                                    <stop offset="100%" stopColor="#10b981" />
                                                                </linearGradient>
                                                            </defs>
                                                            <line x1="10" y1="50" x2="16" y2="50" stroke="currentColor" strokeWidth="2" className="text-foreground" />
                                                            <line x1="22" y1="22" x2="26" y2="26" stroke="currentColor" strokeWidth="2" className="text-foreground" />
                                                            <line x1="50" y1="10" x2="50" y2="16" stroke="currentColor" strokeWidth="2" className="text-foreground" />
                                                            <line x1="78" y1="22" x2="74" y2="26" stroke="currentColor" strokeWidth="2" className="text-foreground" />
                                                            <line x1="90" y1="50" x2="84" y2="50" stroke="currentColor" strokeWidth="2" className="text-foreground" />

                                                            {(() => {
                                                                const angle = 180 - (data.fuel_out / 100) * 180;
                                                                const rad = (angle * Math.PI) / 180;
                                                                const nx = 50 + 32 * Math.cos(rad);
                                                                const ny = 50 - 32 * Math.sin(rad);
                                                                return (
                                                                    <g>
                                                                        <line x1="50" y1="50" x2={nx} y2={ny} stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
                                                                        <circle cx="50" cy="50" r="4" fill="#dc2626" />
                                                                    </g>
                                                                );
                                                            })()}
                                                        </svg>
                                                        <div className="absolute bottom-0 inset-x-0 flex justify-between px-2 text-xs font-bold text-muted-foreground">
                                                            <span>E</span>
                                                            <Fuel className="h-4 w-4 text-amber-500 self-end mb-0.5" />
                                                            <span>F</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Model 2: Tangga (Vertikal) */}
                                            {gaugeModel === 'tangga' && (
                                                <div className="flex flex-col items-center justify-center py-2">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase mb-2">Tampilan Model Tangga (Vertikal)</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-muted-foreground">F (Full)</span>
                                                        <div className="flex flex-col gap-1 w-8 h-28 justify-end border-2 p-1 rounded-md bg-muted/20">
                                                            {[7, 6, 5, 4, 3, 2, 1, 0].map((step) => {
                                                                const active = data.fuel_out >= (step + 1) * 12.5;
                                                                return (
                                                                    <div
                                                                        key={step}
                                                                        className={`h-2.5 rounded-xs transition-all ${active ? (step < 2 ? 'bg-red-500' : step < 5 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-muted/60'
                                                                            }`}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                        <span className="text-xs font-bold text-muted-foreground">E (Empty)</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Model 3: Kotak (Horisontal) */}
                                            {gaugeModel === 'kotak' && (
                                                <div className="flex flex-col items-center justify-center py-2 w-full max-w-xs">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase mb-2">Tampilan Model Kotak (Horisontal)</span>
                                                    <div className="flex flex-col items-center gap-1.5 w-full">
                                                        <div className="flex w-full justify-between text-xs font-bold text-muted-foreground">
                                                            <span>E (Empty)</span>
                                                            <span>F (Full)</span>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-1.5 w-full h-10 border-2 p-1.5 rounded-lg bg-muted/20">
                                                            {[25, 50, 75, 100].map((val) => (
                                                                <div
                                                                    key={val}
                                                                    className={`h-full rounded-sm transition-all ${data.fuel_out >= val ? 'bg-emerald-500' : 'bg-muted/60'
                                                                        }`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Slider Level BBM Selector & Range BBM (KM) Below Active Model */}
                                            <div className="w-full pt-3 border-t max-w-md mx-auto space-y-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-xs font-semibold text-muted-foreground">Geser Slider Level BBM:</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <Input
                                                            type="text"
                                                            readOnly
                                                            disabled
                                                            value={`${data.fuel_out}%`}
                                                            className="w-20 font-mono text-center font-bold text-sm h-8 border-amber-400/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 opacity-100 cursor-not-allowed select-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5 px-1">
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        value={data.fuel_out}
                                                        onChange={(e) => setData('fuel_out', parseInt(e.target.value) || 0)}
                                                        className="w-full accent-amber-600 cursor-pointer h-2 bg-muted rounded-lg appearance-none focus:outline-hidden"
                                                    />
                                                    <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                                                        <button type="button" onClick={() => setData('fuel_out', 0)} className={`hover:text-amber-600 transition-colors ${data.fuel_out === 0 ? 'text-amber-600 font-extrabold' : ''}`}>0% (Empty)</button>
                                                        <button type="button" onClick={() => setData('fuel_out', 100)} className={`hover:text-amber-600 transition-colors ${data.fuel_out === 100 ? 'text-amber-600 font-extrabold' : ''}`}>100% (Full)</button>
                                                    </div>
                                                </div>

                                                {/* Input Range BBM (KM) */}
                                                <div className="pt-3 border-t flex items-center justify-between gap-3">
                                                    <Label htmlFor="fuel_range_km" className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                                        Range BBM (KM):
                                                    </Label>
                                                    <div className="relative w-36">
                                                        <Input
                                                            id="fuel_range_km"
                                                            type="number"
                                                            min={0}
                                                            value={data.fuel_range_km}
                                                            onChange={(e) => setData('fuel_range_km', parseInt(e.target.value) || 0)}
                                                            placeholder="Misal: 450"
                                                            className="font-mono text-center font-bold text-sm h-8 border-amber-400 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/40 dark:bg-amber-950/20 pr-10"
                                                        />
                                                        <span className="absolute right-3 top-1.5 text-xs text-amber-600 dark:text-amber-400 font-bold">KM</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: Check List Status (OK / Tidak) */}
                        <div className="md:col-span-6 space-y-6">
                            <Card className="border-2 border-primary/20 shadow-xs h-full flex flex-col justify-between">
                                <CardHeader className="bg-primary/5 border-b pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base font-bold">Status Kelengkapan Unit</CardTitle>
                                        <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-muted-foreground pr-2">
                                            <span className="text-green-600 dark:text-green-400">OK</span>
                                            <span className="text-red-600 dark:text-red-400">TIDAK</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="divide-y p-0 flex-1">
                                    {CHECKLIST_ITEMS.map((item) => {
                                        const ItemIcon = item.icon;
                                        const currentStatus = data.checklist[item.key] || 'Tidak';
                                        return (
                                            <div key={item.key} className="flex items-center justify-between p-3 px-4 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-2.5">
                                                    <ItemIcon className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{item.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={currentStatus === 'OK' ? 'default' : 'outline'}
                                                        className={`h-8 px-3 text-xs font-bold transition-all ${currentStatus === 'OK'
                                                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-xs'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        onClick={() => handleItemToggle(item.key, 'OK')}
                                                    >
                                                        <Check className="h-3.5 w-3.5 mr-1" /> OK
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={currentStatus === 'Tidak' ? 'destructive' : 'outline'}
                                                        className={`h-8 px-3 text-xs font-bold transition-all ${currentStatus === 'Tidak'
                                                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        onClick={() => handleItemToggle(item.key, 'Tidak')}
                                                    >
                                                        <AlertCircle className="h-3.5 w-3.5 mr-1" /> Tidak
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Diagram Inspeksi Kondisi Fisik Bodi Mobil (5 Sisi) */}
                    <Card className="border-2 border-primary/20 shadow-xs">
                        <CardHeader className="bg-primary/5 border-b pb-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Car className="h-5 w-5 text-primary" /> Inspeksi Kondisi Fisik Bodi Mobil
                                    </CardTitle>
                                    <CardDescription>Diagram kondisi bodi kendaraan 5 sisi (Tandai kondisi baret, penyok, atau rusak).</CardDescription>
                                </div>

                                {/* Legend Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold bg-background p-1.5 rounded-lg border shadow-2xs">
                                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300">✓ Baik / Tidak Ada</span>
                                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300">// Baret</span>
                                    <span className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-300">O Penyok</span>
                                    <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300">X Rusak</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="bg-muted/20 p-4 rounded-xl border flex flex-col items-center justify-center space-y-4">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Diagram 5 Sisi Bodi (Klik Status Langsung Pada Diagram)</span>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full items-stretch">

                                    {/* Column 1: Samping Kiri & Samping Kanan */}
                                    <div className="space-y-4 flex flex-col justify-between">
                                        {/* Samping Kiri Card */}
                                        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all space-y-3 ${
                                            data.checklist.body_kiri === 'Baret' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs' :
                                            data.checklist.body_kiri === 'Penyok' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20 shadow-xs' :
                                            data.checklist.body_kiri === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-card border-border'
                                        }`}>
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-bold text-foreground">Samping Kiri</span>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                                    data.checklist.body_kiri === 'Baret' ? 'bg-amber-500 text-white border-amber-600' :
                                                    data.checklist.body_kiri === 'Penyok' ? 'bg-orange-500 text-white border-orange-600' :
                                                    data.checklist.body_kiri === 'Rusak' ? 'bg-red-500 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-700'
                                                }`}>{data.checklist.body_kiri || 'Baik'}</span>
                                            </div>
                                            <div className="py-2 flex items-center justify-center w-full min-h-[90px]">
                                                <svg viewBox="0 0 160 65" className="w-full h-20 max-w-[220px]">
                                                    <path d="M 10 42 Q 15 25 35 20 Q 55 12 90 12 Q 130 12 145 28 L 155 35 L 155 45 Q 155 48 150 48 L 10 48 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                                                    <path d="M 38 22 L 72 22 L 72 34 L 28 34 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
                                                    <path d="M 76 22 L 125 22 Q 135 22 138 34 L 76 34 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
                                                    <circle cx="38" cy="48" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                                                    <circle cx="38" cy="48" r="5" fill="currentColor" className="text-muted-foreground" />
                                                    <circle cx="125" cy="48" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                                                    <circle cx="125" cy="48" r="5" fill="currentColor" className="text-muted-foreground" />
                                                </svg>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 w-full pt-2 border-t">
                                                {[
                                                    { status: 'Baik', label: '✓ Baik', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
                                                    { status: 'Baret', label: '// Baret', activeClass: 'bg-amber-600 text-white border-amber-600' },
                                                    { status: 'Penyok', label: 'O Penyok', activeClass: 'bg-orange-600 text-white border-orange-600' },
                                                    { status: 'Rusak', label: 'X Rusak', activeClass: 'bg-red-600 text-white border-red-600' },
                                                ].map((st) => (
                                                    <Button
                                                        key={st.status}
                                                        type="button"
                                                        size="sm"
                                                        variant={(data.checklist.body_kiri || 'Baik') === st.status ? 'default' : 'outline'}
                                                        className={`h-7 px-1 text-[10px] font-bold ${
                                                            (data.checklist.body_kiri || 'Baik') === st.status ? st.activeClass : 'hover:bg-muted text-muted-foreground'
                                                        }`}
                                                        onClick={() => setData('checklist', { ...data.checklist, body_kiri: st.status })}
                                                    >
                                                        {st.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Input
                                                type="text"
                                                placeholder="Catatan / rincian baret Samping Kiri..."
                                                value={data.checklist.body_kiri_note || ''}
                                                onChange={(e) => setData('checklist', { ...data.checklist, body_kiri_note: e.target.value })}
                                                className="h-7 text-[11px] placeholder:text-muted-foreground/60 bg-background/80"
                                            />
                                        </div>

                                        {/* Samping Kanan Card */}
                                        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all space-y-3 ${
                                            data.checklist.body_kanan === 'Baret' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs' :
                                            data.checklist.body_kanan === 'Penyok' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20 shadow-xs' :
                                            data.checklist.body_kanan === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-card border-border'
                                        }`}>
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-bold text-foreground">Samping Kanan</span>
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                                    data.checklist.body_kanan === 'Baret' ? 'bg-amber-500 text-white border-amber-600' :
                                                    data.checklist.body_kanan === 'Penyok' ? 'bg-orange-500 text-white border-orange-600' :
                                                    data.checklist.body_kanan === 'Rusak' ? 'bg-red-500 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-700'
                                                }`}>{data.checklist.body_kanan || 'Baik'}</span>
                                            </div>
                                            <div className="py-2 flex items-center justify-center w-full min-h-[90px]">
                                                <svg viewBox="0 0 160 65" className="w-full h-20 max-w-[220px] scale-x-[-1]">
                                                    <path d="M 10 42 Q 15 25 35 20 Q 55 12 90 12 Q 130 12 145 28 L 155 35 L 155 45 Q 155 48 150 48 L 10 48 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                                                    <path d="M 38 22 L 72 22 L 72 34 L 28 34 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
                                                    <path d="M 76 22 L 125 22 Q 135 22 138 34 L 76 34 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
                                                    <circle cx="38" cy="48" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                                                    <circle cx="38" cy="48" r="5" fill="currentColor" className="text-muted-foreground" />
                                                    <circle cx="125" cy="48" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                                                    <circle cx="125" cy="48" r="5" fill="currentColor" className="text-muted-foreground" />
                                                </svg>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 w-full pt-2 border-t">
                                                {[
                                                    { status: 'Baik', label: '✓ Baik', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
                                                    { status: 'Baret', label: '// Baret', activeClass: 'bg-amber-600 text-white border-amber-600' },
                                                    { status: 'Penyok', label: 'O Penyok', activeClass: 'bg-orange-600 text-white border-orange-600' },
                                                    { status: 'Rusak', label: 'X Rusak', activeClass: 'bg-red-600 text-white border-red-600' },
                                                ].map((st) => (
                                                    <Button
                                                        key={st.status}
                                                        type="button"
                                                        size="sm"
                                                        variant={(data.checklist.body_kanan || 'Baik') === st.status ? 'default' : 'outline'}
                                                        className={`h-7 px-1 text-[10px] font-bold ${
                                                            (data.checklist.body_kanan || 'Baik') === st.status ? st.activeClass : 'hover:bg-muted text-muted-foreground'
                                                        }`}
                                                        onClick={() => setData('checklist', { ...data.checklist, body_kanan: st.status })}
                                                    >
                                                        {st.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Input
                                                type="text"
                                                placeholder="Catatan baret Samping Kanan..."
                                                value={data.checklist.body_kanan_note || ''}
                                                onChange={(e) => setData('checklist', { ...data.checklist, body_kanan_note: e.target.value })}
                                                className="h-7 text-[11px] placeholder:text-muted-foreground/60 bg-background/80"
                                            />
                                        </div>
                                    </div>

                                    {/* Column 2: Tampak Atas (Top View) */}
                                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all space-y-3 h-full ${
                                        data.checklist.body_atap === 'Baret' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs' :
                                        data.checklist.body_atap === 'Penyok' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20 shadow-xs' :
                                        data.checklist.body_atap === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-card border-border'
                                    }`}>
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-xs font-bold text-foreground">Tampak Atas / Atap</span>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                                data.checklist.body_atap === 'Baret' ? 'bg-amber-500 text-white border-amber-600' :
                                                data.checklist.body_atap === 'Penyok' ? 'bg-orange-500 text-white border-orange-600' :
                                                data.checklist.body_atap === 'Rusak' ? 'bg-red-500 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-700'
                                            }`}>{data.checklist.body_atap || 'Baik'}</span>
                                        </div>
                                        <div className="py-2 flex items-center justify-center w-full flex-1">
                                            <svg viewBox="0 0 80 130" className="w-24 h-40 my-1">
                                                <rect x="15" y="10" width="50" height="110" rx="15" fill="none" stroke="currentColor" strokeWidth="2" />
                                                <path d="M 20 30 Q 40 25 60 30 L 58 45 L 22 45 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
                                                <rect x="22" y="48" width="36" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
                                                <path d="M 22 92 L 58 92 L 60 102 Q 40 106 20 102 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
                                                <rect x="8" y="32" width="6" height="12" rx="2" fill="currentColor" className="text-muted-foreground" />
                                                <rect x="66" y="32" width="6" height="12" rx="2" fill="currentColor" className="text-muted-foreground" />
                                            </svg>
                                        </div>
                                        <div className="space-y-2 w-full">
                                            <div className="grid grid-cols-2 gap-1 w-full pt-2 border-t">
                                                {[
                                                    { status: 'Baik', label: '✓ Baik', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
                                                    { status: 'Baret', label: '// Baret', activeClass: 'bg-amber-600 text-white border-amber-600' },
                                                    { status: 'Penyok', label: 'O Penyok', activeClass: 'bg-orange-600 text-white border-orange-600' },
                                                    { status: 'Rusak', label: 'X Rusak', activeClass: 'bg-red-600 text-white border-red-600' },
                                                ].map((st) => (
                                                    <Button
                                                        key={st.status}
                                                        type="button"
                                                        size="sm"
                                                        variant={(data.checklist.body_atap || 'Baik') === st.status ? 'default' : 'outline'}
                                                        className={`h-7 px-1 text-[10px] font-bold ${
                                                            (data.checklist.body_atap || 'Baik') === st.status ? st.activeClass : 'hover:bg-muted text-muted-foreground'
                                                        }`}
                                                        onClick={() => setData('checklist', { ...data.checklist, body_atap: st.status })}
                                                    >
                                                        {st.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Input
                                                type="text"
                                                placeholder="Catatan baret Atap / Atas..."
                                                value={data.checklist.body_atap_note || ''}
                                                onChange={(e) => setData('checklist', { ...data.checklist, body_atap_note: e.target.value })}
                                                className="h-7 text-[11px] placeholder:text-muted-foreground/60 bg-background/80"
                                            />
                                        </div>
                                    </div>

                                    {/* Column 3: Tampak Depan & Belakang */}
                                    <div className="space-y-4 flex flex-col justify-between">
                                        {/* Tampak Depan Card */}
                                        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all space-y-3 ${
                                            data.checklist.body_depan === 'Baret' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs' :
                                            data.checklist.body_depan === 'Penyok' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20 shadow-xs' :
                                            data.checklist.body_depan === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-card border-border'
                                        }`}>
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-bold text-foreground">Tampak Depan</span>
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                                    data.checklist.body_depan === 'Baret' ? 'bg-amber-500 text-white border-amber-600' :
                                                    data.checklist.body_depan === 'Penyok' ? 'bg-orange-500 text-white border-orange-600' :
                                                    data.checklist.body_depan === 'Rusak' ? 'bg-red-500 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-700'
                                                }`}>{data.checklist.body_depan || 'Baik'}</span>
                                            </div>
                                            <div className="py-2 flex items-center justify-center w-full min-h-[90px]">
                                                <svg viewBox="0 0 110 65" className="w-full h-20 max-w-[180px]">
                                                    <path d="M 15 45 Q 20 22 35 15 Q 55 12 75 15 Q 90 22 95 45 L 95 55 Q 95 58 90 58 L 20 58 Q 15 58 15 55 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                                                    <path d="M 24 25 Q 55 18 86 25 L 82 36 L 28 36 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
                                                    <rect x="18" y="42" width="18" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                                    <rect x="74" y="42" width="18" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                                    <rect x="42" y="46" width="26" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
                                                </svg>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 w-full pt-2 border-t">
                                                {[
                                                    { status: 'Baik', label: '✓ Baik', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
                                                    { status: 'Baret', label: '// Baret', activeClass: 'bg-amber-600 text-white border-amber-600' },
                                                    { status: 'Penyok', label: 'O Penyok', activeClass: 'bg-orange-600 text-white border-orange-600' },
                                                    { status: 'Rusak', label: 'X Rusak', activeClass: 'bg-red-600 text-white border-red-600' },
                                                ].map((st) => (
                                                    <Button
                                                        key={st.status}
                                                        type="button"
                                                        size="sm"
                                                        variant={(data.checklist.body_depan || 'Baik') === st.status ? 'default' : 'outline'}
                                                        className={`h-7 px-1 text-[10px] font-bold ${
                                                            (data.checklist.body_depan || 'Baik') === st.status ? st.activeClass : 'hover:bg-muted text-muted-foreground'
                                                        }`}
                                                        onClick={() => setData('checklist', { ...data.checklist, body_depan: st.status })}
                                                    >
                                                        {st.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Input
                                                type="text"
                                                placeholder="Catatan baret Tampak Depan..."
                                                value={data.checklist.body_depan_note || ''}
                                                onChange={(e) => setData('checklist', { ...data.checklist, body_depan_note: e.target.value })}
                                                className="h-7 text-[11px] placeholder:text-muted-foreground/60 bg-background/80"
                                            />
                                        </div>

                                        {/* Tampak Belakang Card */}
                                        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all space-y-3 ${
                                            data.checklist.body_belakang === 'Baret' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs' :
                                            data.checklist.body_belakang === 'Penyok' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20 shadow-xs' :
                                            data.checklist.body_belakang === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-card border-border'
                                        }`}>
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-bold text-foreground">Tampak Belakang</span>
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                                    data.checklist.body_belakang === 'Baret' ? 'bg-amber-500 text-white border-amber-600' :
                                                    data.checklist.body_belakang === 'Penyok' ? 'bg-orange-500 text-white border-orange-600' :
                                                    data.checklist.body_belakang === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-emerald-600 text-white border-emerald-700'
                                                }`}>{data.checklist.body_belakang || 'Baik'}</span>
                                            </div>
                                            <div className="py-2 flex items-center justify-center w-full min-h-[90px]">
                                                <svg viewBox="0 0 110 65" className="w-full h-20 max-w-[180px]">
                                                    <path d="M 15 45 Q 20 22 35 15 Q 55 12 75 15 Q 90 22 95 45 L 95 55 Q 95 58 90 58 L 20 58 Q 15 58 15 55 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                                                    <path d="M 26 24 Q 55 20 84 24 L 80 35 L 30 35 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
                                                    <rect x="18" y="42" width="20" height="7" rx="2" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                                                    <rect x="72" y="42" width="20" height="7" rx="2" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                                                    <rect x="42" y="45" width="26" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
                                                </svg>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 w-full pt-2 border-t">
                                                {[
                                                    { status: 'Baik', label: '✓ Baik', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
                                                    { status: 'Baret', label: '// Baret', activeClass: 'bg-amber-600 text-white border-amber-600' },
                                                    { status: 'Penyok', label: 'O Penyok', activeClass: 'bg-orange-600 text-white border-orange-600' },
                                                    { status: 'Rusak', label: 'X Rusak', activeClass: 'bg-red-600 text-white border-red-600' },
                                                ].map((st) => (
                                                    <Button
                                                        key={st.status}
                                                        type="button"
                                                        size="sm"
                                                        variant={(data.checklist.body_belakang || 'Baik') === st.status ? 'default' : 'outline'}
                                                        className={`h-7 px-1 text-[10px] font-bold ${
                                                            (data.checklist.body_belakang || 'Baik') === st.status ? st.activeClass : 'hover:bg-muted text-muted-foreground'
                                                        }`}
                                                        onClick={() => setData('checklist', { ...data.checklist, body_belakang: st.status })}
                                                    >
                                                        {st.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Input
                                                type="text"
                                                placeholder="Catatan baret Tampak Belakang..."
                                                value={data.checklist.body_belakang_note || ''}
                                                onChange={(e) => setData('checklist', { ...data.checklist, body_belakang_note: e.target.value })}
                                                className="h-7 text-[11px] placeholder:text-muted-foreground/60 bg-background/80"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Geotagging section - only for Delivery (Pengeluaran) checklist */}
                    {isDelivery && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-primary" /> Geotagging Lokasi Penyerahan
                                </CardTitle>
                                <CardDescription>Kunci titik koordinat GPS saat menyerahkan kunci ke konsumen.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button type="button" onClick={captureLocation} variant="outline" className="flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4 text-blue-500" /> Ambil Lokasi GPS (Geotag)
                                    </Button>
                                    <span className="text-xs font-medium text-muted-foreground">{geoStatus}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                                        <Input
                                            id="latitude"
                                            value={data.latitude}
                                            onChange={(e) => setData('latitude', e.target.value)}
                                            placeholder="Contoh: -8.6500"
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                                        <Input
                                            id="longitude"
                                            value={data.longitude}
                                            onChange={(e) => setData('longitude', e.target.value)}
                                            placeholder="Contoh: 115.2167"
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Foto Dokumentasi Unit Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Camera className="h-5 w-5 text-primary" /> Foto Dokumentasi Unit & Serah Terima
                                </span>
                                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                                    {photoPreviews.length} Foto Terpilih
                                </span>
                            </CardTitle>
                            <CardDescription>
                                Upload foto kondisi fisik mobil, odometer/speedometer, baret/penyok, atau foto penyerahan unit dengan penyewa.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Input
                                id="photo-upload-input"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoAdd}
                                className="hidden"
                            />

                            {/* Photo Gallery Grid / Clickable Box */}
                            {photoPreviews.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                                    {photoPreviews.map((url, idx) => (
                                        <div key={idx} className="relative group aspect-4/3 rounded-xl border bg-muted/30 overflow-hidden shadow-xs">
                                            <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handlePhotoRemove(idx)}
                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 text-white shadow-md hover:bg-red-700 transition-transform active:scale-95"
                                                title="Hapus foto ini"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold backdrop-blur-xs">
                                                Foto #{idx + 1}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Add Photo Card */}
                                    <Label
                                        htmlFor="photo-upload-input"
                                        className="cursor-pointer aspect-4/3 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1.5 transition-all text-center p-2 group shadow-2xs"
                                    >
                                        <Camera className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-bold text-primary">+ Tambah Foto</span>
                                    </Label>
                                </div>
                            ) : (
                                <Label
                                    htmlFor="photo-upload-input"
                                    className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 rounded-xl p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 transition-all group shadow-2xs bg-card"
                                >
                                    <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 text-primary transition-colors">
                                        <Camera className="h-8 w-8" />
                                    </div>
                                    <p className="font-bold text-foreground text-sm">Ambil / Upload Foto Dokumentasi Unit</p>
                                    <p className="text-muted-foreground max-w-sm">
                                        Klik kotak ini untuk memilih foto fisik kendaraan & odometer (Bisa pilih sekaligus / buka kamera HP).
                                    </p>
                                    <span className="text-[11px] font-medium text-primary/80 bg-primary/10 px-3 py-1 rounded-full mt-1">
                                        Format: JPG, PNG, WebP
                                    </span>
                                </Label>
                            )}
                        </CardContent>
                    </Card>

                    {/* Inspection Notes */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold">Catatan Kondisi / Baret Tambahan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Catat kondisi fisik kendaraan (misal: baret halus di pintu kanan belakang, bensin tidak full, dll)..."
                                className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </CardContent>
                    </Card>

                    <Button type="submit" size="lg" className="w-full font-bold text-base h-12 shadow-md" disabled={processing}>
                        <ShieldCheck className="h-5 w-5 mr-2" />
                        {isDelivery ? 'Simpan & Konfirmasi Serah Terima Mobil' : 'Simpan & Konfirmasi Pengembalian Mobil'}
                    </Button>
                </form>
            </div>
        </>
    );
}

BookingChecklist.layout = {
    breadcrumbs: [
        {
            title: 'Bookings',
            href: bookingsIndex(),
        },
        {
            title: 'Checklist Serah Terima',
            href: '#',
        },
    ],
};
