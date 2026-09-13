import { Head, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';
import { ArrowLeft, Fuel, Key, FileText, Wrench, Volume2, Snowflake, Disc, ShieldCheck, Printer, Check, AlertCircle, AlertTriangle, User, Car, Camera, UploadCloud, X, Image as ImageIcon, CheckSquare, Lock, MapPin, Navigation, Crosshair, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { index as bookingsIndex } from '@/routes/bookings';
import { Link } from '@inertiajs/react';
import { maskPhoneNumber } from '@/lib/utils';

type Booking = {
    id: number;
    car_type: string;
    booking_date: string;
    rental_type?: string;
    fuel_range_km?: number | null;
    status: 'Pending' | 'Confirmed' | 'On Trip' | 'Returned' | 'Completed';
    delivery_checklist?: Record<string, any> | null;
    return_checklist?: Record<string, any> | null;
    delivery_latitude?: string | null;
    delivery_longitude?: string | null;
    delivery_notes?: string | null;
    return_latitude?: string | null;
    return_longitude?: string | null;
    return_notes?: string | null;
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
    rental?: {
        km_out?: number | null;
        km_in?: number | null;
        fuel_out?: number | null;
        fuel_in?: number | null;
    } | null;
};

type FormFields = {
    checklist: Record<string, string>;
    km_out: number;
    fuel_out: number;
    fuel_range_km: number;
    handover_location: string;
    latitude: string;
    longitude: string;
    checkout_date: string;
    checkout_time: string;
    checkout_datetime: string;
    notes: string;
    photos: (File | string)[];
};

type Props = {
    booking: Booking;
};

type ItemStatus = 'OK' | 'Tidak';

const CHECKLIST_ITEMS = [
    { key: 'kunci_kontak', label: 'Kunci Kontak Utama & Cadangan', icon: Key },
    { key: 'copy_stnk', label: 'Copy STNK Asli / Pajak Hidup', icon: FileText },
    { key: 'ban_serep', label: 'Ban Serep / Cadangan Standard', icon: Disc },
    { key: 'dongkrak', label: 'Dongkrak Kit Set Complete', icon: Wrench },
    { key: 'kunci_roda', label: 'Kunci Roda Set Tool Package', icon: Wrench },
    { key: 'stang_dongkrak', label: 'Stang Dongkrak Putar', icon: Wrench },
    { key: 'ac_mobil', label: 'AC Mobil Dingin & Blower Aktif', icon: Snowflake },
    { key: 'audio_mobil', label: 'Audio System / Bluetooth Tape', icon: Volume2 },
];

export default function BookingChecklist({ booking }: Props) {
    const { auth } = usePage().props;
    const authUser = (auth as any)?.user;
    const roles: string[] = authUser?.roles || [];
    const isSuperAdmin = roles.includes('Super Admin');
    const shouldMaskPhone = roles.includes('Admin') && !isSuperAdmin;

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const typeParam = urlParams.get('type');

    const [mode, setMode] = useState<'delivery' | 'return'>(() => {
        if (typeParam === 'delivery') return 'delivery';
        if (typeParam === 'return') return 'return';
        return booking.status === 'Confirmed' ? 'delivery' : 'return';
    });

    const isDelivery = mode === 'delivery';

    const isFilled = isDelivery
        ? (!!booking.delivery_checklist && Object.keys(booking.delivery_checklist).length > 0)
        : (!!booking.return_checklist && Object.keys(booking.return_checklist).length > 0);

    const deliveryFuel = booking.delivery_checklist?.fuel_out ?? booking.rental?.fuel_out ?? 100;

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

    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [showFuelWarningDialog, setShowFuelWarningDialog] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

    const initialChecklist = isDelivery
        ? (booking.delivery_checklist || {})
        : (booking.return_checklist && Object.keys(booking.return_checklist).length > 0
            ? booking.return_checklist
            : (booking.delivery_checklist || {}));

    const initialKm = isDelivery
        ? (booking.delivery_checklist?.km_out ?? booking.rental?.km_out ?? booking.car?.last_km ?? 0)
        : (booking.return_checklist?.km_out ?? booking.rental?.km_in ?? booking.delivery_checklist?.km_out ?? booking.car?.last_km ?? 0);

    const initialFuel = isDelivery
        ? (booking.delivery_checklist?.fuel_out ?? booking.rental?.fuel_out ?? 100)
        : (booking.return_checklist?.fuel_out ?? booking.rental?.fuel_in ?? booking.delivery_checklist?.fuel_out ?? 100);

    const initialLat = isDelivery
        ? (booking.delivery_latitude || booking.delivery_checklist?.latitude || '')
        : (booking.return_latitude || booking.return_checklist?.latitude || booking.delivery_latitude || booking.delivery_checklist?.latitude || '');

    const initialLng = isDelivery
        ? (booking.delivery_longitude || booking.delivery_checklist?.longitude || '')
        : (booking.return_longitude || booking.return_checklist?.longitude || booking.delivery_longitude || booking.delivery_checklist?.longitude || '');

    const { data, setData, post, processing, errors, transform } = useForm<FormFields>({
        checklist: {
            kunci_kontak: initialChecklist.kunci_kontak || '',
            copy_stnk: initialChecklist.copy_stnk || '',
            ban_serep: initialChecklist.ban_serep || '',
            dongkrak: initialChecklist.dongkrak || '',
            kunci_roda: initialChecklist.kunci_roda || '',
            stang_dongkrak: initialChecklist.stang_dongkrak || '',
            ac_mobil: initialChecklist.ac_mobil || '',
            audio_mobil: initialChecklist.audio_mobil || '',
            body_depan: initialChecklist.body_depan || '',
            body_belakang: initialChecklist.body_belakang || '',
            body_kiri: initialChecklist.body_kiri || '',
            body_kanan: initialChecklist.body_kanan || '',
            body_atap: initialChecklist.body_atap || '',
            body_depan_note: initialChecklist.body_depan_note || '',
            body_belakang_note: initialChecklist.body_belakang_note || '',
            body_kiri_note: initialChecklist.body_kiri_note || '',
            body_kanan_note: initialChecklist.body_kanan_note || '',
            body_atap_note: initialChecklist.body_atap_note || '',
            ...initialChecklist,
        } as Record<string, string>,
        km_out: initialKm,
        fuel_out: initialFuel,
        fuel_range_km: initialChecklist.fuel_range_km ?? (booking.fuel_range_km ?? 0),
        handover_location: initialChecklist.handover_location || '',
        latitude: String(initialLat || ''),
        longitude: String(initialLng || ''),
        checkout_date: (isDelivery ? booking.delivery_checklist?.checkout_date : booking.return_checklist?.checkout_date) || getCurrentDate(),
        checkout_time: (isDelivery ? booking.delivery_checklist?.checkout_time : booking.return_checklist?.checkout_time) || getCurrentTime(),
        checkout_datetime: '',
        notes: isDelivery ? (booking.delivery_notes || '') : (booking.return_notes || booking.delivery_notes || ''),
        photos: (Array.isArray(initialChecklist.photos) ? initialChecklist.photos : []) as (File | string)[],
    });

    const handleSwitchMode = (newMode: 'delivery' | 'return') => {
        setMode(newMode);
        setValidationErrors([]);
        setGeoError(null);
        const isDel = newMode === 'delivery';
        const saved = isDel
            ? booking.delivery_checklist
            : (booking.return_checklist && Object.keys(booking.return_checklist).length > 0
                ? booking.return_checklist
                : booking.delivery_checklist);

        const photos = isDel
            ? (Array.isArray(booking.delivery_checklist?.photos) ? booking.delivery_checklist.photos : [])
            : (Array.isArray(booking.return_checklist?.photos) && booking.return_checklist.photos.length > 0
                ? booking.return_checklist.photos
                : (Array.isArray(booking.delivery_checklist?.photos) ? booking.delivery_checklist.photos : []));
        setPhotoPreviews(photos);

        const targetKm = isDel
            ? (booking.delivery_checklist?.km_out ?? booking.rental?.km_out ?? booking.car?.last_km ?? 0)
            : (booking.return_checklist?.km_out ?? booking.rental?.km_in ?? booking.delivery_checklist?.km_out ?? booking.car?.last_km ?? 0);
        const targetFuel = isDel
            ? (booking.delivery_checklist?.fuel_out ?? booking.rental?.fuel_out ?? 100)
            : (booking.return_checklist?.fuel_out ?? booking.rental?.fuel_in ?? booking.delivery_checklist?.fuel_out ?? 100);
        const targetLat = isDel
            ? (booking.delivery_latitude || booking.delivery_checklist?.latitude || '')
            : (booking.return_latitude || booking.return_checklist?.latitude || booking.delivery_latitude || booking.delivery_checklist?.latitude || '');
        const targetLng = isDel
            ? (booking.delivery_longitude || booking.delivery_checklist?.longitude || '')
            : (booking.return_longitude || booking.return_checklist?.longitude || booking.delivery_longitude || booking.delivery_checklist?.longitude || '');

        setData({
            checklist: {
                kunci_kontak: saved?.kunci_kontak || '',
                copy_stnk: saved?.copy_stnk || '',
                ban_serep: saved?.ban_serep || '',
                dongkrak: saved?.dongkrak || '',
                kunci_roda: saved?.kunci_roda || '',
                stang_dongkrak: saved?.stang_dongkrak || '',
                ac_mobil: saved?.ac_mobil || '',
                audio_mobil: saved?.audio_mobil || '',
                body_depan: saved?.body_depan || '',
                body_belakang: saved?.body_belakang || '',
                body_kiri: saved?.body_kiri || '',
                body_kanan: saved?.body_kanan || '',
                body_atap: saved?.body_atap || '',
                body_depan_note: saved?.body_depan_note || '',
                body_belakang_note: saved?.body_belakang_note || '',
                body_kiri_note: saved?.body_kiri_note || '',
                body_kanan_note: saved?.body_kanan_note || '',
                body_atap_note: saved?.body_atap_note || '',
                ...(saved || {}),
            } as Record<string, string>,
            km_out: targetKm,
            fuel_out: targetFuel,
            fuel_range_km: saved?.fuel_range_km ?? (booking.fuel_range_km ?? 0),
            handover_location: (isDel ? booking.delivery_checklist?.handover_location : (booking.return_checklist?.handover_location || booking.delivery_checklist?.handover_location)) || '',
            latitude: String(targetLat || ''),
            longitude: String(targetLng || ''),
            checkout_date: (isDel ? booking.delivery_checklist?.checkout_date : booking.return_checklist?.checkout_date) || getCurrentDate(),
            checkout_time: (isDel ? booking.delivery_checklist?.checkout_time : booking.return_checklist?.checkout_time) || getCurrentTime(),
            checkout_datetime: '',
            notes: isDel ? (booking.delivery_notes || '') : (booking.return_notes || booking.delivery_notes || ''),
            photos: photos,
        });
    };

    const handleCheckIn = () => {
        if (isFilled) return;
        setGeoError(null);

        if (!navigator.geolocation) {
            setGeoError('Browser Anda tidak mendukung Geolocation GPS.');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                setData((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                }));
                setLocationAccuracy(Math.round(position.coords.accuracy));
                setIsLocating(false);

                // Optional reverse geocoding via OpenStreetMap Nominatim if handover_location is empty
                if (!data.handover_location || data.handover_location.trim() === '') {
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                        if (res.ok) {
                            const json = await res.json();
                            if (json && json.display_name) {
                                const addr = json.address;
                                const road = addr?.road || addr?.suburb || addr?.village || '';
                                const city = addr?.city || addr?.town || addr?.county || '';
                                const cleanName = [road, city].filter(Boolean).join(', ') || json.display_name.split(',').slice(0, 3).join(',');
                                setData((prev) => ({
                                    ...prev,
                                    handover_location: cleanName || json.display_name,
                                }));
                            }
                        }
                    } catch (e) {
                        // Reverse geocoding failed silently
                    }
                }
            },
            (error) => {
                setIsLocating(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setGeoError('Izin akses lokasi ditolak. Mohon aktifkan izin GPS di browser Anda.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setGeoError('Informasi lokasi GPS tidak tersedia saat ini.');
                        break;
                    case error.TIMEOUT:
                        setGeoError('Waktu permintaan lokasi habis (timeout). Silakan coba lagi.');
                        break;
                    default:
                        setGeoError('Gagal mendapatkan lokasi GPS: ' + error.message);
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isFilled || !e.target.files) return;
        const files = Array.from(e.target.files);
        const newObjectURLs = files.map((file) => URL.createObjectURL(file));
        setPhotoPreviews((prev) => [...prev, ...newObjectURLs]);
        setData('photos', [...((data.photos || []) as (File | string)[]), ...files]);
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const uncompleted: string[] = [];

        // 1. Checklist Kelengkapan Unit (8 items)
        CHECKLIST_ITEMS.forEach((item) => {
            if (!data.checklist[item.key]) {
                uncompleted.push(`Kelengkapan: ${item.label}`);
            }
        });

        // 2. Inspeksi 5 Sisi Bodi
        const bodyParts = [
            { key: 'body_depan', label: 'Bodi Tampak Depan' },
            { key: 'body_belakang', label: 'Bodi Tampak Belakang' },
            { key: 'body_kiri', label: 'Bodi Samping Kiri' },
            { key: 'body_kanan', label: 'Bodi Samping Kanan' },
            { key: 'body_atap', label: 'Bodi Tampak Atas / Atap' },
        ];
        bodyParts.forEach((bp) => {
            if (!data.checklist[bp.key]) {
                uncompleted.push(`Inspeksi Bodi: ${bp.label}`);
            }
        });

        // 3. Form Input Utama
        if (!data.handover_location || !data.handover_location.trim()) {
            uncompleted.push(isDelivery ? 'Lokasi Penyerahan' : 'Lokasi Pengembalian');
        }
        if (!data.checkout_date) {
            uncompleted.push(isDelivery ? 'Tanggal Keluar / Masuk' : 'Tanggal Masuk');
        }
        if (!data.checkout_time) {
            uncompleted.push(isDelivery ? 'Jam Keluar / Masuk' : 'Jam Masuk');
        }
        if (data.km_out === undefined || data.km_out === null || String(data.km_out).trim() === '') {
            uncompleted.push(isDelivery ? 'KM Speedometer Keluar' : 'KM Speedometer Masuk');
        }

        if (uncompleted.length > 0) {
            setValidationErrors(uncompleted);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // POP UP peringatan jika BBM pengembalian kurang dari saat serah terima
        if (!isDelivery && data.fuel_out < deliveryFuel) {
            setShowFuelWarningDialog(true);
            return;
        }

        setValidationErrors([]);

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
                        <h1 className="text-2xl font-bold tracking-tight">
                            {isDelivery ? 'Checklist Unit Jalan (Serah Terima)' : 'Checklist Unit Kembali (Pengembalian)'}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Verifikasi fisik kendaraan, kelengkapan unit, meteran BBM & KM bersama penyewa.
                        </p>
                    </div>

                    {/* Mode Switcher Tabs */}
                    <div className="flex items-center gap-1.5 bg-muted p-1.5 rounded-xl border w-full md:w-auto">
                        <Button
                            type="button"
                            variant={mode === 'delivery' ? 'default' : 'ghost'}
                            size="sm"
                            className="text-xs font-bold px-3 flex-1 md:flex-none"
                            onClick={() => handleSwitchMode('delivery')}
                        >
                            <Car className="h-3.5 w-3.5 mr-1.5" /> Unit Jalan
                        </Button>
                        <Button
                            type="button"
                            variant={mode === 'return' ? 'default' : 'ghost'}
                            size="sm"
                            className="text-xs font-bold px-3 flex-1 md:flex-none"
                            onClick={() => handleSwitchMode('return')}
                        >
                            <CheckSquare className="h-3.5 w-3.5 mr-1.5" /> Unit Kembali
                        </Button>
                    </div>
                </div>

                {/* Locked Status Banner if Checklist is already filled */}
                {isFilled && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                <Lock className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Checklist Terkunci (Read-Only)</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Form checklist {isDelivery ? 'penyerahan (Unit Jalan)' : 'pengembalian (Unit Kembali)'} sudah pernah diisi dan dikunci untuk menjaga keabsahan data fisik.</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-xs shrink-0 flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Sudah Diisi
                        </Badge>
                    </div>
                )}

                {/* Info Notice when Return Checklist is Auto-Prefilled from Delivery Checklist */}
                {!isDelivery && !isFilled && booking.delivery_checklist && Object.keys(booking.delivery_checklist).length > 0 && (
                    <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between gap-3 text-blue-900 dark:text-blue-200 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                <CheckSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Data Disalin Dari Checklist Serah Terima</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Seluruh status kelengkapan unit, fisik bodi, meteran & lokasi otomatis disalin dari Serah Terima (Unit Jalan). Silakan periksa kembali dan ubah jika terdapat perbedaan kondisi saat pengembalian.</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0 flex items-center gap-1">
                            ✓ Auto-Prefilled
                        </Badge>
                    </div>
                )}

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
                                    <span className="col-span-7 font-mono font-semibold text-foreground text-right">
                                        {booking.customer?.phone ? (shouldMaskPhone ? maskPhoneNumber(booking.customer.phone) : booking.customer.phone) : '-'}
                                    </span>
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
                                    <span className="col-span-5 text-muted-foreground font-medium">{isDelivery ? 'KM Keluar (Awal)' : 'KM Masuk (Kembali)'}</span>
                                    <span className="col-span-7 font-mono font-semibold text-foreground text-right">{data.km_out ? `${data.km_out.toLocaleString()} KM` : '0 KM'}</span>
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
                                        <span>{isDelivery ? 'Detail Unit Sebelum Sewa' : 'Detail Unit Sesudah Sewa'}</span>
                                        <span className="text-xs font-normal text-muted-foreground">Detail Meteran Unit</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4 flex-1">
                                    {/* Range / KM Keluar / Masuk */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="km_out" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {isDelivery ? 'Range Odometer (KM Keluar)' : 'Range Odometer / KM Masuk (Saat Kembali)'}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="km_out"
                                                type="number"
                                                min={0}
                                                disabled={isFilled}
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
                                                disabled={isFilled}
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
                                                disabled={isFilled}
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
                                            disabled={isFilled}
                                            value={data.handover_location}
                                            onChange={(e) => setData('handover_location', e.target.value)}
                                            placeholder="Misal: Bandara, Alamat Rumah, Garasi Unit"
                                        />
                                    </div>

                                    {/* Map OpenStreetMap & Tombol Check-in */}
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Peta & Titik GPS (OpenStreetMap)
                                                </span>
                                                {data.latitude && data.longitude && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                                        <Check className="h-3 w-3" /> Terkunci
                                                    </span>
                                                )}
                                            </div>

                                            {/* Tombol Check-in di atas box map */}
                                            {!isFilled ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={data.latitude && data.longitude ? 'outline' : 'default'}
                                                    onClick={handleCheckIn}
                                                    disabled={isLocating}
                                                    className={`h-8 text-xs font-semibold gap-1.5 shadow-xs transition-all ${
                                                        !data.latitude || !data.longitude
                                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                            : 'border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                                    }`}
                                                >
                                                    {isLocating ? (
                                                        <>
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            <span>Mencari Lokasi...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Crosshair className="h-3.5 w-3.5" />
                                                            <span>{data.latitude && data.longitude ? 'Lock / Perbarui GPS' : 'Check-in Lokasi'}</span>
                                                        </>
                                                    )}
                                                </Button>
                                            ) : (
                                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                    <Lock className="h-3 w-3" /> Lokasi Telah Dikunci
                                                </span>
                                            )}
                                        </div>

                                        {/* Koordinat Info Bar */}
                                        {data.latitude && data.longitude && (
                                            <div className="flex flex-wrap items-center justify-between text-xs bg-muted/60 dark:bg-muted/30 px-3 py-1.5 rounded-md border text-muted-foreground gap-2 font-mono">
                                                <span className="flex items-center gap-1">
                                                    <Navigation className="h-3 w-3 text-emerald-600" />
                                                    Lat: <strong className="text-foreground">{data.latitude}</strong>, Lng: <strong className="text-foreground">{data.longitude}</strong>
                                                    {locationAccuracy && <span className="text-[10px] text-muted-foreground ml-1">(±{locationAccuracy}m)</span>}
                                                </span>
                                                <a
                                                    href={`https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=17/${data.latitude}/${data.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-sans text-[11px]"
                                                >
                                                    Buka di OpenStreetMap <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                        )}

                                        {/* Error notification if geolocation fails */}
                                        {geoError && (
                                            <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="font-semibold">Gagal Mengunci Lokasi GPS</p>
                                                    <p className="text-[11px] opacity-90">{geoError}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Box Map OpenStreetMap */}
                                        <div className="relative w-full h-56 rounded-xl border border-border overflow-hidden shadow-inner bg-muted/30 flex items-center justify-center group">
                                            {data.latitude && data.longitude ? (
                                                <iframe
                                                    title="OpenStreetMap Location"
                                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(data.longitude) - 0.006}%2C${Number(data.latitude) - 0.004}%2C${Number(data.longitude) + 0.006}%2C${Number(data.latitude) + 0.004}&layer=mapnik&marker=${data.latitude}%2C${data.longitude}`}
                                                    className="w-full h-full border-0 pointer-events-auto"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                                                    <div className="p-3 bg-background rounded-full border shadow-xs text-muted-foreground group-hover:scale-105 transition-transform">
                                                        <MapPin className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-foreground">Titik Lokasi Belum Dikunci</p>
                                                        <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5">
                                                            Klik tombol <strong>Check-in Lokasi</strong> di atas untuk mengunci titik GPS {isDelivery ? 'serah terima' : 'pengembalian'} secara akurat.
                                                        </p>
                                                    </div>
                                                    {!isFilled && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={handleCheckIn}
                                                            disabled={isLocating}
                                                            className="mt-1 h-7 text-xs gap-1.5"
                                                        >
                                                            {isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
                                                            Check-in Sekarang
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
                                                    disabled={isFilled}
                                                    value={gaugeModel}
                                                    onChange={(e) => setGaugeModel(e.target.value as any)}
                                                    className="text-xs font-medium bg-background border rounded-md px-2.5 py-1 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
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
                                                <div className="flex flex-col items-center justify-center py-2 w-full max-w-xs">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase mb-2">Tampilan Model Tangga (Vertikal)</span>
                                                    <div className="flex items-center justify-center gap-3 w-full">
                                                        <span className="text-xs font-bold text-muted-foreground">F (Full)</span>
                                                        <div className="flex flex-col-reverse gap-1.5 w-16 p-2 border-2 rounded-lg bg-muted/20">
                                                            {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => {
                                                                const threshold = step * 12.5;
                                                                const active = data.fuel_out >= threshold;
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
                                                        disabled={isFilled}
                                                        value={data.fuel_out}
                                                        onChange={(e) => setData('fuel_out', parseInt(e.target.value) || 0)}
                                                        className="w-full accent-amber-600 cursor-pointer h-2 bg-muted rounded-lg appearance-none focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                                                    />
                                                    <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                                                        <button type="button" disabled={isFilled} onClick={() => !isFilled && setData('fuel_out', 0)} className={`hover:text-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${data.fuel_out === 0 ? 'text-amber-600 font-extrabold' : ''}`}>0% (Empty)</button>
                                                        <button type="button" disabled={isFilled} onClick={() => !isFilled && setData('fuel_out', 100)} className={`hover:text-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${data.fuel_out === 100 ? 'text-amber-600 font-extrabold' : ''}`}>100% (Full)</button>
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
                                                            disabled={isFilled}
                                                            value={data.fuel_range_km}
                                                            onChange={(e) => setData('fuel_range_km', parseInt(e.target.value) || 0)}
                                                            placeholder="Misal: 450"
                                                            className="font-mono text-center font-bold text-sm h-8 border-amber-400 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/40 dark:bg-amber-950/20 pr-10"
                                                        />
                                                        <span className="absolute right-3 top-1.5 text-xs text-amber-600 dark:text-amber-400 font-bold">KM</span>
                                                    </div>
                                                </div>

                                                {/* Note / Warning for Return Fuel Shortage */}
                                                {!isDelivery && (
                                                    <div className="pt-3 border-t w-full transition-all">
                                                        <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${data.fuel_out < deliveryFuel
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                                                            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                                            }`}>
                                                            <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${data.fuel_out < deliveryFuel ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                                                            <div className="space-y-1">
                                                                <div className="font-bold">
                                                                    {data.fuel_out < deliveryFuel
                                                                        ? '⚠️ Catatan BBM Pengembalian Kurang!'
                                                                        : '✓ BBM Sesuai / Sama Dengan Serah Terima Awal'}
                                                                </div>
                                                                <p className="text-[11px] leading-relaxed">
                                                                    BBM Serah Terima Awal: <strong>{deliveryFuel}%</strong> | BBM Pengembalian: <strong>{data.fuel_out}%</strong>
                                                                </p>
                                                                {data.fuel_out < deliveryFuel && (
                                                                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                                                        Kekurangan BBM: <strong>{deliveryFuel - data.fuel_out}%</strong>. Harap perhatikan biaya / denda pengisian BBM ke penyewa.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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
                                        <CardTitle className="text-base font-bold">Status Kelengkapan Unit <span className="text-red-500 text-xs font-normal">*Wajib Semua</span></CardTitle>
                                        <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-muted-foreground pr-2">
                                            <span className="text-green-600 dark:text-green-400">OK</span>
                                            <span className="text-red-600 dark:text-red-400">TIDAK</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="divide-y p-0 flex-1">
                                    {CHECKLIST_ITEMS.map((item) => {
                                        const ItemIcon = item.icon;
                                        const currentStatus = data.checklist[item.key] || '';
                                        const isMissing = !currentStatus && validationErrors.some(err => err.includes(item.label));
                                        return (
                                            <div key={item.key} className={`flex items-center justify-between p-3 px-4 transition-colors ${isMissing ? 'bg-red-50/50 dark:bg-red-950/20' : 'hover:bg-muted/30'}`}>
                                                <div className="flex items-center gap-2.5">
                                                    <ItemIcon className={`h-4 w-4 ${isMissing ? 'text-red-500' : 'text-muted-foreground'}`} />
                                                    <span className={`text-sm font-medium ${isMissing ? 'text-red-700 dark:text-red-400 font-bold' : ''}`}>{item.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        disabled={isFilled}
                                                        variant={currentStatus === 'OK' ? 'default' : 'outline'}
                                                        className={`h-8 px-3 text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${currentStatus === 'OK'
                                                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-xs'
                                                            : isMissing
                                                                ? 'border-red-400 text-red-600 hover:text-foreground'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        onClick={() => !isFilled && handleItemToggle(item.key, 'OK')}
                                                    >
                                                        <Check className="h-3.5 w-3.5 mr-1" /> OK
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        disabled={isFilled}
                                                        variant={currentStatus === 'Tidak' ? 'destructive' : 'outline'}
                                                        className={`h-8 px-3 text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${currentStatus === 'Tidak'
                                                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                                                            : isMissing
                                                                ? 'border-red-400 text-red-600 hover:text-foreground'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        onClick={() => !isFilled && handleItemToggle(item.key, 'Tidak')}
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
                                        <Car className="h-5 w-5 text-primary" /> Inspeksi Kondisi Fisik Bodi Mobil <span className="text-red-500 text-xs font-normal">*Wajib Semua</span>
                                    </CardTitle>
                                    <CardDescription>Diagram kondisi bodi kendaraan 5 sisi (Tandai kondisi Baik, Baret, Penyok, atau Rusak).</CardDescription>
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
                                        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all space-y-3 ${data.checklist.body_kiri === 'Baret' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs' :
                                            data.checklist.body_kiri === 'Penyok' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20 shadow-xs' :
                                                data.checklist.body_kiri === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' :
                                                    data.checklist.body_kiri === 'Baik' ? 'border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs' :
                                                        !data.checklist.body_kiri && validationErrors.some(err => err.includes('Bodi Samping Kiri')) ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-card border-border'
                                            }`}>
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-bold text-foreground">Samping Kiri <span className="text-red-500">*</span></span>
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${data.checklist.body_kiri === 'Baret' ? 'bg-amber-500 text-white border-amber-600' :
                                                    data.checklist.body_kiri === 'Penyok' ? 'bg-orange-500 text-white border-orange-600' :
                                                        data.checklist.body_kiri === 'Rusak' ? 'bg-red-500 text-white border-red-600' :
                                                            data.checklist.body_kiri === 'Baik' ? 'bg-emerald-600 text-white border-emerald-700' :
                                                                'bg-muted text-amber-600 dark:text-amber-400 border-dashed border-amber-500/50'
                                                    }`}>{data.checklist.body_kiri || 'Belum Diisi'}</span>
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
                                                        disabled={isFilled}
                                                        variant={data.checklist.body_kiri === st.status ? 'default' : 'outline'}
                                                        className={`h-7 px-1 text-[10px] font-bold disabled:opacity-60 disabled:cursor-not-allowed ${data.checklist.body_kiri === st.status ? st.activeClass : 'hover:bg-muted text-muted-foreground'
                                                            }`}
                                                        onClick={() => !isFilled && setData('checklist', { ...data.checklist, body_kiri: st.status })}
                                                    >
                                                        {st.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Input
                                                type="text"
                                                disabled={isFilled}
                                                placeholder="Catatan / rincian baret Samping Kiri..."
                                                value={data.checklist.body_kiri_note || ''}
                                                onChange={(e) => setData('checklist', { ...data.checklist, body_kiri_note: e.target.value })}
                                                className="h-7 text-[11px] placeholder:text-muted-foreground/60 bg-background/80"
                                            />
                                        </div>

                                        {/* Samping Kanan Card */}
                                        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all space-y-3 ${data.checklist.body_kanan === 'Baret' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs' :
                                            data.checklist.body_kanan === 'Penyok' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20 shadow-xs' :
                                                data.checklist.body_kanan === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' :
                                                    data.checklist.body_kanan === 'Baik' ? 'border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs' :
                                                        !data.checklist.body_kanan && validationErrors.some(err => err.includes('Bodi Samping Kanan')) ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-card border-border'
                                            }`}>
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-bold text-foreground">Samping Kanan <span className="text-red-500">*</span></span>
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${data.checklist.body_kanan === 'Baret' ? 'bg-amber-500 text-white border-amber-600' :
                                                    data.checklist.body_kanan === 'Penyok' ? 'bg-orange-500 text-white border-orange-600' :
                                                        data.checklist.body_kanan === 'Rusak' ? 'bg-red-500 text-white border-red-600' :
                                                            data.checklist.body_kanan === 'Baik' ? 'bg-emerald-600 text-white border-emerald-700' :
                                                                'bg-muted text-amber-600 dark:text-amber-400 border-dashed border-amber-500/50'
                                                    }`}>{data.checklist.body_kanan || 'Belum Diisi'}</span>
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
                                                        disabled={isFilled}
                                                        variant={data.checklist.body_kanan === st.status ? 'default' : 'outline'}
                                                        className={`h-7 px-1 text-[10px] font-bold disabled:opacity-60 disabled:cursor-not-allowed ${data.checklist.body_kanan === st.status ? st.activeClass : 'hover:bg-muted text-muted-foreground'
                                                            }`}
                                                        onClick={() => !isFilled && setData('checklist', { ...data.checklist, body_kanan: st.status })}
                                                    >
                                                        {st.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Input
                                                type="text"
                                                disabled={isFilled}
                                                placeholder="Catatan baret Samping Kanan..."
                                                value={data.checklist.body_kanan_note || ''}
                                                onChange={(e) => setData('checklist', { ...data.checklist, body_kanan_note: e.target.value })}
                                                className="h-7 text-[11px] placeholder:text-muted-foreground/60 bg-background/80"
                                            />
                                        </div>
                                    </div>

                                    {/* Column 2: Tampak Atas (Top View) */}
                                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all space-y-3 h-full ${data.checklist.body_atap === 'Baret' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs' :
                                        data.checklist.body_atap === 'Penyok' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20 shadow-xs' :
                                            data.checklist.body_atap === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' :
                                                data.checklist.body_atap === 'Baik' ? 'border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs' :
                                                    !data.checklist.body_atap && validationErrors.some(err => err.includes('Bodi Tampak Atas / Atap')) ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-card border-border'
                                        }`}>
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-xs font-bold text-foreground">Tampak Atas / Atap <span className="text-red-500">*</span></span>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${data.checklist.body_atap === 'Baret' ? 'bg-amber-500 text-white border-amber-600' :
                                                data.checklist.body_atap === 'Penyok' ? 'bg-orange-500 text-white border-orange-600' :
                                                    data.checklist.body_atap === 'Rusak' ? 'bg-red-500 text-white border-red-600' :
                                                        data.checklist.body_atap === 'Baik' ? 'bg-emerald-600 text-white border-emerald-700' :
                                                            'bg-muted text-amber-600 dark:text-amber-400 border-dashed border-amber-500/50'
                                                }`}>{data.checklist.body_atap || 'Belum Diisi'}</span>
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
                                                        disabled={isFilled}
                                                        variant={data.checklist.body_atap === st.status ? 'default' : 'outline'}
                                                        className={`h-7 px-1 text-[10px] font-bold disabled:opacity-60 disabled:cursor-not-allowed ${data.checklist.body_atap === st.status ? st.activeClass : 'hover:bg-muted text-muted-foreground'
                                                            }`}
                                                        onClick={() => !isFilled && setData('checklist', { ...data.checklist, body_atap: st.status })}
                                                    >
                                                        {st.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Input
                                                type="text"
                                                disabled={isFilled}
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
                                        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all space-y-3 ${data.checklist.body_depan === 'Baret' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs' :
                                            data.checklist.body_depan === 'Penyok' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20 shadow-xs' :
                                                data.checklist.body_depan === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' :
                                                    data.checklist.body_depan === 'Baik' ? 'border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs' :
                                                        !data.checklist.body_depan && validationErrors.some(err => err.includes('Bodi Tampak Depan')) ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-card border-border'
                                            }`}>
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-bold text-foreground">Tampak Depan <span className="text-red-500">*</span></span>
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${data.checklist.body_depan === 'Baret' ? 'bg-amber-500 text-white border-amber-600' :
                                                    data.checklist.body_depan === 'Penyok' ? 'bg-orange-500 text-white border-orange-600' :
                                                        data.checklist.body_depan === 'Rusak' ? 'bg-red-500 text-white border-red-600' :
                                                            data.checklist.body_depan === 'Baik' ? 'bg-emerald-600 text-white border-emerald-700' :
                                                                'bg-muted text-amber-600 dark:text-amber-400 border-dashed border-amber-500/50'
                                                    }`}>{data.checklist.body_depan || 'Belum Diisi'}</span>
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
                                                        disabled={isFilled}
                                                        variant={data.checklist.body_depan === st.status ? 'default' : 'outline'}
                                                        className={`h-7 px-1 text-[10px] font-bold disabled:opacity-60 disabled:cursor-not-allowed ${data.checklist.body_depan === st.status ? st.activeClass : 'hover:bg-muted text-muted-foreground'
                                                            }`}
                                                        onClick={() => !isFilled && setData('checklist', { ...data.checklist, body_depan: st.status })}
                                                    >
                                                        {st.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Input
                                                type="text"
                                                disabled={isFilled}
                                                placeholder="Catatan baret Tampak Depan..."
                                                value={data.checklist.body_depan_note || ''}
                                                onChange={(e) => setData('checklist', { ...data.checklist, body_depan_note: e.target.value })}
                                                className="h-7 text-[11px] placeholder:text-muted-foreground/60 bg-background/80"
                                            />
                                        </div>

                                        {/* Tampak Belakang Card */}
                                        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all space-y-3 ${data.checklist.body_belakang === 'Baret' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs' :
                                            data.checklist.body_belakang === 'Penyok' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20 shadow-xs' :
                                                data.checklist.body_belakang === 'Rusak' ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' :
                                                    data.checklist.body_belakang === 'Baik' ? 'border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs' :
                                                        !data.checklist.body_belakang && validationErrors.some(err => err.includes('Bodi Tampak Belakang')) ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20 shadow-xs' : 'bg-card border-border'
                                            }`}>
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-bold text-foreground">Tampak Belakang <span className="text-red-500">*</span></span>
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${data.checklist.body_belakang === 'Baret' ? 'bg-amber-500 text-white border-amber-600' :
                                                    data.checklist.body_belakang === 'Penyok' ? 'bg-orange-500 text-white border-orange-600' :
                                                        data.checklist.body_belakang === 'Rusak' ? 'bg-red-500 text-white border-red-600' :
                                                            data.checklist.body_belakang === 'Baik' ? 'bg-emerald-600 text-white border-emerald-700' :
                                                                'bg-muted text-amber-600 dark:text-amber-400 border-dashed border-amber-500/50'
                                                    }`}>{data.checklist.body_belakang || 'Belum Diisi'}</span>
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
                                                        disabled={isFilled}
                                                        variant={data.checklist.body_belakang === st.status ? 'default' : 'outline'}
                                                        className={`h-7 px-1 text-[10px] font-bold disabled:opacity-60 disabled:cursor-not-allowed ${data.checklist.body_belakang === st.status ? st.activeClass : 'hover:bg-muted text-muted-foreground'
                                                            }`}
                                                        onClick={() => !isFilled && setData('checklist', { ...data.checklist, body_belakang: st.status })}
                                                    >
                                                        {st.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Input
                                                type="text"
                                                disabled={isFilled}
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
                            {!isFilled && (
                                <Input
                                    id="photo-upload-input"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePhotoAdd}
                                    className="hidden"
                                />
                            )}

                            {/* Photo Gallery Grid / Clickable Box */}
                            {photoPreviews.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                                    {photoPreviews.map((url, idx) => (
                                        <div key={idx} className="relative group aspect-4/3 rounded-xl border bg-muted/30 overflow-hidden shadow-xs">
                                            <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                            {!isFilled && (
                                                <button
                                                    type="button"
                                                    onClick={() => handlePhotoRemove(idx)}
                                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 text-white shadow-md hover:bg-red-700 transition-transform active:scale-95"
                                                    title="Hapus foto ini"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold backdrop-blur-xs">
                                                Foto #{idx + 1}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Add Photo Card */}
                                    {!isFilled && (
                                        <Label
                                            htmlFor="photo-upload-input"
                                            className="cursor-pointer aspect-4/3 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1.5 transition-all text-center p-2 group shadow-2xs"
                                        >
                                            <Camera className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-bold text-primary">+ Tambah Foto</span>
                                        </Label>
                                    )}
                                </div>
                            ) : (
                                !isFilled && (
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
                                )
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
                                disabled={isFilled}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Catat kondisi fisik kendaraan (misal: baret halus di pintu kanan belakang, bensin tidak full, dll)..."
                                className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </CardContent>
                    </Card>

                    {isFilled ? (
                        <Button type="button" size="lg" disabled className="w-full font-bold text-base h-12 bg-muted text-muted-foreground border cursor-not-allowed">
                            <Lock className="h-5 w-5 mr-2" />
                            Form Checklist {isDelivery ? 'Penyerahan' : 'Pengembalian'} Sudah Terkunci
                        </Button>
                    ) : (
                        <Button type="submit" size="lg" className="w-full font-bold text-base h-12 shadow-md" disabled={processing}>
                            <ShieldCheck className="h-5 w-5 mr-2" />
                            {isDelivery ? 'Simpan & Konfirmasi Serah Terima Mobil' : 'Simpan & Konfirmasi Pengembalian Mobil'}
                        </Button>
                    )}
                </form>

                {/* Pop Up Peringatan BBM Pengembalian Kurang */}
                <Dialog open={showFuelWarningDialog} onOpenChange={setShowFuelWarningDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader className="flex flex-col items-center text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-2 ring-8 ring-amber-500/10">
                                <AlertTriangle className="h-7 w-7" />
                            </div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                Peringatan: BBM Pengembalian Kurang!
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-1">
                                Level BBM saat unit kembali lebih rendah dari saat serah terima awal.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div className="rounded-xl border bg-muted/40 p-4 space-y-2.5">
                                <div className="flex justify-between items-center py-1 border-b border-dashed">
                                    <span className="text-muted-foreground font-medium">BBM Serah Terima Awal:</span>
                                    <span className="font-bold text-foreground font-mono text-sm">{deliveryFuel}%</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-dashed">
                                    <span className="text-muted-foreground font-medium">BBM Pengembalian Saat Ini:</span>
                                    <span className="font-bold text-red-600 dark:text-red-400 font-mono text-sm">{data.fuel_out}%</span>
                                </div>
                                <div className="flex justify-between items-center py-1 text-amber-700 dark:text-amber-300 font-semibold">
                                    <span>Selisih Kekurangan BBM:</span>
                                    <span className="font-extrabold font-mono text-sm">-{deliveryFuel - data.fuel_out}%</span>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 dark:text-amber-200 text-center leading-relaxed font-medium">
                                BBM pengembalian <strong>wajib disamakan (minimal {deliveryFuel}%)</strong> atau dilebihkan dari saat serah terima sebelum dapat menyimpan checklist pengembalian.
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto text-xs font-semibold"
                                onClick={() => {
                                    setShowFuelWarningDialog(false);
                                    const gaugeEl = document.getElementById('gauge_model');
                                    if (gaugeEl) {
                                        gaugeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                }}
                            >
                                Tutup & Sesuaikan Manual
                            </Button>
                            <Button
                                type="button"
                                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                                onClick={() => {
                                    setData('fuel_out', deliveryFuel);
                                    setShowFuelWarningDialog(false);
                                }}
                            >
                                Samakan Jadi {deliveryFuel}% (OK)
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
