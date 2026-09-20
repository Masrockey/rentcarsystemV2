import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Bell,
    CalendarPlus,
    KeyRound,
    RotateCcw,
    Sparkles,
    XCircle,
    CheckCircle,
    CheckCircle2,
    Car,
    Check,
    Trash2,
    Clock,
    Inbox,
    RefreshCw,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type AppNotification = {
    id: number;
    user_id: number;
    type: string;
    title: string;
    message: string;
    url?: string | null;
    icon?: string | null;
    data?: Record<string, any> | null;
    read_at?: string | null;
    created_at: string;
    updated_at: string;
};

const getCsrfToken = () => {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(?:XSRF-TOKEN|csrf_token)=([^;]*)'));
    if (match) return decodeURIComponent(match[2]);
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') || '' : '';
};

const formatTimeAgo = (dateString: string) => {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} mnt lalu`;
        if (diffHours < 24) return `${diffHours} jam lalu`;
        if (diffDays === 1) return 'Kemarin';
        if (diffDays < 7) return `${diffDays} hari lalu`;

        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateString;
    }
};

const getNotificationIcon = (iconName?: string | null, type?: string) => {
    const iconClass = "h-4 w-4";
    switch (iconName || type) {
        case 'CalendarPlus':
        case 'booking_created':
            return <CalendarPlus className={`${iconClass} text-blue-500`} />;
        case 'KeyRound':
        case 'delivery_completed':
            return <KeyRound className={`${iconClass} text-emerald-500`} />;
        case 'RotateCcw':
        case 'unit_returned':
            return <RotateCcw className={`${iconClass} text-amber-500`} />;
        case 'Sparkles':
        case 'wash_pending':
            return <Sparkles className={`${iconClass} text-sky-500`} />;
        case 'XCircle':
        case 'booking_cancelled':
            return <XCircle className={`${iconClass} text-red-500`} />;
        case 'CheckCircle':
        case 'CheckCircle2':
        case 'wash_completed':
        case 'booking_completed':
        case 'booking_allocated':
            return <CheckCircle2 className={`${iconClass} text-green-500`} />;
        case 'Car':
            return <Car className={`${iconClass} text-indigo-500`} />;
        default:
            return <Bell className={`${iconClass} text-primary`} />;
    }
};

export function NotificationBell() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const pollingTimerRef = useRef<number | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/notifications', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unread_count || 0);
            }
        } catch {
            // Silently fail during background polling
        }
    }, []);

    useEffect(() => {
        fetchNotifications();

        // Background polling every 20 seconds
        pollingTimerRef.current = window.setInterval(fetchNotifications, 20000);

        return () => {
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
            }
        };
    }, [fetchNotifications]);

    // Refetch when dropdown opens
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            fetchNotifications();
        }
    };

    const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            const token = getCsrfToken();
            await fetch(`/notifications/${id}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': token,
                },
            });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            // Error handling
        }
    };

    const handleMarkAllAsRead = async () => {
        setIsLoading(true);
        try {
            const token = getCsrfToken();
            await fetch('/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': token,
                },
            });
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch {
            // Error handling
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const token = getCsrfToken();
            await fetch(`/notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': token,
                },
            });
            const target = notifications.find((n) => n.id === id);
            if (target && !target.read_at) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        } catch {
            // Error handling
        }
    };

    const handleItemClick = async (notification: AppNotification) => {
        if (!notification.read_at) {
            handleMarkAsRead(notification.id);
        }
        setIsOpen(false);
        if (notification.url) {
            router.visit(notification.url);
        }
    };

    const filteredNotifications = notifications.filter((n) => {
        if (filter === 'unread') return !n.read_at;
        return true;
    });

    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-full hover:bg-muted/80 transition-colors cursor-pointer"
                    aria-label="Notifikasi"
                >
                    <Bell className="h-4 w-4 text-foreground/80" />
                    {unreadCount > 0 && (
                        <>
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-400 opacity-75 animate-ping pointer-events-none" />
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-80 sm:w-96 p-0 rounded-2xl border bg-popover/95 backdrop-blur-md shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Bell className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-foreground leading-none">Notifikasi</h4>
                            {unreadCount > 0 ? (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {unreadCount} pesan belum dibaca
                                </p>
                            ) : (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Semua pesan terbaca
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                disabled={isLoading}
                                className="h-7 px-2 text-xs font-medium text-primary hover:text-primary/90 hover:bg-primary/10 rounded-lg cursor-pointer"
                            >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Baca Semua
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fetchNotifications()}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                            title="Segarkan"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 border-b px-3 py-1.5 bg-muted/10 text-xs">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                            filter === 'all'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                    >
                        Semua ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                            filter === 'unread'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                    >
                        Belum Dibaca ({unreadCount})
                    </button>
                </div>

                {/* Notification Items List */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
                    {filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                            <div className="p-3 rounded-full bg-muted/50 text-muted-foreground mb-2">
                                <Inbox className="h-6 w-6 stroke-[1.5]" />
                            </div>
                            <p className="text-xs font-medium text-foreground">Tidak ada notifikasi</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {filter === 'unread'
                                    ? 'Semua notifikasi sudah Anda baca.'
                                    : 'Belum ada notifikasi aktivitas terbaru.'}
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map((n) => {
                            const isUnread = !n.read_at;
                            return (
                                <div
                                    key={n.id}
                                    onClick={() => handleItemClick(n)}
                                    className={`group flex items-start gap-3 p-3 transition-colors cursor-pointer relative ${
                                        isUnread
                                            ? 'bg-primary/5 hover:bg-primary/10'
                                            : 'hover:bg-muted/40'
                                    }`}
                                >
                                    {/* Unread indicator bar */}
                                    {isUnread && (
                                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                                    )}

                                    {/* Icon */}
                                    <div className="shrink-0 mt-0.5 p-2 rounded-xl bg-background border shadow-xs">
                                        {getNotificationIcon(n.icon, n.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center justify-between gap-1">
                                            <h5
                                                className={`text-xs truncate ${
                                                    isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
                                                }`}
                                            >
                                                {n.title}
                                            </h5>
                                            <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                                                <Clock className="h-2.5 w-2.5" />
                                                {formatTimeAgo(n.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground/90 mt-0.5 line-clamp-2 leading-relaxed">
                                            {n.message}
                                        </p>
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isUnread && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleMarkAsRead(n.id, e)}
                                                className="h-6 w-6 text-primary hover:bg-primary/10 rounded-md cursor-pointer"
                                                title="Tandai dibaca"
                                            >
                                                <Check className="h-3 w-3" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleDelete(n.id, e)}
                                            className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md cursor-pointer"
                                            title="Hapus notifikasi"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="p-2 border-t bg-muted/20 text-center">
                        <span className="text-[10px] text-muted-foreground">
                            Notifikasi sistem diperbarui otomatis
                        </span>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
