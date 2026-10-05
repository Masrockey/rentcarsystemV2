import { Head, router, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
    QrCode, Smartphone, RefreshCw, Send, Settings, CheckCircle2,
    AlertTriangle, XCircle, Copy, Check, Server, ShieldCheck,
    LogOut, Wifi, WifiOff, Plus, Trash2, Key, Info, ExternalLink,
    MessageSquare, Clock, Users, Bell
} from 'lucide-react';

type WaSettings = {
    server_url: string;
    device_id: string;
    auth_username?: string | null;
    auth_password?: string | null;
    has_password?: boolean;
    webhook_url?: string | null;
    webhook_secret?: string | null;
    auto_reconnect?: boolean;
    target_group_jid?: string | null;
    target_group_name?: string | null;
};

type ConnectionStatus = {
    is_connected: boolean;
    is_logged_in: boolean;
    device_id: string;
    jid?: string | null;
    phone?: string | null;
    error?: string | null;
};

type ServerHealth = {
    healthy: boolean;
    info?: any;
    error?: string | null;
};

type DeviceSlot = {
    device_id?: string;
    id?: string;
    name?: string;
    jid?: string;
    is_connected?: boolean;
    is_logged_in?: boolean;
    webhook_url?: string;
};

type GroupItem = {
    jid: string;
    name: string;
};

type Props = {
    settings: WaSettings;
    serverHealth: ServerHealth;
    connectionStatus: ConnectionStatus;
    devices: DeviceSlot[];
    groups?: GroupItem[];
};

export default function WaServerIndex({
    settings,
    serverHealth,
    connectionStatus: initialConnectionStatus,
    devices: initialDevices = [],
    groups: initialGroups = [],
}: Props) {
    const [status, setStatus] = useState<ConnectionStatus>(initialConnectionStatus);
    const [health, setHealth] = useState<ServerHealth>(serverHealth);
    const [devices, setDevices] = useState<DeviceSlot[]>(initialDevices);
    const [groups, setGroups] = useState<GroupItem[]>(initialGroups || []);
    const [selectedGroupJid, setSelectedGroupJid] = useState<string>(
        (initialGroups && initialGroups.length > 0) ? initialGroups[0].jid : ''
    );
    const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(false);
    const [sendTargetType, setSendTargetType] = useState<'group' | 'personal'>('group');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'qr' | 'pairing' | 'test' | 'settings'>('qr');

    // QR Code state
    const [qrLink, setQrLink] = useState<string | null>(null);
    const [qrDuration, setQrDuration] = useState<number>(20);
    const [qrTimer, setQrTimer] = useState<number>(0);
    const [isLoadingQr, setIsLoadingQr] = useState<boolean>(false);
    const [qrError, setQrError] = useState<string | null>(null);

    // Pairing Code state
    const [pairPhone, setPairPhone] = useState<string>('');
    const [pairCode, setPairCode] = useState<string | null>(null);
    const [isLoadingPairCode, setIsLoadingPairCode] = useState<boolean>(false);
    const [pairCodeError, setPairCodeError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<boolean>(false);

    // Test Message state
    const [testPhone, setTestPhone] = useState<string>('');
    const [testMessage, setTestMessage] = useState<string>(
        'Halo! Ini adalah pesan uji coba dari sistem Rental Mobil PT. CAHAYA AUTO NUSANTARA.'
    );
    const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; message_id?: string } | null>(null);

    // Reconnect & Logout loading states
    const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

    // Add Device Modal state
    const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
    const [newDeviceId, setNewDeviceId] = useState('');
    const [newDeviceWebhook, setNewDeviceWebhook] = useState('');
    const [isAddingDevice, setIsAddingDevice] = useState(false);

    const [targetGroupJid, setTargetGroupJid] = useState<string>(settings.target_group_jid || '');
    const [targetGroupName, setTargetGroupName] = useState<string>(settings.target_group_name || '');
    const [isSavingTargetGroup, setIsSavingTargetGroup] = useState<boolean>(false);
    const [targetGroupSuccessMsg, setTargetGroupSuccessMsg] = useState<string | null>(null);

    // Settings Form
    const { data: configData, setData: setConfigData, post: postSettings, processing: isSavingSettings } = useForm({
        server_url: settings.server_url || 'http://localhost:3000',
        device_id: settings.device_id || 'rentcars_main',
        auth_username: settings.auth_username || '',
        auth_password: '',
        keep_password: true,
        webhook_url: settings.webhook_url || '',
        webhook_secret: settings.webhook_secret || '',
        auto_reconnect: settings.auto_reconnect ?? true,
        target_group_jid: settings.target_group_jid || '',
        target_group_name: settings.target_group_name || '',
    });

    // Refresh status helper
    const fetchStatus = async () => {
        try {
            const res = await fetch('/wa-server/status');
            if (res.ok) {
                const data = await res.json();
                if (data.status) setStatus(data.status);
                if (data.health) setHealth(data.health);
            }
        } catch (err) {
            console.error('Failed to check status:', err);
        }
    };

    // Fetch groups
    const handleFetchGroups = async () => {
        setIsLoadingGroups(true);
        try {
            const res = await fetch('/wa-server/groups?device_id=' + encodeURIComponent(configData.device_id));
            const data = await res.json();
            if (data.groups && Array.isArray(data.groups)) {
                setGroups(data.groups);
                if (data.groups.length > 0 && !selectedGroupJid) {
                    setSelectedGroupJid(data.groups[0].jid);
                }
            }
        } catch (err) {
            console.error('Failed to load groups', err);
        } finally {
            setIsLoadingGroups(false);
        }
    };

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([
            fetchStatus(),
            status.is_logged_in ? handleFetchGroups() : Promise.resolve(),
        ]);
        setIsRefreshing(false);
    };

    // Auto-poll status when QR is active or pairing is underway
    useEffect(() => {
        let interval: any = null;
        if (qrLink || !status.is_logged_in) {
            interval = setInterval(fetchStatus, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [qrLink, status.is_logged_in]);

    // QR Countdown timer
    useEffect(() => {
        if (qrTimer <= 0) {
            if (qrLink) {
                setQrLink(null);
            }
            return;
        }
        const timer = setInterval(() => {
            setQrTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [qrTimer, qrLink]);

    // Generate QR Code
    const handleGetQr = async () => {
        setIsLoadingQr(true);
        setQrError(null);
        try {
            const res = await fetch('/wa-server/qr');
            const data = await res.json();
            if (data.success && data.qr_link) {
                setQrLink(data.qr_link);
                setQrDuration(data.qr_duration || 20);
                setQrTimer(data.qr_duration || 20);
            } else {
                setQrError(data.error || 'Gagal memuat QR Code dari WA Server.');
                setQrLink(null);
            }
        } catch (err: any) {
            setQrError(err.message || 'Koneksi ke WA Server gagal.');
            setQrLink(null);
        } finally {
            setIsLoadingQr(false);
        }
    };

    // Generate Pairing Code
    const handleGetPairCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pairPhone.trim()) return;

        setIsLoadingPairCode(true);
        setPairCodeError(null);
        setPairCode(null);
        setCopiedCode(false);

        try {
            const res = await fetch('/wa-server/pair-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ phone: pairPhone }),
            });
            const data = await res.json();
            if (data.success && data.pair_code) {
                setPairCode(data.pair_code);
            } else {
                setPairCodeError(data.error || 'Gagal mendapatkan kode pairing.');
            }
        } catch (err: any) {
            setPairCodeError(err.message || 'Koneksi gagal.');
        } finally {
            setIsLoadingPairCode(false);
        }
    };

    const handleCopyCode = () => {
        if (!pairCode) return;
        navigator.clipboard.writeText(pairCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
    };

    // Reconnect Action
    const handleReconnect = async () => {
        setIsActionLoading(true);
        try {
            await router.post('/wa-server/reconnect', {}, {
                preserveScroll: true,
                onFinish: () => {
                    setIsActionLoading(false);
                    fetchStatus();
                },
            });
        } catch (err) {
            setIsActionLoading(false);
        }
    };

    // Logout Action
    const handleLogout = async () => {
        if (!confirm('Apakah Anda yakin ingin memutuskan (Logout) koneksi WhatsApp dari perangkat ini?')) return;
        setIsActionLoading(true);
        try {
            await router.post('/wa-server/logout', {}, {
                preserveScroll: true,
                onFinish: () => {
                    setIsActionLoading(false);
                    setQrLink(null);
                    setPairCode(null);
                    fetchStatus();
                },
            });
        } catch (err) {
            setIsActionLoading(false);
        }
    };

    // Save Settings
    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        postSettings('/wa-server/settings', {
            preserveScroll: true,
            onSuccess: () => {
                fetchStatus();
            },
        });
    };

    // Send Test Message
    const handleSendTestMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetRecipient = sendTargetType === 'group' ? selectedGroupJid : testPhone.trim();
        if (!targetRecipient || !testMessage.trim()) return;

        setIsSendingTest(true);
        setTestResult(null);

        try {
            const res = await fetch('/wa-server/test-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    phone: targetRecipient,
                    message: testMessage,
                }),
            });
            const data = await res.json();
            setTestResult(data);
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || 'Gagal mengirim pesan uji coba.',
            });
        } finally {
            setIsSendingTest(false);
        }
    };

    // Add Device
    const handleAddDevice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeviceId.trim()) return;

        setIsAddingDevice(true);
        try {
            await router.post('/wa-server/devices', {
                device_id: newDeviceId,
                webhook_url: newDeviceWebhook || null,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsAddDeviceOpen(false);
                    setNewDeviceId('');
                    setNewDeviceWebhook('');
                },
                onFinish: () => setIsAddingDevice(false),
            });
        } catch (err) {
            setIsAddingDevice(false);
        }
    };

    // Save Target Group for Booking Notifications
    const handleSaveTargetGroup = async (jid: string, name?: string) => {
        setIsSavingTargetGroup(true);
        setTargetGroupSuccessMsg(null);
        try {
            const res = await fetch('/wa-server/target-group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    target_group_jid: jid,
                    target_group_name: name || '',
                }),
            });
            const data = await res.json();
            if (data.success) {
                setTargetGroupJid(jid);
                const finalName = data.target_group_name || name || '';
                setTargetGroupName(finalName);
                setConfigData('target_group_jid', jid);
                setConfigData('target_group_name', finalName);
                setTargetGroupSuccessMsg(`Grup "${finalName || jid}" berhasil dijadikan target notifikasi booking!`);
                setTimeout(() => setTargetGroupSuccessMsg(null), 4000);
            }
        } catch (err) {
            console.error('Failed to set target group:', err);
        } finally {
            setIsSavingTargetGroup(false);
        }
    };

    return (
        <>
            <Head title="WA Server - Gateway WhatsApp" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">WA SERVER</h1>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Koneksikan perangkat WhatsApp untuk integrasi pengiriman notifikasi otomatis sistem rental.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            className="h-9 gap-1.5"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
                            Refresh Status
                        </Button>
                    </div>
                </div>

                {/* Server & Device Status Hero Card */}
                <Card className="overflow-hidden border-2 shadow-sm">
                    <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            {/* Left Side: Connection Status */}
                            <div className="flex items-start gap-4">
                                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner ${status.is_logged_in && status.is_connected
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                                    : health.healthy
                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30'
                                        : 'bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30'
                                    }`}>
                                    {status.is_logged_in && status.is_connected ? (
                                        <Wifi className="h-7 w-7" />
                                    ) : (
                                        <WifiOff className="h-7 w-7" />
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-lg font-bold tracking-tight">
                                            {status.is_logged_in && status.is_connected
                                                ? 'WhatsApp Terhubung & Siap'
                                                : status.is_logged_in
                                                    ? 'WhatsApp Terhubung (Offline)'
                                                    : health.healthy
                                                        ? 'Perangkat Belum Tertaut'
                                                        : 'Server WA Tidak Terjangkau'}
                                        </span>
                                        {status.is_logged_in && status.is_connected ? (
                                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-[11px]">
                                                <CheckCircle2 className="h-3 w-3" /> Online & Logged In
                                            </Badge>
                                        ) : health.healthy ? (
                                            <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px]">
                                                <AlertTriangle className="h-3 w-3" /> Siap Pairing
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="gap-1 text-[11px]">
                                                <XCircle className="h-3 w-3" /> Offline
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <div>
                                            <span className="font-semibold text-foreground">Device ID:</span>{' '}
                                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground font-medium">
                                                {status.device_id || configData.device_id}
                                            </span>
                                        </div>
                                        {status.phone && (
                                            <div>
                                                <span className="font-semibold text-foreground">Nomor WA:</span>{' '}
                                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    +{status.phone}
                                                </span>
                                            </div>
                                        )}
                                        {status.jid && (
                                            <div className="hidden sm:block">
                                                <span className="font-semibold text-foreground">JID:</span>{' '}
                                                <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                                                    {status.jid}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {!health.healthy && health.error && (
                                        <p className="text-xs text-red-500 font-medium pt-1">
                                            ⚠️ {health.error} (Pastikan service Go WhatsApp berjalan di <code>{configData.server_url}</code>)
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Right Side: Quick Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                                {status.is_logged_in && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReconnect}
                                        disabled={isActionLoading}
                                        className="gap-1.5 text-xs h-9"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
                                        Reconnect
                                    </Button>
                                )}

                                {status.is_logged_in && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleLogout}
                                        disabled={isActionLoading}
                                        className="gap-1.5 text-xs h-9"
                                    >
                                        <LogOut className="h-3.5 w-3.5" />
                                        Putuskan / Logout
                                    </Button>
                                )}

                                {!status.is_logged_in && health.healthy && (
                                    <Button
                                        size="sm"
                                        onClick={handleGetQr}
                                        disabled={isLoadingQr}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-9 shadow-xs"
                                    >
                                        <QrCode className="h-4 w-4" />
                                        {isLoadingQr ? 'Membuat QR...' : 'Tautkan WhatsApp (QR Code)'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Info Bar */}
                    <div className="bg-muted/40 px-6 py-2.5 border-t flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span>Status Server: <strong className={health.healthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>{health.healthy ? 'Online & Aktif' : 'Offline'}</strong></span>
                            {health.info?.version && (
                                <Badge variant="secondary" className="text-[10px] font-mono">
                                    {health.info.version}
                                </Badge>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Main Tabs Section */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 rounded-lg gap-1 border">
                        <button
                            type="button"
                            onClick={() => setActiveTab('qr')}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-md transition-all cursor-pointer ${activeTab === 'qr'
                                ? 'bg-background text-foreground shadow-xs font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                }`}
                        >
                            <QrCode className="h-4 w-4" />
                            Scan QR Code
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('pairing')}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-md transition-all cursor-pointer ${activeTab === 'pairing'
                                ? 'bg-background text-foreground shadow-xs font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                }`}
                        >
                            <Smartphone className="h-4 w-4" />
                            Kode Pairing
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('test')}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-md transition-all cursor-pointer ${activeTab === 'test'
                                ? 'bg-background text-foreground shadow-xs font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                }`}
                        >
                            <Send className="h-4 w-4" />
                            Tes Kirim Pesan
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-md transition-all cursor-pointer ${activeTab === 'settings'
                                ? 'bg-background text-foreground shadow-xs font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                }`}
                        >
                            <Settings className="h-4 w-4" />
                            Pengaturan API
                        </button>
                    </div>

                    {/* TAB 1: SCAN QR CODE */}
                    {activeTab === 'qr' && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* QR Box */}
                            <Card className="md:col-span-6 flex flex-col items-center justify-center p-6 text-center">
                                <CardHeader className="pb-4 pt-2">
                                    <CardTitle className="text-lg font-bold flex items-center justify-center gap-2">
                                        <QrCode className="h-5 w-5 text-emerald-600" />
                                        QR Code WhatsApp Login
                                    </CardTitle>
                                    <CardDescription>
                                        Pindai kode QR menggunakan kamera WhatsApp di smartphone Anda.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="flex flex-col items-center justify-center min-h-[300px] w-full">
                                    {status.is_logged_in ? (
                                        <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl max-w-md w-full space-y-4">
                                            <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                                <CheckCircle2 className="h-10 w-10" />
                                            </div>
                                            <div className="space-y-1 text-center">
                                                <h3 className="font-bold text-base text-foreground">WhatsApp Sudah Terhubung!</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Device <strong>{status.device_id}</strong> siap digunakan untuk mengirim notifikasi WhatsApp otomatis.
                                                </p>
                                                {status.phone && (
                                                    <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                                                        +{status.phone}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Status Grup Notifikasi Booking Otomatis */}
                                            <div className="w-full text-left bg-background/90 p-3.5 rounded-xl border space-y-1.5 shadow-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                                        <Bell className="h-3.5 w-3.5 text-amber-500" />
                                                        Grup Notifikasi Booking Otomatis:
                                                    </span>
                                                    {targetGroupJid ? (
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-semibold">
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Aktif
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                                                            Belum Diatur
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs font-semibold text-foreground">
                                                    {targetGroupName || (targetGroupJid ? targetGroupJid : 'Belum ada grup yang dipilih')}
                                                </div>
                                                {targetGroupJid && (
                                                    <p className="font-mono text-[10px] text-muted-foreground truncate" title={targetGroupJid}>
                                                        {targetGroupJid}
                                                    </p>
                                                )}
                                                <p className="text-[11px] text-muted-foreground pt-0.5">
                                                    Setiap ada tambah booking baru, rincian transaksi akan otomatis terkirim ke grup ini.
                                                </p>
                                            </div>

                                            {/* Dropdown Daftar Grup WhatsApp */}
                                            <div className="w-full text-left bg-background/90 p-4 rounded-xl border space-y-2.5 shadow-xs">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="qr_group_select" className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                                        <Users className="h-3.5 w-3.5 text-emerald-600" />
                                                        Daftar Grup WhatsApp:
                                                    </Label>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleFetchGroups}
                                                        disabled={isLoadingGroups}
                                                        className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                                        title="Muat ulang daftar grup"
                                                    >
                                                        <RefreshCw className={`h-3 w-3 ${isLoadingGroups ? 'animate-spin text-primary' : ''}`} />
                                                        Refresh
                                                    </Button>
                                                </div>

                                                {targetGroupSuccessMsg && (
                                                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                                        <span>{targetGroupSuccessMsg}</span>
                                                    </div>
                                                )}

                                                <select
                                                    id="qr_group_select"
                                                    value={selectedGroupJid}
                                                    onChange={(e) => {
                                                        setSelectedGroupJid(e.target.value);
                                                        if (e.target.value) {
                                                            setSendTargetType('group');
                                                        }
                                                    }}
                                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    <option value="">-- Pilih Grup WhatsApp ({groups.length} terdeteksi) --</option>
                                                    {groups.map((group) => (
                                                        <option key={group.jid} value={group.jid}>
                                                            {group.name}
                                                        </option>
                                                    ))}
                                                </select>

                                                {selectedGroupJid ? (
                                                    <div className="space-y-2 pt-1 border-t text-[11px]">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="truncate font-mono text-[10px] text-muted-foreground max-w-[200px]" title={selectedGroupJid}>
                                                                {selectedGroupJid}
                                                            </span>
                                                            {selectedGroupJid === targetGroupJid && (
                                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1">
                                                                    <Check className="h-2.5 w-2.5" /> Grup Notifikasi Aktif
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 justify-end">
                                                            {selectedGroupJid !== targetGroupJid && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const found = groups.find(g => g.jid === selectedGroupJid);
                                                                        handleSaveTargetGroup(selectedGroupJid, found?.name || '');
                                                                    }}
                                                                    disabled={isSavingTargetGroup}
                                                                    className="h-7 px-2.5 text-[11px] gap-1 bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer"
                                                                >
                                                                    <Bell className="h-3 w-3" />
                                                                    {isSavingTargetGroup ? 'Menyimpan...' : 'Set Sebagai Grup Notifikasi Booking'}
                                                                </Button>
                                                            )}
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setSendTargetType('group');
                                                                    setActiveTab('test');
                                                                }}
                                                                className="h-7 px-2.5 text-[11px] gap-1 font-medium cursor-pointer"
                                                            >
                                                                <Send className="h-3 w-3" />
                                                                Kirim Tes
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {groups.length === 0
                                                            ? 'Nomor ini belum tergabung ke grup WhatsApp atau klik tombol Refresh untuk memuat grup.'
                                                            : 'Pilih salah satu grup di atas untuk dijadikan target notifikasi booking atau mengirimkan pesan tes.'}
                                                    </p>
                                                )}
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleLogout}
                                                className="mt-1 text-xs text-red-500 hover:text-red-600 border-red-200 dark:border-red-900/50"
                                            >
                                                <LogOut className="h-3.5 w-3.5 mr-1" /> Putuskan Koneksi
                                            </Button>
                                        </div>
                                    ) : qrLink ? (
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="relative p-4 bg-white rounded-2xl shadow-md border-2 border-emerald-500/30">
                                                <img
                                                    src={qrLink}
                                                    alt="WhatsApp QR Code"
                                                    className="h-56 w-56 object-contain"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-amber-500" />
                                                <span className="text-xs text-muted-foreground">
                                                    QR berlaku selama: <strong className="font-mono text-foreground font-bold">{qrTimer}s</strong>
                                                </span>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleGetQr}
                                                disabled={isLoadingQr}
                                                className="text-xs gap-1.5"
                                            >
                                                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingQr ? 'animate-spin' : ''}`} />
                                                Perbarui QR Code
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                                            <div className="h-20 w-20 rounded-2xl bg-muted/60 border border-dashed flex items-center justify-center text-muted-foreground">
                                                <QrCode className="h-10 w-10 opacity-40" />
                                            </div>

                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-sm">QR Code Belum Dibuat</h4>
                                                <p className="text-xs text-muted-foreground max-w-xs">
                                                    Klik tombol di bawah untuk membuat QR Code login WhatsApp baru dari server.
                                                </p>
                                            </div>

                                            {qrError && (
                                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs max-w-sm">
                                                    ⚠️ {qrError}
                                                </div>
                                            )}

                                            <Button
                                                onClick={handleGetQr}
                                                disabled={isLoadingQr || !health.healthy}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs"
                                            >
                                                <QrCode className="h-4 w-4" />
                                                {isLoadingQr ? 'Memuat QR...' : 'Tampilkan QR Code'}
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Tutorial & Instructions Card */}
                            <Card className="md:col-span-6 flex flex-col justify-between">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Info className="h-4 w-4 text-primary" />
                                        Petunjuk Scan QR WhatsApp
                                    </CardTitle>
                                    <CardDescription>
                                        Langkah-langkah menautkan WhatsApp Web di ponsel Anda:
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3 text-xs">
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                                                1
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">Buka Aplikasi WhatsApp</p>
                                                <p className="text-muted-foreground">Buka aplikasi WhatsApp di HP utama Anda.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                                                2
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">Buka Menu Perangkat Tertaut</p>
                                                <p className="text-muted-foreground">
                                                    Ketuk ikon <strong>Titik Tiga (⋮)</strong> di Android atau menu <strong>Pengaturan (⚙️)</strong> di iPhone, lalu pilih <strong>Perangkat Tertaut (Linked Devices)</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                                                3
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">Ketuk "Tautkan Perangkat"</p>
                                                <p className="text-muted-foreground">Buka kunci layar atau biometrik jika diminta.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                                                4
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">Scan QR Code</p>
                                                <p className="text-muted-foreground">
                                                    Arahkan kamera HP Anda ke QR Code yang ditampilkan di layar ini. Status akan berubah menjadi terhubung secara otomatis.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/30 border-t py-3 text-[11px] text-muted-foreground">
                                    💡 <strong>Tips:</strong> Anda juga dapat menggunakan metode <strong>Kode Pairing</strong> pada tab berikutnya tanpa perlu scan kamera.
                                </CardFooter>
                            </Card>
                        </div>
                    )}

                    {/* TAB 2: PAIRING CODE */}
                    {activeTab === 'pairing' && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <Card className="md:col-span-7">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Smartphone className="h-5 w-5 text-primary" />
                                        Login dengan Kode Pairing WhatsApp
                                    </CardTitle>
                                    <CardDescription>
                                        Masukkan nomor WhatsApp Anda untuk menerima 8 digit kode pairing langsung di HP.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleGetPairCode} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="pair_phone">Nomor Telepon WhatsApp</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="pair_phone"
                                                    placeholder="Contoh: 08123456789 atau 628123456789"
                                                    value={pairPhone}
                                                    onChange={e => setPairPhone(e.target.value)}
                                                    className="font-mono text-sm"
                                                    required
                                                />
                                                <Button
                                                    type="submit"
                                                    disabled={isLoadingPairCode || !pairPhone.trim() || !health.healthy}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5"
                                                >
                                                    <Smartphone className="h-4 w-4" />
                                                    {isLoadingPairCode ? 'Meminta Kode...' : 'Dapatkan Kode'}
                                                </Button>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                Nomor akan otomatis diformat dengan awalan kode negara Indonesia (62).
                                            </p>
                                        </div>

                                        {pairCodeError && (
                                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                                                ⚠️ {pairCodeError}
                                            </div>
                                        )}

                                        {pairCode && (
                                            <div className="p-5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 text-center space-y-3 mt-4">
                                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                                    Kode Pairing WhatsApp Anda
                                                </p>
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="font-mono text-3xl font-extrabold tracking-widest text-emerald-700 dark:text-emerald-300 bg-background px-4 py-2 rounded-lg border shadow-xs">
                                                        {pairCode}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={handleCopyCode}
                                                        className="h-11 w-11"
                                                        title="Salin Kode Pairing"
                                                    >
                                                        {copiedCode ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Buka notifikasi WhatsApp di HP Anda, lalu masukkan 8 kode huruf/angka di atas.
                                                </p>
                                            </div>
                                        )}
                                    </form>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-5">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold">Cara Memasukkan Kode</CardTitle>
                                    <CardDescription>Langkah memasukkan kode pairing di WhatsApp:</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs text-muted-foreground">
                                    <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                                        <p className="font-semibold text-foreground">1. Masukkan Nomor HP</p>
                                        <p>Ketik nomor WhatsApp yang ingin ditautkan pada formulir di sebelah kiri.</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                                        <p className="font-semibold text-foreground">2. Buka Notifikasi WhatsApp</p>
                                        <p>Notifikasi "Tautkan perangkat baru" akan muncul di smartphone Anda.</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                                        <p className="font-semibold text-foreground">3. Masukkan 8 Digit Kode</p>
                                        <p>Masukkan kode pairing yang muncul di atas pada layar HP Anda untuk mengonfirmasi penautan.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* TAB 3: TEST MESSAGE */}
                    {activeTab === 'test' && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <Card className="md:col-span-7">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Send className="h-5 w-5 text-primary" />
                                        Tes Kirim Pesan WhatsApp
                                    </CardTitle>
                                    <CardDescription>
                                        Uji coba pengiriman pesan instan ke nomor WhatsApp apa pun untuk memastikan koneksi berjalan lancar.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSendTestMessage} className="space-y-4">
                                        {/* Switcher: Kirim ke Grup atau Nomor Personal */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold">Tujuan Pengiriman</Label>
                                            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-lg border">
                                                <button
                                                    type="button"
                                                    onClick={() => setSendTargetType('group')}
                                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                                        sendTargetType === 'group'
                                                            ? 'bg-background text-foreground shadow-xs font-semibold'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                                                    Grup WhatsApp
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSendTargetType('personal')}
                                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                                        sendTargetType === 'personal'
                                                            ? 'bg-background text-foreground shadow-xs font-semibold'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    <Smartphone className="h-3.5 w-3.5 text-primary" />
                                                    Nomor Personal
                                                </button>
                                            </div>
                                        </div>

                                        {sendTargetType === 'group' ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="test_group_select">Pilih Grup WhatsApp Tujuan</Label>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleFetchGroups}
                                                        disabled={isLoadingGroups}
                                                        className="h-6 px-1.5 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                                    >
                                                        <RefreshCw className={`h-3 w-3 ${isLoadingGroups ? 'animate-spin' : ''}`} />
                                                        Refresh Grup
                                                    </Button>
                                                </div>
                                                <select
                                                    id="test_group_select"
                                                    value={selectedGroupJid}
                                                    onChange={(e) => setSelectedGroupJid(e.target.value)}
                                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                                    required
                                                >
                                                    <option value="">-- Pilih Grup WhatsApp ({groups.length} terdeteksi) --</option>
                                                    {groups.map((group) => (
                                                        <option key={group.jid} value={group.jid}>
                                                            {group.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {selectedGroupJid ? (
                                                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                                                        JID: <span className="text-foreground">{selectedGroupJid}</span>
                                                    </p>
                                                ) : (
                                                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                                        {groups.length === 0
                                                            ? '⚠️ Belum ada grup yang terdeteksi. Pastikan nomor WA ini sudah bergabung dalam grup.'
                                                            : '⚠️ Silakan pilih grup tujuan terlebih dahulu.'}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label htmlFor="test_phone">Nomor Tujuan WhatsApp</Label>
                                                <Input
                                                    id="test_phone"
                                                    placeholder="Contoh: 08123456789 atau 628123456789"
                                                    value={testPhone}
                                                    onChange={e => setTestPhone(e.target.value)}
                                                    className="font-mono text-sm"
                                                    required
                                                />
                                                <p className="text-[11px] text-muted-foreground">
                                                    Format nomor otomatis menggunakan kode negara 62.
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label htmlFor="test_message">Isi Pesan</Label>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTestMessage('Halo! Ini pesan tes integrasi dari sistem PT. CAHAYA AUTO NUSANTARA.')}
                                                        className="text-[11px] text-primary hover:underline cursor-pointer"
                                                    >
                                                        Template 1
                                                    </button>
                                                    <span className="text-muted-foreground text-xs">·</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTestMessage('✅ [PT. CAN] Booking Anda telah dikonfirmasi. Unit armada siap diserahterimakan.')}
                                                        className="text-[11px] text-primary hover:underline cursor-pointer"
                                                    >
                                                        Template Booking
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                id="test_message"
                                                rows={4}
                                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                value={testMessage}
                                                onChange={e => setTestMessage(e.target.value)}
                                                required
                                            />
                                        </div>

                                        {testResult && (
                                            <div className={`p-3 rounded-lg border text-xs space-y-1 ${testResult.success
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                                : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
                                                }`}>
                                                <p className="font-bold flex items-center gap-1.5">
                                                    {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                    {testResult.message}
                                                </p>
                                                {testResult.message_id && (
                                                    <p className="font-mono text-[11px] opacity-80">
                                                        Message ID: {testResult.message_id}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={
                                                isSendingTest ||
                                                !testMessage.trim() ||
                                                (sendTargetType === 'group' ? !selectedGroupJid : !testPhone.trim())
                                            }
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"
                                        >
                                            <Send className="h-4 w-4" />
                                            {isSendingTest
                                                ? 'Mengirim Pesan...'
                                                : sendTargetType === 'group'
                                                    ? `Kirim Pesan ke Grup (${groups.find(g => g.jid === selectedGroupJid)?.name || 'Pilih Grup'})`
                                                    : 'Kirim Pesan Uji Coba'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-5">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                                        Preview Notifikasi Otomatis
                                    </CardTitle>
                                    <CardDescription>
                                        Integrasi WhatsApp pada alur kerja operasional:
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs">
                                    <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                                        <p className="font-bold text-foreground">1. Konfirmasi Booking Baru</p>
                                        <p className="text-muted-foreground">Mengirim rincian invoice & tanggal rental ke pelanggan saat booking dibuat.</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                                        <p className="font-bold text-foreground">2. Serah Terima & Lokasi</p>
                                        <p className="text-muted-foreground">Notifikasi link checklist & foto kondisi awal mobil ke penyewa.</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                                        <p className="font-bold text-foreground">3. Pengingat Pengembalian Unit</p>
                                        <p className="text-muted-foreground">Peringatan otomatis H-2 jam sebelum batas masa rental berakhir.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* TAB 4: API & SERVER SETTINGS */}
                    {activeTab === 'settings' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-primary" />
                                    Pengaturan Endpoint WA Server & API Gateway
                                </CardTitle>
                                <CardDescription>
                                    Konfigurasikan alamat server Go WhatsApp Web MultiDevice yang digunakan oleh sistem.
                                </CardDescription>
                            </CardHeader>
                            <form onSubmit={handleSaveSettings}>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="server_url">Base URL WA Server</Label>
                                            <Input
                                                id="server_url"
                                                placeholder="http://localhost:3000 atau https://wa.domainanda.com"
                                                value={configData.server_url}
                                                onChange={e => setConfigData('server_url', e.target.value)}
                                                required
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Port default API Go WhatsApp adalah <code>3000</code>.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="device_id">Active Device ID</Label>
                                            <Input
                                                id="device_id"
                                                placeholder="rentcars_main"
                                                value={configData.device_id}
                                                onChange={e => setConfigData('device_id', e.target.value)}
                                                required
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Header <code>X-Device-Id</code> untuk multi-device session.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="auth_username">Basic Auth Username (Opsional)</Label>
                                            <Input
                                                id="auth_username"
                                                placeholder="Username jika API dilindungi password"
                                                value={configData.auth_username}
                                                onChange={e => setConfigData('auth_username', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="auth_password">Basic Auth Password (Opsional)</Label>
                                            <Input
                                                id="auth_password"
                                                type="password"
                                                placeholder={settings.has_password ? '******** (Biarkan kosong untuk tidak mengubah)' : 'Password API'}
                                                value={configData.auth_password}
                                                onChange={e => {
                                                    setConfigData('auth_password', e.target.value);
                                                    setConfigData('keep_password', false);
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="webhook_url">Webhook URL (Opsional)</Label>
                                            <Input
                                                id="webhook_url"
                                                placeholder="https://rentcars.com/api/wa/webhook"
                                                value={configData.webhook_url}
                                                onChange={e => setConfigData('webhook_url', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="webhook_secret">Webhook Secret (Opsional)</Label>
                                            <Input
                                                id="webhook_secret"
                                                type="password"
                                                placeholder="Secret key untuk verifikasi signature"
                                                value={configData.webhook_secret}
                                                onChange={e => setConfigData('webhook_secret', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2 sm:col-span-2 p-4 rounded-xl border bg-muted/20">
                                            <Label htmlFor="target_group_jid" className="text-sm font-semibold flex items-center gap-1.5">
                                                <Bell className="h-4 w-4 text-amber-500" />
                                                Grup WhatsApp Target Notifikasi Booking Otomatis
                                            </Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                <div>
                                                    <Label htmlFor="settings_target_group_select" className="text-xs text-muted-foreground mb-1 block">
                                                        Pilih dari Grup Terdeteksi:
                                                    </Label>
                                                    <select
                                                        id="settings_target_group_select"
                                                        value={configData.target_group_jid || ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            const found = groups.find(g => g.jid === val);
                                                            setConfigData('target_group_jid', val);
                                                            if (found) {
                                                                setConfigData('target_group_name', found.name);
                                                            }
                                                        }}
                                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                                    >
                                                        <option value="">-- Pilih Grup ({groups.length} terdeteksi) --</option>
                                                        {groups.map(g => (
                                                            <option key={g.jid} value={g.jid}>{g.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label htmlFor="target_group_jid" className="text-xs text-muted-foreground mb-1 block">
                                                        JID / ID Grup WhatsApp:
                                                    </Label>
                                                    <Input
                                                        id="target_group_jid"
                                                        placeholder="cth: 120363028192839182@g.us"
                                                        value={configData.target_group_jid || ''}
                                                        onChange={e => setConfigData('target_group_jid', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground pt-1">
                                                Setiap kali transaksi booking baru dibuat oleh marketing/admin, sistem otomatis mengirim pesan rincian sewa ke grup ini.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between border-t pt-4">
                                    <p className="text-xs text-muted-foreground">
                                        Perubahan pengaturan akan segera aktif untuk seluruh request API WhatsApp.
                                    </p>
                                    <Button type="submit" disabled={isSavingSettings} className="gap-2">
                                        <Settings className="h-4 w-4" />
                                        {isSavingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}

WaServerIndex.layout = {
    breadcrumbs: [{ title: 'WA Server', href: '/wa-server' }],
};
