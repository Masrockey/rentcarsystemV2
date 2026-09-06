import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PaginatedLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type PaginatedData<T> = {
    data: T[];
    current_page: number;
    first_page_url?: string;
    from: number | null;
    last_page: number;
    last_page_url?: string;
    links: PaginatedLink[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
};

type Props<T> = {
    data: PaginatedData<T> | T[];
    className?: string;
};

export default function Pagination<T>({ data, className = '' }: Props<T>) {
    // If not a paginated object or no pages needed
    if (!data || Array.isArray(data)) {
        return null;
    }

    const { links, from, to, total, last_page } = data;

    if (total === 0 || last_page <= 1) {
        if (total > 0) {
            return (
                <div className={`flex items-center justify-between px-2 py-3 text-xs text-muted-foreground ${className}`}>
                    <div>
                        Menampilkan <span className="font-semibold text-foreground">{from ?? 1}</span> -{' '}
                        <span className="font-semibold text-foreground">{to ?? total}</span> dari{' '}
                        <span className="font-semibold text-foreground">{total}</span> data
                    </div>
                </div>
            );
        }
        return null;
    }

    const cleanLabel = (label: string) => {
        if (label.includes('Previous') || label.includes('&laquo;')) {
            return <ChevronLeft className="h-4 w-4" />;
        }
        if (label.includes('Next') || label.includes('&raquo;')) {
            return <ChevronRight className="h-4 w-4" />;
        }
        return label;
    };

    return (
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2 py-3 text-xs border-t ${className}`}>
            <div className="text-muted-foreground">
                Menampilkan <span className="font-semibold text-foreground">{from ?? 0}</span> -{' '}
                <span className="font-semibold text-foreground">{to ?? 0}</span> dari{' '}
                <span className="font-semibold text-foreground">{total}</span> data
            </div>

            <div className="flex flex-wrap items-center gap-1">
                {links.map((link, idx) => {
                    const isPrev = idx === 0;
                    const isNext = idx === links.length - 1;

                    if (!link.url) {
                        return (
                            <span
                                key={idx}
                                className={`inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-md text-xs font-medium text-muted-foreground/40 border border-transparent cursor-not-allowed select-none ${
                                    isPrev || isNext ? 'px-2' : ''
                                }`}
                            >
                                {cleanLabel(link.label)}
                            </span>
                        );
                    }

                    return (
                        <Link
                            key={idx}
                            href={link.url}
                            preserveScroll
                            preserveState
                            className={`inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-md text-xs font-medium transition-colors ${
                                link.active
                                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                    : 'text-foreground hover:bg-muted border border-border/60 hover:border-border'
                            } ${isPrev || isNext ? 'px-2' : ''}`}
                        >
                            {cleanLabel(link.label)}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
