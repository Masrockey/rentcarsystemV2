import * as React from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableOption {
    value: string;
    label: string;
    sublabel?: string;
}

interface SearchableSelectProps {
    options: SearchableOption[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    className?: string;
    disabled?: boolean;
    id?: string;
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = 'Pilih...',
    searchPlaceholder = 'Cari...',
    emptyText = 'Tidak ditemukan.',
    className,
    disabled = false,
    id,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = React.useMemo(() => {
        if (!search.trim()) return options;
        const q = search.toLowerCase();
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(q) ||
                (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
        );
    }, [options, search]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
        if (open) {
            setSearch('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [open]);

    return (
        <div ref={containerRef} className={cn('relative w-full', className)}>
            <button
                id={id}
                type="button"
                disabled={disabled}
                onClick={() => setOpen(!open)}
                className={cn(
                    'border-input data-[placeholder]:text-muted-foreground flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 text-left',
                    !selectedOption && 'text-muted-foreground'
                )}
            >
                <span className="truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>

            {open && (
                <div className="bg-popover text-popover-foreground absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[12rem] rounded-md border shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                    <div className="flex items-center border-b px-3 py-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            ref={inputRef}
                            type="text"
                            className="flex h-6 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setOpen(false);
                                }
                            }}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="p-0.5 hover:bg-muted rounded"
                            >
                                <X className="h-3.5 w-3.5 opacity-50" />
                            </button>
                        )}
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                                {emptyText}
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = option.value === value;
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => {
                                            onValueChange(option.value);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            'relative flex cursor-pointer select-none items-center justify-between rounded-sm px-2.5 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                                            isSelected && 'bg-accent/50 font-medium'
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span>{option.label}</span>
                                            {option.sublabel && (
                                                <span className="text-[11px] text-muted-foreground">
                                                    {option.sublabel}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-primary ml-2 shrink-0" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
