import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    History,
    Search,
    Filter,
    X,
    Calendar,
    User,
    Laptop,
    Globe,
    Clock,
    Plus,
    Edit,
    Trash2,
    LogIn,
    LogOut,
    AlertTriangle,
    CheckCircle2,
    Eye,
    TrendingUp,
    Shield,
    RotateCcw,
} from 'lucide-react';
import Pagination, { PaginatedData } from '@/components/pagination';

type ActivityLog = {
    id: number;
    user_id: number | null;
    user_name: string | null;
    user_role: string | null;
    action: string;
    subject_type: string | null;
    subject_id: number | null;
    subject_label: string | null;
    description: string;
    properties: Record<string, any> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
    } | null;
};

type Option = {
    value: string;
    label: string;
};

type Props = {
    logs: PaginatedData<ActivityLog>;
    filters: {
        search: string;
        action: string;
        subject_type: string;
        user_id: string;
        start_date: string;
        end_date: string;
        preset: string;
    };
    stats: {
        total_today: number;
        total_week: number;
        total_month: number;
        total_all: number;
        top_user: string;
    };
    users: { id: number; name: string; email: string }[];
    availableActions: Option[];
    availableSubjectTypes: Option[];
};

export default function ActivityLogsIndex({
    logs,
    filters,
    stats,
    users,
    availableActions,
    availableSubjectTypes,
}: Props) {
    const logList = logs?.data || [];

    // Local filter state
    const [search, setSearch] = useState(filters.search || '');
    const [action, setAction] = useState(filters.action || 'all');
    const [subjectType, setSubjectType] = useState(filters.subject_type || 'all');
    const [userId, setUserId] = useState(filters.user_id || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    // Modal state for viewing diff/properties
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

    // Modal state for deleting logs
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletePeriod, setDeletePeriod] = useState<'1_day' | '1_week' | '2_weeks' | '1_month' | 'custom' | 'all'>('1_month');
    const [deleteStartDate, setDeleteStartDate] = useState('');
    const [deleteEndDate, setDeleteEndDate] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsDeleting(true);

        router.delete('/activity-logs', {
            data: {
                period: deletePeriod,
                start_date: deleteStartDate,
                end_date: deleteEndDate,
            },
            preserveScroll: true,
            onSuccess: () => {
                setIsDeleteOpen(false);
                setDeleteStartDate('');
                setDeleteEndDate('');
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    const applyFilters = (newFilters: Partial<typeof filters>) => {
        router.get(
            '/activity-logs',
            {
                search,
                action,
                subject_type: subjectType,
                user_id: userId,
                start_date: startDate,
                end_date: endDate,
                ...newFilters,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search });
    };

    const handleResetFilters = () => {
        setSearch('');
        setAction('all');
        setSubjectType('all');
        setUserId('all');
        setStartDate('');
        setEndDate('');
        router.get('/activity-logs', {}, { preserveState: true, preserveScroll: true });
    };

    const handlePreset = (presetName: string) => {
        const now = new Date();
        const formatDate = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        let sDate = '';
        let eDate = '';

        if (presetName === 'today') {
            const today = formatDate(now);
            sDate = today;
            eDate = today;
        } else if (presetName === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - (day === 0 ? 6 : day - 1);
            const monday = new Date(now.setDate(diff));
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sDate = formatDate(monday);
            eDate = formatDate(sunday);
        } else if (presetName === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            sDate = formatDate(start);
            eDate = formatDate(end);
        }

        setStartDate(sDate);
        setEndDate(eDate);
        applyFilters({ start_date: sDate, end_date: eDate, preset: presetName });
    };

    const formatDateTime = (dtStr: string) => {
        if (!dtStr) return '-';
        const date = new Date(dtStr);
        return new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'medium',
        }).format(date);
    };

    const getRelativeTime = (dtStr: string) => {
        if (!dtStr) return '';
        const now = new Date().getTime();
        const then = new Date(dtStr).getTime();
        const diffSeconds = Math.floor((now - then) / 1000);

        if (diffSeconds < 60) return 'Baru saja';
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} jam lalu`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Kemarin';
        if (diffDays < 30) return `${diffDays} hari lalu`;
        return '';
    };

    const actionBadge = (act: string) => {
        switch (act) {
            case 'created':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 gap-1 font-semibold">
                        <Plus className="h-3 w-3" /> Tambah
                    </Badge>
                );
            case 'updated':
                return (
                    <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400 gap-1 font-semibold">
                        <Edit className="h-3 w-3" /> Ubah
                    </Badge>
                );
            case 'deleted':
                return (
                    <Badge className="bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400 gap-1 font-semibold">
                        <Trash2 className="h-3 w-3" /> Hapus
                    </Badge>
                );
            case 'login':
                return (
                    <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400 gap-1 font-semibold">
                        <LogIn className="h-3 w-3" /> Login
                    </Badge>
                );
            case 'logout':
                return (
                    <Badge className="bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-400 gap-1 font-semibold">
                        <LogOut className="h-3 w-3" /> Logout
                    </Badge>
                );
            case 'failed_login':
                return (
                    <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 font-semibold">
                        <AlertTriangle className="h-3 w-3" /> Gagal Login
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="gap-1 font-semibold">
                        {act}
                    </Badge>
                );
        }
    };

    const subjectBadge = (type: string | null) => {
        if (!type) return <span className="text-muted-foreground">-</span>;
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border">
                {type}
            </span>
        );
    };

    const hasDiff = (log: ActivityLog) => {
        return (
            log.properties &&
            (log.properties.old || log.properties.new || log.properties.attributes)
        );
    };

    return (
        <>
            <Head title="Log Aktivitas Sistem" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <History className="h-7 w-7 text-primary" />
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Log Aktivitas Sistem</h1>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Audit trail dan rekaman seluruh perubahan data, operasional, & sesi login untuk Super Admin.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsDeleteOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold shadow-xs"
                        >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus Log
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.reload()}
                            className="flex items-center gap-1.5 text-xs font-semibold shadow-xs"
                        >
                            <RotateCcw className="h-3.5 w-3.5" /> Segarkan Data
                        </Button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-emerald-500 shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                                Aktivitas Hari Ini
                                <Clock className="h-4 w-4 text-emerald-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{stats.total_today.toLocaleString('id-ID')}</div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Aktivitas tercatat hari ini</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500 shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                                Aktivitas Minggu Ini
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{stats.total_week.toLocaleString('id-ID')}</div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Senin s/d hari ini</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500 shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                                Total Keseluruhan Log
                                <Shield className="h-4 w-4 text-purple-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{stats.total_all.toLocaleString('id-ID')}</div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Rekaman audit tersimpan</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                                Pengguna Teraktif
                                <User className="h-4 w-4 text-amber-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-bold text-foreground truncate" title={stats.top_user}>
                                {stats.top_user}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Paling sering beraktivitas</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Bar */}
                <Card className="shadow-xs">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-primary" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    Filter & Pencarian Log
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreset('today')}
                                    className="h-7 text-xs px-2.5"
                                >
                                    Hari Ini
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreset('week')}
                                    className="h-7 text-xs px-2.5"
                                >
                                    Minggu Ini
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreset('month')}
                                    className="h-7 text-xs px-2.5"
                                >
                                    Bulan Ini
                                </Button>
                                {(search || action !== 'all' || subjectType !== 'all' || userId !== 'all' || startDate || endDate) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="h-7 text-xs px-2 text-destructive hover:text-destructive flex items-center gap-1"
                                    >
                                        <X className="h-3.5 w-3.5" /> Reset
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {/* Search Input */}
                            <div className="relative sm:col-span-2 lg:col-span-2">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Cari deskripsi, nama user, subjek, IP..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 text-xs"
                                />
                            </div>

                            {/* Action Filter */}
                            <div>
                                <select
                                    value={action}
                                    onChange={(e) => {
                                        setAction(e.target.value);
                                        applyFilters({ action: e.target.value });
                                    }}
                                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                                >
                                    {availableActions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Subject Type Filter */}
                            <div>
                                <select
                                    value={subjectType}
                                    onChange={(e) => {
                                        setSubjectType(e.target.value);
                                        applyFilters({ subject_type: e.target.value });
                                    }}
                                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                                >
                                    {availableSubjectTypes.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* User Filter */}
                            <div>
                                <select
                                    value={userId}
                                    onChange={(e) => {
                                        setUserId(e.target.value);
                                        applyFilters({ user_id: e.target.value });
                                    }}
                                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                                >
                                    <option value="all">Semua Pengguna</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={String(u.id)}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </form>

                        {/* Date Range Inputs */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" /> Rentang Tanggal:
                            </span>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        applyFilters({ start_date: e.target.value });
                                    }}
                                    className="h-8 text-xs w-36"
                                />
                                <span className="text-muted-foreground">s/d</span>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        applyFilters({ end_date: e.target.value });
                                    }}
                                    className="h-8 text-xs w-36"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table Card */}
                <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <span>Daftar Log Aktivitas</span>
                            <Badge variant="secondary" className="font-normal text-xs">
                                {logs.total.toLocaleString('id-ID')} entri
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Mobile Cards View */}
                        <div className="divide-y md:hidden">
                            {logList.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground text-sm">
                                    Tidak ada log aktivitas yang sesuai dengan filter.
                                </div>
                            ) : (
                                logList.map((log) => (
                                    <div key={log.id} className="p-4 space-y-2 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                {actionBadge(log.action)}
                                                {subjectBadge(log.subject_type)}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                {getRelativeTime(log.created_at) || formatDateTime(log.created_at)}
                                            </span>
                                        </div>

                                        <p className="text-xs font-semibold text-foreground leading-relaxed">
                                            {log.description}
                                        </p>

                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                <strong>{log.user_name || 'Sistem'}</strong>
                                                {log.user_role && <span className="text-[10px] bg-muted px-1 rounded">({log.user_role})</span>}
                                            </span>
                                            {log.ip_address && (
                                                <span className="flex items-center gap-1 font-mono text-[10px]">
                                                    <Globe className="h-3 w-3" /> {log.ip_address}
                                                </span>
                                            )}
                                        </div>

                                        {hasDiff(log) && (
                                            <div className="pt-2 border-t flex justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedLog(log)}
                                                    className="h-7 text-xs gap-1"
                                                >
                                                    <Eye className="h-3 w-3" /> Detail Perubahan
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block relative overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
                                    <tr>
                                        <th className="px-5 py-3 w-44">Waktu</th>
                                        <th className="px-5 py-3 w-48">Pengguna</th>
                                        <th className="px-5 py-3 w-28">Aksi</th>
                                        <th className="px-5 py-3 w-36">Modul / Entitas</th>
                                        <th className="px-5 py-3">Deskripsi Aktivitas</th>
                                        <th className="px-5 py-3 w-32">IP Address</th>
                                        <th className="px-5 py-3 w-24 text-right">Detail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {logList.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                                Tidak ada log aktivitas yang sesuai dengan filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        logList.map((log) => (
                                            <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                                                {/* Waktu */}
                                                <td className="px-5 py-3.5 text-xs">
                                                    <div className="font-medium text-foreground whitespace-nowrap">
                                                        {formatDateTime(log.created_at)}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-sans mt-0.5">
                                                        {getRelativeTime(log.created_at)}
                                                    </div>
                                                </td>

                                                {/* Pengguna */}
                                                <td className="px-5 py-3.5 text-xs">
                                                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        <span>{log.user_name || 'Sistem'}</span>
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground pl-5 truncate max-w-[170px]">
                                                        {log.user_role || log.user?.email || '-'}
                                                    </div>
                                                </td>

                                                {/* Aksi */}
                                                <td className="px-5 py-3.5">{actionBadge(log.action)}</td>

                                                {/* Modul */}
                                                <td className="px-5 py-3.5 text-xs">
                                                    <div>{subjectBadge(log.subject_type)}</div>
                                                    {log.subject_label && (
                                                        <div className="text-[11px] text-muted-foreground truncate max-w-[140px] mt-0.5 font-mono" title={log.subject_label}>
                                                            {log.subject_label}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Deskripsi */}
                                                <td className="px-5 py-3.5 text-xs leading-relaxed">
                                                    <span className="text-foreground">{log.description}</span>
                                                </td>

                                                {/* IP Address */}
                                                <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                    {log.ip_address || '-'}
                                                </td>

                                                {/* Action Button */}
                                                <td className="px-5 py-3.5 text-right">
                                                    {hasDiff(log) ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedLog(log)}
                                                            className="h-8 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                                            title="Lihat rincian nilai data yang diubah"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" /> Diff
                                                        </Button>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs italic">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t">
                            <Pagination data={logs} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal Detail Perubahan (Diff Viewer) */}
            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" /> Detail Rincian Aktivitas
                        </DialogTitle>
                        <DialogDescription>
                            Informasi komparasi perubahan data dan atribut teknis yang terekam.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4 py-2 text-xs">
                            {/* Summary Box */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg border">
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Waktu</span>
                                    <span className="font-semibold text-foreground">{formatDateTime(selectedLog.created_at)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Pengguna</span>
                                    <span className="font-semibold text-foreground">{selectedLog.user_name || 'Sistem'}</span>
                                    {selectedLog.user_role && <span className="text-muted-foreground block text-[10px]">({selectedLog.user_role})</span>}
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Aksi & Modul</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        {actionBadge(selectedLog.action)}
                                        {subjectBadge(selectedLog.subject_type)}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">IP & Perangkat</span>
                                    <span className="font-mono text-foreground block">{selectedLog.ip_address || '-'}</span>
                                </div>
                            </div>

                            {/* Deskripsi */}
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <span className="font-bold text-primary block mb-1 text-[11px] uppercase tracking-wider">
                                    Deskripsi
                                </span>
                                <p className="text-sm font-medium text-foreground">{selectedLog.description}</p>
                            </div>

                            {/* Diff Viewer: Old vs New Values */}
                            {selectedLog.properties?.old && selectedLog.properties?.new && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                                        <Edit className="h-3.5 w-3.5 text-blue-600" /> Komparasi Perubahan Data
                                    </h4>
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-muted text-[11px] uppercase text-muted-foreground border-b">
                                                <tr>
                                                    <th className="px-3 py-2 w-1/3">Field / Kolom</th>
                                                    <th className="px-3 py-2 w-1/3 text-red-600 dark:text-red-400">Nilai Lama (Sebelum)</th>
                                                    <th className="px-3 py-2 w-1/3 text-emerald-600 dark:text-emerald-400">Nilai Baru (Sesudah)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y font-mono text-[11px]">
                                                {Object.keys(selectedLog.properties.new).map((field) => {
                                                    const oldVal = selectedLog.properties?.old?.[field];
                                                    const newVal = selectedLog.properties?.new?.[field];
                                                    const renderVal = (val: any) => {
                                                        if (val === null || val === undefined) return <span className="text-muted-foreground italic">null</span>;
                                                        if (typeof val === 'boolean') return val ? 'true' : 'false';
                                                        if (typeof val === 'object') return JSON.stringify(val);
                                                        return String(val);
                                                    };

                                                    return (
                                                        <tr key={field} className="hover:bg-muted/30">
                                                            <td className="px-3 py-2 font-sans font-medium text-foreground bg-muted/20">
                                                                {field}
                                                            </td>
                                                            <td className="px-3 py-2 text-red-600 dark:text-red-400 bg-red-500/5 line-through break-all">
                                                                {renderVal(oldVal)}
                                                            </td>
                                                            <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-semibold break-all">
                                                                {renderVal(newVal)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Attributes Snapshot (For Created / Deleted) */}
                            {selectedLog.properties?.attributes && !selectedLog.properties?.old && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                                        <Plus className="h-3.5 w-3.5 text-emerald-600" /> Snapshot Atribut Data
                                    </h4>
                                    <div className="rounded-lg border overflow-hidden max-h-60 overflow-y-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-muted text-[11px] uppercase text-muted-foreground border-b">
                                                <tr>
                                                    <th className="px-3 py-2 w-1/3">Field</th>
                                                    <th className="px-3 py-2">Nilai</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y font-mono text-[11px]">
                                                {Object.entries(selectedLog.properties.attributes).map(([k, v]) => (
                                                    <tr key={k} className="hover:bg-muted/30">
                                                        <td className="px-3 py-1.5 font-sans font-medium text-foreground bg-muted/20">
                                                            {k}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-foreground break-all">
                                                            {v === null || v === undefined
                                                                ? <span className="text-muted-foreground italic">null</span>
                                                                : typeof v === 'object'
                                                                ? JSON.stringify(v)
                                                                : String(v)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* User Agent Info */}
                            {selectedLog.user_agent && (
                                <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-start gap-1.5">
                                    <Laptop className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    <span className="break-all">User Agent: {selectedLog.user_agent}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setSelectedLog(null)} size="sm">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Hapus Log Aktivitas */}
            <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && !isDeleting && setIsDeleteOpen(false)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" /> Hapus / Bersihkan Log Aktivitas
                        </DialogTitle>
                        <DialogDescription>
                            Pilih periode log aktivitas yang ingin dihapus. Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleDeleteSubmit} className="space-y-4 py-2 text-xs">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground block">
                                Periode Log yang Dihapus:
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <label
                                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        deletePeriod === '1_day'
                                            ? 'border-destructive bg-destructive/10 text-destructive font-semibold'
                                            : 'border-input hover:bg-muted/50 text-foreground'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="delete_period"
                                        value="1_day"
                                        checked={deletePeriod === '1_day'}
                                        onChange={() => setDeletePeriod('1_day')}
                                        className="text-destructive focus:ring-destructive"
                                    />
                                    <div>
                                        <div className="text-xs">1 Hari Terakhir</div>
                                        <div className="text-[10px] text-muted-foreground font-normal">24 jam terakhir</div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        deletePeriod === '1_week'
                                            ? 'border-destructive bg-destructive/10 text-destructive font-semibold'
                                            : 'border-input hover:bg-muted/50 text-foreground'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="delete_period"
                                        value="1_week"
                                        checked={deletePeriod === '1_week'}
                                        onChange={() => setDeletePeriod('1_week')}
                                        className="text-destructive focus:ring-destructive"
                                    />
                                    <div>
                                        <div className="text-xs">1 Minggu Terakhir</div>
                                        <div className="text-[10px] text-muted-foreground font-normal">7 hari terakhir</div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        deletePeriod === '2_weeks'
                                            ? 'border-destructive bg-destructive/10 text-destructive font-semibold'
                                            : 'border-input hover:bg-muted/50 text-foreground'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="delete_period"
                                        value="2_weeks"
                                        checked={deletePeriod === '2_weeks'}
                                        onChange={() => setDeletePeriod('2_weeks')}
                                        className="text-destructive focus:ring-destructive"
                                    />
                                    <div>
                                        <div className="text-xs">2 Minggu Terakhir</div>
                                        <div className="text-[10px] text-muted-foreground font-normal">14 hari terakhir</div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        deletePeriod === '1_month'
                                            ? 'border-destructive bg-destructive/10 text-destructive font-semibold'
                                            : 'border-input hover:bg-muted/50 text-foreground'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="delete_period"
                                        value="1_month"
                                        checked={deletePeriod === '1_month'}
                                        onChange={() => setDeletePeriod('1_month')}
                                        className="text-destructive focus:ring-destructive"
                                    />
                                    <div>
                                        <div className="text-xs">1 Bulan Terakhir</div>
                                        <div className="text-[10px] text-muted-foreground font-normal">30 hari terakhir</div>
                                    </div>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <label
                                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        deletePeriod === 'custom'
                                            ? 'border-destructive bg-destructive/10 text-destructive font-semibold'
                                            : 'border-input hover:bg-muted/50 text-foreground'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="delete_period"
                                        value="custom"
                                        checked={deletePeriod === 'custom'}
                                        onChange={() => setDeletePeriod('custom')}
                                        className="text-destructive focus:ring-destructive"
                                    />
                                    <div>
                                        <div className="text-xs">Pilih Rentang Tanggal</div>
                                        <div className="text-[10px] text-muted-foreground font-normal">Tanggal kustom</div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        deletePeriod === 'all'
                                            ? 'border-destructive bg-destructive/10 text-destructive font-semibold'
                                            : 'border-input hover:bg-muted/50 text-foreground'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="delete_period"
                                        value="all"
                                        checked={deletePeriod === 'all'}
                                        onChange={() => setDeletePeriod('all')}
                                        className="text-destructive focus:ring-destructive"
                                    />
                                    <div>
                                        <div className="text-xs">Semua Riwayat Log</div>
                                        <div className="text-[10px] text-muted-foreground font-normal">Bersihkan seluruh data</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {deletePeriod === 'custom' && (
                            <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-primary" /> Tentukan Rentang Tanggal:
                                </span>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] text-muted-foreground block mb-1">Dari Tanggal</label>
                                        <Input
                                            type="date"
                                            value={deleteStartDate}
                                            onChange={(e) => setDeleteStartDate(e.target.value)}
                                            className="h-8 text-xs"
                                            required={deletePeriod === 'custom'}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-muted-foreground block mb-1">Sampai Tanggal</label>
                                        <Input
                                            type="date"
                                            value={deleteEndDate}
                                            onChange={(e) => setDeleteEndDate(e.target.value)}
                                            className="h-8 text-xs"
                                            required={deletePeriod === 'custom'}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive flex items-start gap-2 text-xs">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                                <strong>Peringatan:</strong> Data log aktivitas yang terhapus tidak dapat dipulihkan. Pastikan Anda telah memeriksa periode yang dipilih sebelum melanjutkan.
                            </span>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDeleteOpen(false)}
                                disabled={isDeleting}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={isDeleting}
                                className="flex items-center gap-1.5"
                            >
                                <Trash2 className="h-4 w-4" />
                                {isDeleting ? 'Sedang Menghapus...' : 'Hapus Log Sekarang'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

