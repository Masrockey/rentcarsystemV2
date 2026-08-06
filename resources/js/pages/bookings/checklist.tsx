import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { MapPin, CheckCircle, ArrowLeftRight, Check, AlertTriangle } from 'lucide-react';
import { index as bookingsIndex } from '@/routes/bookings';
import { Link } from '@inertiajs/react';

type Booking = {
    id: number;
    car_type: string;
    booking_date: string;
    status: 'Pending' | 'Confirmed' | 'On Trip' | 'Returned' | 'Completed';
    customer?: {
        name: string;
        phone: string | null;
    };
    car?: {
        name: string;
        plate_number: string;
        last_km?: number | null;
    };
};

type Props = {
    booking: Booking;
};

export default function BookingChecklist({ booking }: Props) {
    const isDelivery = booking.status === 'Confirmed';
    const [geoStatus, setGeoStatus] = useState<string>('');

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
            body: true,
            interior: true,
            fuel: 'Full',
            cleanliness: 'Clean',
            tires: true,
            documents: true,
        },
        km_out: booking.car?.last_km ?? 0,
        fuel_out: 100,
        handover_location: '',
        checkout_date: getCurrentDate(),
        checkout_time: getCurrentTime(),
        checkout_datetime: '',
        latitude: '',
        longitude: '',
        notes: '',
    });

    const handleCheckboxChange = (field: string, checked: boolean) => {
        setData('checklist', {
            ...data.checklist,
            [field]: checked,
        });
    };

    const handleSelectChange = (field: string, val: string) => {
        setData('checklist', {
            ...data.checklist,
            [field]: val,
        });
    };

    const captureLocation = () => {
        setGeoStatus('Locating...');
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setData((prevData) => ({
                        ...prevData,
                        latitude: position.coords.latitude.toString(),
                        longitude: position.coords.longitude.toString(),
                    }));
                    setGeoStatus('Geotag locked successfully!');
                },
                (error) => {
                    console.error(error);
                    setGeoStatus('Failed to capture location automatically. Please enter manually.');
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            setGeoStatus('Geolocation is not supported by your browser.');
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
            <Head title={isDelivery ? 'Delivery Checklist (Pengeluaran)' : 'Return Checklist (Pengembalian)'} />
            <div className="flex flex-1 flex-col gap-6 p-6 max-w-2xl mx-auto">
                <div className="flex items-center gap-2">
                    <Link href={bookingsIndex().url} className="text-sm text-muted-foreground hover:text-foreground">
                        ← Back to Bookings
                    </Link>
                </div>

                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isDelivery ? 'Delivery Checklist' : 'Return Checklist'}
                    </h1>
                    <p className="text-muted-foreground">
                        Inspect vehicle details and confirm physical status with the customer.
                    </p>
                </div>

                <Card className="border-primary/25 bg-primary/5">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-semibold text-muted-foreground">Customer:</span>
                                <div className="font-semibold text-base">{booking.customer?.name}</div>
                                <div className="text-xs text-muted-foreground">{booking.customer?.phone || ''}</div>
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground">Car Fleet:</span>
                                <div className="font-semibold text-base">{booking.car?.name}</div>
                                <div className="font-mono text-xs text-muted-foreground">{booking.car?.plate_number}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Serah Terima Handover Contract Details (Only for Delivery) */}
                    {isDelivery && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Detail Serah Terima (Handover Details)</CardTitle>
                                <CardDescription>Isi data meteran kendaraan, BBM, dan lokasi serah terima unit.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="km_out">KM Keluar (Odometer Initial)</Label>
                                        <Input
                                            id="km_out"
                                            type="number"
                                            min={0}
                                            value={data.km_out}
                                            onChange={(e) => setData('km_out', parseInt(e.target.value) || 0)}
                                            required
                                        />
                                        {errors.km_out && <p className="text-xs text-red-500">{errors.km_out}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="fuel_out">BBM Keluar (%)</Label>
                                        <Input
                                            id="fuel_out"
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={data.fuel_out}
                                            onChange={(e) => setData('fuel_out', parseInt(e.target.value) || 0)}
                                            required
                                        />
                                        {errors.fuel_out && <p className="text-xs text-red-500">{errors.fuel_out}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="checkout_date">Tanggal Penyerahan</Label>
                                        <Input
                                            id="checkout_date"
                                            type="date"
                                            value={data.checkout_date}
                                            onChange={(e) => setData('checkout_date', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="checkout_time">Jam Penyerahan</Label>
                                        <Input
                                            id="checkout_time"
                                            type="time"
                                            value={data.checkout_time}
                                            onChange={(e) => setData('checkout_time', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="handover_location">Lokasi Serah Terima Unit</Label>
                                    <Input
                                        id="handover_location"
                                        value={data.handover_location}
                                        onChange={(e) => setData('handover_location', e.target.value)}
                                        placeholder="Misal: Bandara Soekarno Hatta, Garasi RS, Rumah Konsumen"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle>Physical Inspection Checklist</CardTitle>
                            <CardDescription>Verify each item before handing over or accepting the car.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-3 rounded-md border p-3">
                                <Checkbox
                                    id="body"
                                    checked={data.checklist.body}
                                    onCheckedChange={(checked) => handleCheckboxChange('body', !!checked)}
                                />
                                <Label htmlFor="body" className="flex flex-col gap-1">
                                    <span>Exterior Body Condition (No major scratch/dent)</span>
                                    <span className="text-xs font-normal text-muted-foreground">Ensure the car body is clean and free of unrecorded damage.</span>
                                </Label>
                            </div>

                            <div className="flex items-center space-x-3 rounded-md border p-3">
                                <Checkbox
                                    id="interior"
                                    checked={data.checklist.interior}
                                    onCheckedChange={(checked) => handleCheckboxChange('interior', !!checked)}
                                />
                                <Label htmlFor="interior" className="flex flex-col gap-1">
                                    <span>Interior Cleanliness & Features</span>
                                    <span className="text-xs font-normal text-muted-foreground">Verify dashboard, AC, radio, and interior seating are in order.</span>
                                </Label>
                            </div>

                            <div className="flex items-center space-x-3 rounded-md border p-3">
                                <Checkbox
                                    id="tires"
                                    checked={data.checklist.tires}
                                    onCheckedChange={(checked) => handleCheckboxChange('tires', !!checked)}
                                />
                                <Label htmlFor="tires" className="flex flex-col gap-1">
                                    <span>Tire Pressure & Spare Tire</span>
                                    <span className="text-xs font-normal text-muted-foreground">Inspect tires condition and make sure tools/spare tire are present.</span>
                                </Label>
                            </div>

                            <div className="flex items-center space-x-3 rounded-md border p-3">
                                <Checkbox
                                    id="documents"
                                    checked={data.checklist.documents}
                                    onCheckedChange={(checked) => handleCheckboxChange('documents', !!checked)}
                                />
                                <Label htmlFor="documents" className="flex flex-col gap-1">
                                    <span>STNK & Insurance Documents</span>
                                    <span className="text-xs font-normal text-muted-foreground">Verify the physical vehicle documents are in the glovebox.</span>
                                </Label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Fuel Level</Label>
                                    <select
                                        className="w-full rounded-md border bg-transparent p-2 text-sm"
                                        value={data.checklist.fuel}
                                        onChange={(e) => handleSelectChange('fuel', e.target.value)}
                                    >
                                        <option value="Full">Full</option>
                                        <option value="Three-Quarters">Three-Quarters</option>
                                        <option value="Half">Half</option>
                                        <option value="Quarter">Quarter</option>
                                        <option value="Empty">Empty</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Cleanliness</Label>
                                    <select
                                        className="w-full rounded-md border bg-transparent p-2 text-sm"
                                        value={data.checklist.cleanliness}
                                        onChange={(e) => handleSelectChange('cleanliness', e.target.value)}
                                    >
                                        <option value="Clean">Clean</option>
                                        <option value="Moderately Clean">Moderately Clean</option>
                                        <option value="Dirty">Dirty</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Geotagging section - only for Delivery (Pengeluaran) checklist */}
                    {isDelivery && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-primary" /> Geotagging
                                </CardTitle>
                                <CardDescription>Lock coordinates to record handoff location.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Button type="button" onClick={captureLocation} variant="outline" className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" /> Fetch Location
                                    </Button>
                                    <span className="text-xs self-center font-medium text-muted-foreground">{geoStatus}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="latitude">Latitude</Label>
                                        <Input
                                            id="latitude"
                                            value={data.latitude}
                                            onChange={(e) => setData('latitude', e.target.value)}
                                            placeholder="e.g. -6.2088"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="longitude">Longitude</Label>
                                        <Input
                                            id="longitude"
                                            value={data.longitude}
                                            onChange={(e) => setData('longitude', e.target.value)}
                                            placeholder="e.g. 106.8456"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Inspection Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Describe physical damages, extra requests, or additional remarks..."
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </CardContent>
                    </Card>

                    <Button type="submit" size="lg" className="w-full" disabled={processing}>
                        <Check className="h-5 w-5 mr-1" />
                        {isDelivery ? 'Submit Delivery Handover' : 'Submit Return Collection'}
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
            title: 'Checklist',
            href: '#',
        },
    ],
};
