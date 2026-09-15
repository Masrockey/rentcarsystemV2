import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    MapPin,
    Camera,
    Clock,
    Calendar,
    Navigation,
    CheckCircle2,
    LogOut,
    LogIn,
    Car,
    User,
    ExternalLink,
    Loader2,
    Plus,
    X,
    Eye,
    ArrowLeft,
} from 'lucide-react';
import { router, usePage } from '@inertiajs/react';

type TripLog = {
    id: number;
    booking_id: number;
    driver_id: number;
    driver_name?: string;
    location_name: string;
    stop_order: number;
    status: 'Checked In' | 'Checked Out';
    checkin_at?: string;
    checkin_at_raw?: string;
    checkin_latitude?: number | null;
    checkin_longitude?: number | null;
    checkin_notes?: string | null;
    checkin_photo_url?: string | null;
    checkin_map_url?: string | null;
    checkout_at?: string;
    checkout_at_raw?: string;
    checkout_latitude?: number | null;
    checkout_longitude?: number | null;
    checkout_notes?: string | null;
    checkout_photo_url?: string | null;
    checkout_map_url?: string | null;
};

const getOsmEmbedUrl = (lat: number, lng: number) => {
    const delta = 0.006;
    const minLng = (lng - delta).toFixed(6);
    const minLat = (lat - delta).toFixed(6);
    const maxLng = (lng + delta).toFixed(6);
    const maxLat = (lat + delta).toFixed(6);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
};

const getOsmViewUrl = (lat: number, lng: number) => {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
};

export default function DriverTripLogDialog({ isOpen, onClose, booking }: Props) {
    const page = usePage();
    const { auth } = page.props as any;
    const userRoles: string[] = auth?.user?.roles || [];
    const isDriver = userRoles.includes('Driver') || userRoles.includes('Super Admin') || userRoles.includes('Admin');

    const [logs, setLogs] = useState<TripLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'timeline' | 'checkin' | 'checkout'>('timeline');

    // Check-in Form States
    const [locationName, setLocationName] = useState('');
    const [checkinNotes, setCheckinNotes] = useState('');
    const [checkinLat, setCheckinLat] = useState<number | null>(null);
    const [checkinLng, setCheckinLng] = useState<number | null>(null);
    const [checkinPhoto, setCheckinPhoto] = useState<File | null>(null);
    const [checkinPhotoPreview, setCheckinPhotoPreview] = useState<string | null>(null);
    const [gettingGpsCheckin, setGettingGpsCheckin] = useState(false);
    const [submittingCheckin, setSubmittingCheckin] = useState(false);

    // Check-out Form States
    const [checkoutNotes, setCheckoutNotes] = useState('');
    const [checkoutLat, setCheckoutLat] = useState<number | null>(null);
    const [checkoutLng, setCheckoutLng] = useState<number | null>(null);
    const [checkoutPhoto, setCheckoutPhoto] = useState<File | null>(null);
    const [checkoutPhotoPreview, setCheckoutPhotoPreview] = useState<string | null>(null);
    const [gettingGpsCheckout, setGettingGpsCheckout] = useState(false);
    const [submittingCheckout, setSubmittingCheckout] = useState(false);

    // Image Zoom Modal
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const fetchLogs = async () => {
        if (!booking?.id) return;
        setLoading(true);
        try {
            const res = await fetch(`/bookings/${booking.id}/trip-logs`, {
                headers: { Accept: 'application/json' },
            });
            const json = await res.json();
            if (json.success) {
                setLogs(json.data);
            }
        } catch (err) {
            console.error('Failed to fetch trip logs', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && booking?.id) {
            fetchLogs();
            setActiveTab('timeline');
            resetCheckinForm();
            resetCheckoutForm();
        }
    }, [isOpen, booking?.id]);

    const activeLog = logs.length > 0 && logs[logs.length - 1].status === 'Checked In'
        ? logs[logs.length - 1]
        : null;

    const resetCheckinForm = () => {
        setLocationName('');
        setCheckinNotes('');
        setCheckinLat(null);
        setCheckinLng(null);
        setCheckinPhoto(null);
        setCheckinPhotoPreview(null);
    };

    const resetCheckoutForm = () => {
        setCheckoutNotes('');
        setCheckoutLat(null);
        setCheckoutLng(null);
        setCheckoutPhoto(null);
        setCheckoutPhotoPreview(null);
    };

    const captureGps = (type: 'checkin' | 'checkout') => {
        if (!navigator.geolocation) {
            alert('Browser Anda tidak mendukung deteksi lokasi Geolocation.');
            return;
        }

        if (type === 'checkin') setGettingGpsCheckin(true);
        else setGettingGpsCheckout(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (type === 'checkin') {
                    setCheckinLat(latitude);
                    setCheckinLng(longitude);
                    setGettingGpsCheckin(false);
                } else {
                    setCheckoutLat(latitude);
                    setCheckoutLng(longitude);
                    setGettingGpsCheckout(false);
                }
            },
            (error) => {
                console.warn('Geolocation error:', error);
                alert('Gagal mendeteksi lokasi GPS: ' + error.message);
                if (type === 'checkin') setGettingGpsCheckin(false);
                else setGettingGpsCheckout(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const handleCheckinPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCheckinPhoto(file);
            setCheckinPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleCheckoutPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCheckoutPhoto(file);
            setCheckoutPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleCheckinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!locationName.trim()) {
            alert('Silakan masukkan nama lokasi tujuan / perhentian.');
            return;
        }

        setSubmittingCheckin(true);
        const formData = new FormData();
        formData.append('location_name', locationName.trim());
        if (checkinNotes.trim()) formData.append('checkin_notes', checkinNotes.trim());
        if (checkinLat !== null) formData.append('checkin_latitude', checkinLat.toString());
        if (checkinLng !== null) formData.append('checkin_longitude', checkinLng.toString());
        if (checkinPhoto) formData.append('checkin_photo', checkinPhoto);

        router.post(`/bookings/${booking.id}/trip-logs/checkin`, formData as any, {
            onSuccess: () => {
                setSubmittingCheckin(false);
                resetCheckinForm();
                fetchLogs();
                setActiveTab('timeline');
            },
            onError: (err) => {
                setSubmittingCheckin(false);
                console.error('Check-in error', err);
                alert('Terjadi kesalahan saat check-in: ' + Object.values(err).join(', '));
            },
        });
    };

    const handleCheckoutSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeLog) return;

        setSubmittingCheckout(true);
        const formData = new FormData();
        if (checkoutNotes.trim()) formData.append('checkout_notes', checkoutNotes.trim());
        if (checkoutLat !== null) formData.append('checkout_latitude', checkoutLat.toString());
        if (checkoutLng !== null) formData.append('checkout_longitude', checkoutLng.toString());
        if (checkoutPhoto) formData.append('checkout_photo', checkoutPhoto);

        router.post(`/bookings/${booking.id}/trip-logs/${activeLog.id}/checkout`, formData as any, {
            onSuccess: () => {
                setSubmittingCheckout(false);
                resetCheckoutForm();
                fetchLogs();
                setActiveTab('timeline');
            },
            onError: (err) => {
                setSubmittingCheckout(false);
                console.error('Check-out error', err);
                alert('Terjadi kesalahan saat check-out: ' + Object.values(err).join(', '));
            },
        });
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
                    <DialogHeader className="border-b pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                                    <Navigation className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    Log Perjalanan & Check-in Supir
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-1">
                                    Riwayat pemberhentian, check-in, dan check-out lokasi multi-stop perjalanan.
                                </DialogDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-muted px-2 py-1 rounded font-semibold text-foreground">
                                    {booking?.booking_number || `Booking #${booking?.id}`}
                                </span>
                                <Badge variant="outline" className={
                                    booking?.status === 'On Trip'
                                        ? 'bg-purple-500/15 text-purple-600 border-purple-500/25'
                                        : 'bg-blue-500/15 text-blue-600 border-blue-500/25'
                                }>
                                    {booking?.status}
                                </Badge>
                            </div>
                        </div>

                        {/* Booking Summary Box */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg mt-3 text-xs border">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="truncate">
                                    <div className="text-muted-foreground text-[10px]">Pelanggan</div>
                                    <div className="font-semibold text-foreground truncate">{booking?.customer?.name || '-'}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-blue-600 shrink-0" />
                                <div className="truncate">
                                    <div className="text-muted-foreground text-[10px]">Armada Mobil</div>
                                    <div className="font-semibold text-foreground truncate">
                                        {booking?.car?.brand} {booking?.car?.model || booking?.car?.name} ({booking?.car?.plate_number})
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div>
                                    <div className="text-muted-foreground text-[10px]">Jadwal Sewa</div>
                                    <div className="font-semibold text-foreground">{booking?.booking_date} s/d {booking?.return_date || booking?.booking_date}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Navigation className="h-4 w-4 text-green-600 shrink-0" />
                                <div>
                                    <div className="text-muted-foreground text-[10px]">Total Perhentian</div>
                                    <div className="font-bold text-foreground">{logs.length} Tempat Diselesaikan</div>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Navigation Subheader */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 pt-1">
                        {activeTab === 'timeline' ? (
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                <Clock className="h-4 w-4 text-foreground" />
                                <span>Timeline Perjalanan ({logs.length})</span>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActiveTab('timeline')}
                                className="text-xs -ml-2 text-muted-foreground hover:text-foreground h-8 gap-1.5"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Kembali ke Timeline
                            </Button>
                        )}

                        {activeTab === 'timeline' && activeLog && (
                            <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse text-xs py-1">
                                Sedang berada di: {activeLog.location_name} ({activeLog.checkin_at})
                            </Badge>
                        )}

                        {activeTab !== 'timeline' && (
                            <Badge variant="outline" className={activeTab === 'checkin' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs' : 'bg-destructive/15 text-destructive border-destructive/30 text-xs'}>
                                {activeTab === 'checkin'
                                    ? (logs.length === 0 ? 'Check-in Tempat Pertama' : `Check-in Tempat ke-${logs.length + 1}`)
                                    : 'Check-out Tempat'}
                            </Badge>
                        )}
                    </div>

                    {/* TAB: TIMELINE VIEW */}
                    {activeTab === 'timeline' && (
                        <div className="space-y-4 py-2">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                    <span className="text-xs">Memuat riwayat log perjalanan...</span>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl gap-3">
                                    <div className="p-3 bg-muted rounded-full">
                                        <MapPin className="h-8 w-8 text-muted-foreground/60" />
                                    </div>
                                    <div className="max-w-sm">
                                        <p className="font-semibold text-sm text-foreground">Belum Ada Check-in Perjalanan</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Mulai perjalanan dengan melakukan check-in saat tiba di lokasi penjemputan / tempat pertama.
                                        </p>
                                    </div>
                                    {isDriver && (
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                resetCheckinForm();
                                                setActiveTab('checkin');
                                                captureGps('checkin');
                                            }}
                                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white mt-2 font-semibold"
                                        >
                                            <LogIn className="h-3.5 w-3.5 mr-1" /> Check-in Tempat Pertama
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                                    {logs.map((log, index) => {
                                        const isCurrentlyActive = log.status === 'Checked In';
                                        return (
                                            <div key={log.id} className="relative group">
                                                {/* Bullet indicator */}
                                                <div className={`absolute -left-6 top-1.5 flex items-center justify-center w-6 h-6 rounded-full border-2 bg-background z-10 ${isCurrentlyActive
                                                    ? 'border-emerald-500 text-emerald-600'
                                                    : 'border-blue-600 text-blue-600'
                                                    }`}>
                                                    <span className="text-[10px] font-bold">{log.stop_order}</span>
                                                </div>

                                                <div className={`rounded-xl border p-4 transition-all shadow-2xs space-y-3 ${isCurrentlyActive
                                                    ? 'bg-emerald-500/5 border-emerald-500/30'
                                                    : 'bg-card'
                                                    }`}>
                                                    {/* Stop Header */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                                                <MapPin className="h-4 w-4 text-red-500" />
                                                                {log.location_name}
                                                            </h4>
                                                            <span className="text-[10px] text-muted-foreground font-semibold">
                                                                (Pemberhentian ke-{log.stop_order})
                                                            </span>
                                                        </div>
                                                        <Badge variant="outline" className={
                                                            isCurrentlyActive
                                                                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                                                : 'bg-blue-500/15 text-blue-600 border-blue-500/25'
                                                        }>
                                                            {isCurrentlyActive ? 'Sedang Di Lokasi' : 'Selesai (Checked Out)'}
                                                        </Badge>
                                                    </div>

                                                    {/* Check-in & Check-out details grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                        {/* Check-in Block */}
                                                        <div className="bg-muted/40 p-3 rounded-lg border space-y-2">
                                                            <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                                                                <span className="flex items-center gap-1">
                                                                    <LogIn className="h-3.5 w-3.5" /> Check-in (Tiba)
                                                                </span>
                                                                <span className="font-mono text-[11px] text-muted-foreground">{log.checkin_at}</span>
                                                            </div>

                                                            {log.checkin_notes && (
                                                                <p className="text-muted-foreground italic">"{log.checkin_notes}"</p>
                                                            )}

                                                            <div className="space-y-1.5 pt-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    {log.checkin_latitude && log.checkin_longitude && (
                                                                        <a
                                                                            href={getOsmViewUrl(log.checkin_latitude, log.checkin_longitude)}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium"
                                                                        >
                                                                            <MapPin className="h-3 w-3 text-emerald-600" />
                                                                            Buka di Browser
                                                                            <ExternalLink className="h-2.5 w-2.5" />
                                                                        </a>
                                                                    )}
                                                                    {log.checkin_latitude && (
                                                                        <span className="font-mono text-[10px] text-muted-foreground">
                                                                            ({log.checkin_latitude.toFixed(5)}, {log.checkin_longitude?.toFixed(5)})
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {log.checkin_latitude && log.checkin_longitude && (
                                                                    <div className="rounded-lg overflow-hidden border shadow-2xs mt-1.5 relative">
                                                                        <iframe
                                                                            title={`OpenStreetMap Check-in Stop ${log.stop_order}`}
                                                                            src={getOsmEmbedUrl(log.checkin_latitude, log.checkin_longitude)}
                                                                            className="w-full h-36 border-0"
                                                                            loading="lazy"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {log.checkin_photo_url && (
                                                                <div className="pt-1">
                                                                    <img
                                                                        src={log.checkin_photo_url}
                                                                        alt="Foto Check-in"
                                                                        onClick={() => setZoomedImage(log.checkin_photo_url!)}
                                                                        className="h-20 w-32 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Check-out Block */}
                                                        <div className={`p-3 rounded-lg border space-y-2 ${log.status === 'Checked Out' ? 'bg-muted/40' : 'bg-muted/10 border-dashed'
                                                            }`}>
                                                            <div className="flex items-center justify-between font-semibold text-amber-600 dark:text-amber-400">
                                                                <span className="flex items-center gap-1">
                                                                    <LogOut className="h-3.5 w-3.5" /> Check-out (Berangkat)
                                                                </span>
                                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                                    {log.checkout_at || 'Belum Check-out'}
                                                                </span>
                                                            </div>

                                                            {log.status === 'Checked In' ? (
                                                                <div className="py-2">
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Supir saat ini masih berada di tempat ini.
                                                                    </p>
                                                                    {isDriver && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="destructive"
                                                                            onClick={() => {
                                                                                resetCheckoutForm();
                                                                                setActiveTab('checkout');
                                                                                captureGps('checkout');
                                                                            }}
                                                                            className="text-xs mt-2 w-full font-semibold"
                                                                        >
                                                                            <LogOut className="h-3.5 w-3.5 mr-1" />
                                                                            Check-out dari Lokasi Ini
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {log.checkout_notes && (
                                                                        <p className="text-muted-foreground italic">"{log.checkout_notes}"</p>
                                                                    )}

                                                                    <div className="space-y-1.5 pt-1">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            {log.checkout_latitude && log.checkout_longitude && (
                                                                                <a
                                                                                    href={getOsmViewUrl(log.checkout_latitude, log.checkout_longitude)}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 hover:underline bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium"
                                                                                >
                                                                                    <MapPin className="h-3 w-3 text-amber-600" />
                                                                                    Buka di Browser
                                                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                                                </a>
                                                                            )}
                                                                            {log.checkout_latitude && (
                                                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                                                    ({log.checkout_latitude.toFixed(5)}, {log.checkout_longitude?.toFixed(5)})
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {log.checkout_latitude && log.checkout_longitude && (
                                                                            <div className="rounded-lg overflow-hidden border shadow-2xs mt-1.5 relative">
                                                                                <iframe
                                                                                    title={`OpenStreetMap Check-out Stop ${log.stop_order}`}
                                                                                    src={getOsmEmbedUrl(log.checkout_latitude, log.checkout_longitude)}
                                                                                    className="w-full h-36 border-0"
                                                                                    loading="lazy"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {log.checkout_photo_url && (
                                                                        <div className="pt-1">
                                                                            <img
                                                                                src={log.checkout_photo_url}
                                                                                alt="Foto Check-out"
                                                                                onClick={() => setZoomedImage(log.checkout_photo_url!)}
                                                                                className="h-20 w-32 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Next Stop Prompt when all previous stops are checked out */}
                                    {isDriver && !activeLog && logs.length > 0 && (
                                        <div className="p-4 border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                                                    Pemberhentian ke-{logs.length} Selesai (Checked Out)
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Tekan tombol di samping saat tiba di destinasi berikutnya (Tempat ke-{logs.length + 1}).
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    resetCheckinForm();
                                                    setActiveTab('checkin');
                                                    captureGps('checkin');
                                                }}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0 gap-1.5 font-semibold"
                                            >
                                                <LogIn className="h-3.5 w-3.5" />
                                                + Check-in Tempat ke-{logs.length + 1}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: FORM CHECK-IN */}
                    {activeTab === 'checkin' && (
                        <form onSubmit={handleCheckinSubmit} className="space-y-4 py-2">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
                                <strong>
                                    {logs.length === 0
                                        ? 'Formulir Check-in Tempat Pertama (Penjemputan):'
                                        : `Formulir Check-in Tempat ke-${logs.length + 1}:`}
                                </strong> Silakan masukkan nama tempat tujuan, deteksi koordinat GPS, foto bukti kedatangan, dan catatan.
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location_name" className="text-xs font-semibold">
                                    Nama Lokasi / Destinasi <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="location_name"
                                    placeholder={
                                        logs.length === 0
                                            ? 'Contoh: Penjemputan Bandara Lombok / Rumah Pelanggan'
                                            : `Contoh: Hotel Senggigi / Restoran / Tempat Wisata ke-${logs.length + 1}`
                                    }
                                    value={locationName}
                                    onChange={(e) => setLocationName(e.target.value)}
                                    required
                                />
                            </div>

                            {/* GPS Coordinates Capture */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">Tag Lokasi GPS Map</Label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => captureGps('checkin')}
                                        disabled={gettingGpsCheckin}
                                        className="text-xs h-7 gap-1"
                                    >
                                        {gettingGpsCheckin ? (
                                            <>
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Mendeteksi GPS...
                                            </>
                                        ) : (
                                            <>
                                                <Navigation className="h-3 w-3 text-blue-600" />
                                                Ambil Koordinat GPS
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {checkinLat && checkinLng ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 p-2 bg-muted rounded border text-xs font-mono">
                                            <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                                            <span>Latitude: {checkinLat.toFixed(6)}, Longitude: {checkinLng.toFixed(6)}</span>
                                            <a
                                                href={getOsmViewUrl(checkinLat, checkinLng)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-auto text-emerald-600 hover:underline flex items-center gap-1 font-sans text-[11px] font-medium"
                                            >
                                                Buka di Browser <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                        <div className="rounded-lg overflow-hidden border shadow-2xs relative">
                                            <iframe
                                                title="OpenStreetMap Check-in Form"
                                                src={getOsmEmbedUrl(checkinLat, checkinLng)}
                                                className="w-full h-44 border-0"
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-muted-foreground italic">
                                        Koordinat GPS belum terdeteksi. Tekan tombol 'Ambil Koordinat GPS' untuk mendeteksi lokasi terkini.
                                    </p>
                                )}
                            </div>

                            {/* Foto Checkin */}
                            <div className="space-y-2">
                                <Label htmlFor="checkin_photo" className="text-xs font-semibold flex items-center gap-1">
                                    <Camera className="h-3.5 w-3.5 text-blue-600" />
                                    Foto Bukti Saat Tiba
                                </Label>
                                <Input
                                    id="checkin_photo"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleCheckinPhotoChange}
                                />
                                {checkinPhotoPreview && (
                                    <div className="mt-2 relative inline-block">
                                        <img
                                            src={checkinPhotoPreview}
                                            alt="Preview Foto Check-in"
                                            className="h-28 w-44 object-cover rounded-lg border shadow-sm"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => {
                                                setCheckinPhoto(null);
                                                setCheckinPhotoPreview(null);
                                            }}
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="checkin_notes" className="text-xs font-semibold">
                                    Keterangan / Catatan Saat Tiba
                                </Label>
                                <Textarea
                                    id="checkin_notes"
                                    placeholder="Contoh: Sudah tiba di lobi hotel menunggu tamu turun..."
                                    value={checkinNotes}
                                    onChange={(e) => setCheckinNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setActiveTab('timeline')}
                                    disabled={submittingCheckin}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingCheckin}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                >
                                    {submittingCheckin ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="h-4 w-4" />
                                            Simpan Check-in Lokasi
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* TAB: FORM CHECK-OUT */}
                    {activeTab === 'checkout' && activeLog && (
                        <form onSubmit={handleCheckoutSubmit} className="space-y-4 py-2">
                            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                                <strong>Formulir Check-out dari: {activeLog.location_name}</strong>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    Catat waktu dan foto saat meninggalkan lokasi untuk melanjutkan ke destinasi berikutnya.
                                </p>
                            </div>

                            {/* GPS Coordinates Capture */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">Tag Lokasi GPS Saat Checkout</Label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => captureGps('checkout')}
                                        disabled={gettingGpsCheckout}
                                        className="text-xs h-7 gap-1"
                                    >
                                        {gettingGpsCheckout ? (
                                            <>
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Mendeteksi GPS...
                                            </>
                                        ) : (
                                            <>
                                                <Navigation className="h-3 w-3 text-blue-600" />
                                                Ambil Koordinat GPS
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {checkoutLat && checkoutLng ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 p-2 bg-muted rounded border text-xs font-mono">
                                            <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
                                            <span>Latitude: {checkoutLat.toFixed(6)}, Longitude: {checkoutLng.toFixed(6)}</span>
                                            <a
                                                href={getOsmViewUrl(checkoutLat, checkoutLng)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-auto text-amber-600 hover:underline flex items-center gap-1 font-sans text-[11px] font-medium"
                                            >
                                                Buka di Browser <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                        <div className="rounded-lg overflow-hidden border shadow-2xs relative">
                                            <iframe
                                                title="OpenStreetMap Check-out Form"
                                                src={getOsmEmbedUrl(checkoutLat, checkoutLng)}
                                                className="w-full h-44 border-0"
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-muted-foreground italic">
                                        Koordinat GPS belum terdeteksi. Tekan tombol 'Ambil Koordinat GPS' untuk mendeteksi lokasi terkini.
                                    </p>
                                )}
                            </div>

                            {/* Foto Checkout */}
                            <div className="space-y-2">
                                <Label htmlFor="checkout_photo" className="text-xs font-semibold flex items-center gap-1">
                                    <Camera className="h-3.5 w-3.5 text-blue-600" />
                                    Foto Saat Meninggalkan Lokasi (Opsional)
                                </Label>
                                <Input
                                    id="checkout_photo"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleCheckoutPhotoChange}
                                />
                                {checkoutPhotoPreview && (
                                    <div className="mt-2 relative inline-block">
                                        <img
                                            src={checkoutPhotoPreview}
                                            alt="Preview Foto Check-out"
                                            className="h-28 w-44 object-cover rounded-lg border shadow-sm"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => {
                                                setCheckoutPhoto(null);
                                                setCheckoutPhotoPreview(null);
                                            }}
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="checkout_notes" className="text-xs font-semibold">
                                    Keterangan / Catatan Keberangkatan
                                </Label>
                                <Textarea
                                    id="checkout_notes"
                                    placeholder="Contoh: Tamu sudah masuk mobil, berangkat menuju tujuan berikutnya..."
                                    value={checkoutNotes}
                                    onChange={(e) => setCheckoutNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setActiveTab('timeline')}
                                    disabled={submittingCheckout}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={submittingCheckout}
                                    className="gap-1.5"
                                >
                                    {submittingCheckout ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <LogOut className="h-4 w-4" />
                                            Selesaikan Check-out
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Image Zoom Modal */}
            {zoomedImage && (
                <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
                    <DialogContent className="max-w-4xl p-2 bg-black/90 border-0 flex items-center justify-center">
                        <img
                            src={zoomedImage}
                            alt="Foto Perjalanan"
                            className="max-h-[85vh] w-auto object-contain rounded"
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
