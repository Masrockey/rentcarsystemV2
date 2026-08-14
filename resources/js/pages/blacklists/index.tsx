import { Head, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { Plus, Search, ShieldAlert, Edit, Trash2, Phone, Calendar, User, FileText, Image as ImageIcon, X, MapPin, AlertCircle, Info, FileSpreadsheet, Download, Upload } from 'lucide-react';
import { index as blacklistsIndex } from '@/routes/blacklists';
import * as XLSX from 'xlsx';

type Blacklist = {
    id: number;
    name: string;
    phone: string;
    nik?: string | null;
    address?: string | null;
    incident_date?: string | null;
    perpetrator_info?: string | null;
    blacklisted_by?: string | null;
    report_date?: string | null;
    evidence_photos?: string[] | null;
    created_at?: string;
    creator?: {
        id: number;
        name: string;
    } | null;
};

type ImportRow = {
    name: string;
    phone: string;
    nik: string;
    address: string;
    incident_date: string;
    perpetrator_info: string;
    blacklisted_by: string;
    report_date: string;
};

type Props = {
    blacklists: Blacklist[];
};

export default function BlacklistsIndex({ blacklists }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBlacklist, setEditingBlacklist] = useState<Blacklist | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Excel Import states
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importPreviewRows, setImportPreviewRows] = useState<ImportRow[]>([]);
    const [isSubmittingImport, setIsSubmittingImport] = useState(false);

    // Lightbox / Image preview state
    const [previewPhotos, setPreviewPhotos] = useState<string[] | null>(null);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);

    // Local photo preview URLs during file upload
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

    const { data, setData, post, reset, processing, errors, clearErrors } = useForm({
        name: '',
        phone: '',
        nik: '',
        address: '',
        incident_date: new Date().toISOString().slice(0, 10),
        perpetrator_info: '',
        blacklisted_by: '',
        report_date: new Date().toISOString().slice(0, 10),
        evidence_photos: [] as (File | string)[],
    });

    const openCreate = () => {
        setEditingBlacklist(null);
        reset();
        setPhotoPreviews([]);
        clearErrors();
        setIsFormOpen(true);
    };

    const openEdit = (item: Blacklist) => {
        setEditingBlacklist(item);
        clearErrors();

        const existingPhotos = Array.isArray(item.evidence_photos) ? item.evidence_photos : [];
        setPhotoPreviews(existingPhotos);

        setData({
            name: item.name,
            phone: item.phone,
            nik: item.nik || '',
            address: item.address || '',
            incident_date: item.incident_date ? item.incident_date.slice(0, 10) : '',
            perpetrator_info: item.perpetrator_info || '',
            blacklisted_by: item.blacklisted_by || '',
            report_date: item.report_date ? item.report_date.slice(0, 10) : '',
            evidence_photos: existingPhotos,
        });

        setIsFormOpen(true);
    };

    const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        const objectUrls = files.map((file) => URL.createObjectURL(file));

        setPhotoPreviews((prev) => [...prev, ...objectUrls]);
        setData('evidence_photos', [...((data.evidence_photos || []) as (File | string)[]), ...files]);
    };

    const handlePhotoRemove = (index: number) => {
        const currentPhotos = [...((data.evidence_photos || []) as (File | string)[])];
        currentPhotos.splice(index, 1);
        setData('evidence_photos', currentPhotos);

        const updatedPreviews = [...photoPreviews];
        const removedUrl = updatedPreviews.splice(index, 1)[0];
        if (removedUrl && removedUrl.startsWith('blob:')) {
            URL.revokeObjectURL(removedUrl);
        }
        setPhotoPreviews(updatedPreviews);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingBlacklist) {
            router.post(`/blacklists/${editingBlacklist.id}`, {
                _method: 'put',
                ...data,
            }, {
                onSuccess: () => {
                    setIsFormOpen(false);
                    reset();
                },
            });
        } else {
            post('/blacklists', {
                onSuccess: () => {
                    setIsFormOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (id: number) => {
        router.delete(`/blacklists/${id}`, {
            onSuccess: () => setDeleteId(null),
        });
    };

    // Download template Excel format
    const downloadTemplateExcel = () => {
        const templateData = [
            {
                'Nama': 'Budi Santoso',
                'No HP': '081234567890',
                'NIK': '3201010101010001',
                'Alamat': 'Jl. Sudirman No. 12, Jakarta',
                'Tanggal Kejadian': '2026-08-01',
                'Informasi Pelaku': 'Membawa kabur mobil sewa tanpa kabar',
                'Blacklist Dari': 'Cabang Jakarta',
                'Tanggal Lapor': '2026-08-02',
            },
            {
                'Nama': 'Ahmad Dahlan',
                'No HP': '081398765432',
                'NIK': '5101010101010005',
                'Alamat': 'Jl. Sunset Road, Denpasar',
                'Tanggal Kejadian': '2026-08-05',
                'Informasi Pelaku': 'Denda belum dibayar & bodi lecet parah',
                'Blacklist Dari': 'Bali Utama',
                'Tanggal Lapor': '2026-08-06',
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Blacklist Konsumen');
        XLSX.writeFile(workbook, 'Template_Blacklist_Konsumen.xlsx');
    };

    // Handle File Excel upload & parsing
    const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet);

                const parsedRows: ImportRow[] = jsonRows.map((row) => {
                    const getVal = (keys: string[]) => {
                        // First pass: exact match (case-insensitive)
                        for (const k of keys) {
                            const foundKey = Object.keys(row).find(
                                (rk) => rk.trim().toLowerCase() === k.toLowerCase()
                            );
                            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                                return row[foundKey];
                            }
                        }
                        // Second pass: substring match (case-insensitive)
                        for (const k of keys) {
                            const foundKey = Object.keys(row).find(
                                (rk) => rk.trim().toLowerCase().includes(k.toLowerCase())
                            );
                            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                                return row[foundKey];
                            }
                        }
                        return '';
                    };

                    const formatDateVal = (val: any) => {
                        if (!val) return '';
                        if (val instanceof Date) {
                            return val.toISOString().slice(0, 10);
                        }
                        const valStr = String(val).trim();
                        // Excel serial number format e.g. 46244
                        if (!isNaN(Number(valStr)) && Number(valStr) > 10000 && Number(valStr) < 100000) {
                            const dateObj = new Date(Math.round((Number(valStr) - 25569) * 86400 * 1000));
                            return dateObj.toISOString().slice(0, 10);
                        }
                        return valStr;
                    };

                    return {
                        name: String(getVal(['nama', 'name', 'nama konsumen', 'nama pelanggan'])).trim(),
                        phone: String(getVal(['no. hp', 'no hp', 'phone', 'telepon', 'nohp', 'no_hp'])).trim(),
                        nik: String(getVal(['nik', 'no ktp', 'ktp'])).trim(),
                        address: String(getVal(['alamat', 'address'])).trim(),
                        incident_date: formatDateVal(getVal(['tgl kejadian', 'tanggal kejadian', 'incident_date', 'tanggal'])),
                        perpetrator_info: String(getVal(['informasi pelaku / kejadian', 'informasi pelaku', 'pelaku / kejadian', 'kronologi', 'keterangan', 'pelaku', 'perpetrator_info'])).trim(),
                        blacklisted_by: String(getVal(['blacklist dari', 'pelapor', 'cabang', 'blacklisted_by'])).trim(),
                        report_date: formatDateVal(getVal(['tgl lapor', 'tanggal lapor', 'report_date'])),
                    };
                }).filter((r) => r.name !== '' && r.phone !== '');

                if (parsedRows.length === 0) {
                    alert('File Excel tidak berisi data valid atau kolom Nama & No HP kosong.');
                    return;
                }

                setImportPreviewRows(parsedRows);
                setIsImportModalOpen(true);
            } catch (err) {
                console.error('Error parsing excel:', err);
                alert('Gagal membaca file Excel. Pastikan format file .xlsx, .xls, atau .csv');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const processExcelImportSubmit = () => {
        if (importPreviewRows.length === 0) return;
        setIsSubmittingImport(true);

        router.post('/blacklists/import', {
            rows: importPreviewRows,
        }, {
            onSuccess: () => {
                setIsImportModalOpen(false);
                setImportPreviewRows([]);
                setIsSubmittingImport(false);
            },
            onError: () => {
                setIsSubmittingImport(false);
            }
        });
    };

    // Filter blacklists
    const filteredBlacklists = blacklists.filter((item) => {
        const query = searchQuery.toLowerCase();
        const name = item.name.toLowerCase();
        const phone = item.phone.toLowerCase();
        const nik = (item.nik || '').toLowerCase();
        const perpetrator = (item.perpetrator_info || '').toLowerCase();
        const blacklistedBy = (item.blacklisted_by || '').toLowerCase();

        return (
            name.includes(query) ||
            phone.includes(query) ||
            nik.includes(query) ||
            perpetrator.includes(query) ||
            blacklistedBy.includes(query)
        );
    });

    return (
        <>
            <Head title="Blacklist Konsumen - Sistem RentCars" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5 text-red-600 dark:text-red-400">
                            <ShieldAlert className="h-8 w-8" /> Blacklist Konsumen
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Daftar pelanggan bermasalah, penggelapan, denda menunggak, atau tindakan perusakan unit rental.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Hidden File Input for Excel */}
                        <input
                            type="file"
                            id="excel_import_input"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleExcelFileSelect}
                            className="hidden"
                        />

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('excel_import_input')?.click()}
                            className="border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold flex items-center gap-1.5"
                        >
                            <FileSpreadsheet className="h-4 w-4" /> Import Excel (.xlsx)
                        </Button>

                        <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-sm">
                            <Plus className="h-4 w-4" /> Tambah Blacklist
                        </Button>
                    </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="border-l-4 border-l-red-500 shadow-2xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Konsumen Blacklist</CardTitle>
                            <ShieldAlert className="h-5 w-5 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{blacklists.length} Orangnya</div>
                            <p className="text-xs text-muted-foreground mt-1">Terdaftar dalam sistem pengawasan</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 shadow-2xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Laporan Memiliki Evidance</CardTitle>
                            <ImageIcon className="h-5 w-5 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {blacklists.filter((b) => b.evidence_photos && b.evidence_photos.length > 0).length} Data
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Dilengkapi bukti foto fisik & dokumen</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500 shadow-2xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Laporan Bulan Ini</CardTitle>
                            <Calendar className="h-5 w-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {blacklists.filter((b) => {
                                    if (!b.created_at) return false;
                                    const d = new Date(b.created_at);
                                    const now = new Date();
                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                }).length} Data
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Penambahan laporan terkini</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Table Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <CardTitle className="text-base font-bold">Daftar Pelanggan Bermasalah (Blacklist)</CardTitle>
                                <CardDescription>Gunakan fitur cari untuk memeriksa NIK, Nama, No HP, atau Instansi Pelapor.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={downloadTemplateExcel}
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                >
                                    <Download className="h-3.5 w-3.5" /> Download Template Excel
                                </Button>
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Cari Nama, No HP, NIK, Pelapor..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-y">
                                    <tr>
                                        <th className="px-4 py-3">NAMA</th>
                                        <th className="px-4 py-3">NO. HP</th>
                                        <th className="px-4 py-3">NIK</th>
                                        <th className="px-4 py-3">ALAMAT</th>
                                        <th className="px-4 py-3">TGL KEJADIAN</th>
                                        <th className="px-4 py-3">INFORMASI PELAKU / KEJADIAN</th>
                                        <th className="px-4 py-3">BLACKLIST DARI</th>
                                        <th className="px-4 py-3">TGL LAPOR</th>
                                        <th className="px-4 py-3">FOTO EVIDANCE</th>
                                        <th className="px-4 py-3 text-right">AKSI</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredBlacklists.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="text-center py-10 text-muted-foreground">
                                                Tidak ada data konsumen blacklist yang ditemukan.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBlacklists.map((item) => {
                                            const photos = Array.isArray(item.evidence_photos) ? item.evidence_photos : [];

                                            return (
                                                <tr key={item.id} className="hover:bg-red-500/5 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-foreground">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-red-600 font-extrabold">•</span> {item.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold font-mono text-foreground whitespace-nowrap">
                                                        {item.phone}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                                        {item.nik || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate" title={item.address || '-'}>
                                                        {item.address || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                                                        {item.incident_date || '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs text-foreground max-w-[220px] whitespace-normal line-clamp-2" title={item.perpetrator_info || '-'}>
                                                            {item.perpetrator_info || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30 font-semibold">
                                                            {item.blacklisted_by || 'Rental System'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                        {item.report_date || '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {photos.length > 0 ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPreviewPhotos(photos);
                                                                        setActivePhotoIndex(0);
                                                                    }}
                                                                    className="relative group w-10 h-10 rounded-lg overflow-hidden border border-red-200 shadow-2xs hover:scale-105 transition-all"
                                                                >
                                                                    <img src={photos[0]} alt="Evidance" className="w-full h-full object-cover" />
                                                                    {photos.length > 1 && (
                                                                        <div className="absolute inset-0 bg-black/50 text-white text-[10px] font-bold flex items-center justify-center">
                                                                            +{photos.length - 1}
                                                                        </div>
                                                                    )}
                                                                </button>
                                                                <span className="text-[11px] font-medium text-muted-foreground">{photos.length} Foto</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">Tidak Ada Foto</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEdit(item)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-600"
                                                            onClick={() => setDeleteId(item.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal Import Excel Preview */}
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <FileSpreadsheet className="h-5 w-5" />
                            Konfirmasi Import Data Excel Blacklist
                        </DialogTitle>
                        <DialogDescription>
                            Ditemukan <strong>{importPreviewRows.length} data</strong> dari file Excel. Periksa kembali baris data di bawah sebelum disimpan ke database.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3">
                        <div className="overflow-x-auto border rounded-lg max-h-[350px]">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted text-muted-foreground sticky top-0 uppercase font-semibold">
                                    <tr>
                                        <th className="px-3 py-2">NO</th>
                                        <th className="px-3 py-2">NAMA</th>
                                        <th className="px-3 py-2">NO. HP</th>
                                        <th className="px-3 py-2">NIK</th>
                                        <th className="px-3 py-2">ALAMAT</th>
                                        <th className="px-3 py-2">INFORMASI PELAKU</th>
                                        <th className="px-3 py-2">PELAPOR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {importPreviewRows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-muted/50">
                                            <td className="px-3 py-2 font-mono font-bold text-muted-foreground">{idx + 1}</td>
                                            <td className="px-3 py-2 font-semibold text-foreground">{row.name}</td>
                                            <td className="px-3 py-2 font-mono">{row.phone}</td>
                                            <td className="px-3 py-2 font-mono">{row.nik || '-'}</td>
                                            <td className="px-3 py-2 truncate max-w-[150px]">{row.address || '-'}</td>
                                            <td className="px-3 py-2 truncate max-w-[180px]">{row.perpetrator_info || '-'}</td>
                                            <td className="px-3 py-2">{row.blacklisted_by || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={processExcelImportSubmit}
                            disabled={isSubmittingImport}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                        >
                            <Upload className="h-4 w-4" />
                            {isSubmittingImport ? 'Mengimpor Data...' : `Simpan ${importPreviewRows.length} Data Ke Database`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Form Tambah / Edit Blacklist */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="h-5 w-5" />
                            {editingBlacklist ? 'Edit Data Blacklist Konsumen' : 'Tambah Konsumen Ke Daftar Blacklist'}
                        </DialogTitle>
                        <DialogDescription>
                            Isi formulir data pelanggan bermasalah dan upload bukti kejadian secara akurat.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs font-semibold">Nama Konsumen *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Nama Lengkap Konsumen"
                                    required
                                />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-xs font-semibold">No HP / WhatsApp *</Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="081234567890"
                                    required
                                />
                                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="nik" className="text-xs font-semibold">NIK KTP (Opsional)</Label>
                                <Input
                                    id="nik"
                                    value={data.nik}
                                    onChange={(e) => setData('nik', e.target.value)}
                                    placeholder="16 Digit NIK KTP"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="blacklisted_by" className="text-xs font-semibold">Blacklist Dari (Pelapor)</Label>
                                <Input
                                    id="blacklisted_by"
                                    value={data.blacklisted_by}
                                    onChange={(e) => setData('blacklisted_by', e.target.value)}
                                    placeholder="Misal: Rental Bali Utama / Cabang A"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="address" className="text-xs font-semibold">Alamat Konsumen</Label>
                            <Input
                                id="address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                placeholder="Alamat sesuai KTP atau tempat tinggal"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="incident_date" className="text-xs font-semibold">Tanggal Kejadian</Label>
                                <Input
                                    id="incident_date"
                                    type="date"
                                    value={data.incident_date}
                                    onChange={(e) => setData('incident_date', e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="report_date" className="text-xs font-semibold">Tanggal Lapor</Label>
                                <Input
                                    id="report_date"
                                    type="date"
                                    value={data.report_date}
                                    onChange={(e) => setData('report_date', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="perpetrator_info" className="text-xs font-semibold">Informasi Pelaku / Kronologi Kejadian</Label>
                            <textarea
                                id="perpetrator_info"
                                rows={3}
                                value={data.perpetrator_info}
                                onChange={(e) => setData('perpetrator_info', e.target.value)}
                                placeholder="Tuliskan kronologi singkat, denda belum dibayar, atau modus penggelapan..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-2xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>

                        {/* File Upload Foto Evidance */}
                        <div className="space-y-2 pt-2 border-t">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                <ImageIcon className="h-4 w-4 text-red-500" /> Foto Evidance / Bukti Kejadian
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Upload foto KTP, foto kendaraan rusak, bukti transfer palsu, atau bukti percakapan.
                            </p>

                            <Input
                                id="evidence_photos_input"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoAdd}
                                className="cursor-pointer text-xs"
                            />

                            {/* Photo Gallery Grid */}
                            {photoPreviews.length > 0 && (
                                <div className="grid grid-cols-4 gap-2.5 pt-2">
                                    {photoPreviews.map((url, idx) => (
                                        <div key={idx} className="relative group aspect-square rounded-lg border bg-muted/30 overflow-hidden shadow-2xs">
                                            <img src={url} alt={`Evidance ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handlePhotoRemove(idx)}
                                                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                                {processing ? 'Simpan Data...' : editingBlacklist ? 'Simpan Perubahan' : 'Tambah Blacklist'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Lightbox Photo Preview Modal */}
            <Dialog open={previewPhotos !== null} onOpenChange={() => setPreviewPhotos(null)}>
                <DialogContent className="max-w-2xl bg-black/95 text-white border-neutral-800">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center justify-between">
                            <span>Foto Evidance ({activePhotoIndex + 1} / {previewPhotos?.length || 0})</span>
                        </DialogTitle>
                    </DialogHeader>

                    {previewPhotos && previewPhotos.length > 0 && (
                        <div className="flex flex-col items-center justify-center space-y-4 py-2">
                            <div className="w-full h-96 flex items-center justify-center overflow-hidden rounded-lg bg-neutral-900 border border-neutral-800">
                                <img
                                    src={previewPhotos[activePhotoIndex]}
                                    alt="Foto Evidance Preview"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>

                            {previewPhotos.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto p-1">
                                    {previewPhotos.map((imgUrl, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setActivePhotoIndex(i)}
                                            className={`w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                                                i === activePhotoIndex ? 'border-red-500 scale-105' : 'border-neutral-700 opacity-60'
                                            }`}
                                        >
                                            <img src={imgUrl} alt="Thumb" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal Confirm Delete */}
            <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Konfirmasi Hapus Data Blacklist</DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-sm text-muted-foreground">
                        Apakah Anda yakin ingin menghapus data blacklist konsumen ini dari sistem?
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteId && handleDelete(deleteId)}
                        >
                            Hapus Blacklist
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

BlacklistsIndex.layout = {
    breadcrumbs: [{ title: 'Blacklist Konsumen', href: blacklistsIndex() }],
};
