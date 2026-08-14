import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { reports as reportsRoute } from '@/routes';

type ReportItem = {
    month: string;
    total_bookings: number;
    total_earnings: string | number;
};

type Props = {
    monthlyReport: ReportItem[];
};

export default function ReportsIndex({ monthlyReport }: Props) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const formatMonthName = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
    };

    // Calculate aggregate summary metrics
    const totalTransactions = monthlyReport.reduce((acc, curr) => acc + curr.total_bookings, 0);
    const totalEarningsSum = monthlyReport.reduce((acc, curr) => acc + parseFloat(curr.total_earnings as string), 0);
    const averageEarnings = monthlyReport.length > 0 ? totalEarningsSum / monthlyReport.length : 0;

    return (
        <>
            <Head title="Laporan Bulanan" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Laporan Bulanan</h1>
                    <p className="text-muted-foreground">Analisis operasional bisnis, pesanan, dan total pendapatan sewa.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Akumulasi Transaksi</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalTransactions} Booking</div>
                            <p className="text-xs text-muted-foreground mt-1">Total transaksi diproses</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Akumulasi Pendapatan</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalEarningsSum)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total nilai transaksi</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata Bulanan</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(averageEarnings)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Rata-rata pendapatan per bulan</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" /> Rincian Bulanan
                        </CardTitle>
                        <CardDescription>Daftar total transaksi dan nilai pendapatan per bulan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3">Bulan</th>
                                        <th className="px-6 py-3 text-center">Total Booking</th>
                                        <th className="px-6 py-3 text-right">Total Pendapatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {monthlyReport.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                                                Belum ada data laporan bulanan.
                                            </td>
                                        </tr>
                                    ) : (
                                        monthlyReport.map((item) => (
                                            <tr key={item.month} className="hover:bg-muted/50">
                                                <td className="px-6 py-4 font-semibold">{formatMonthName(item.month)}</td>
                                                <td className="px-6 py-4 text-center">{item.total_bookings} Booking</td>
                                                <td className="px-6 py-4 text-right font-semibold font-mono text-green-600">
                                                    {formatCurrency(parseFloat(item.total_earnings as string))}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Laporan',
            href: reportsRoute(),
        },
    ],
};
