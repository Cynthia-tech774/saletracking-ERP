import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Reports() {
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading } = useQuery({
    queryKey: ['reports-summary', startDate, endDate],
    queryFn: () => api.get('/reports/summary', { params: { startDate, endDate } }).then((r) => r.data),
  });

  const exportExcel = async () => {
    const res = await api.get('/reports/sales/excel', {
      params: { startDate, endDate },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${startDate}-${endDate}.xlsx`;
    a.click();
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-3xl font-bold">Reports</h1>
        <button
          onClick={exportExcel}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Export Excel
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sales', value: data?.summary.totalSales },
          { label: 'Revenue', value: `$${(data?.summary.totalRevenue ?? 0).toLocaleString()}` },
          { label: 'Avg Order', value: `$${(data?.summary.averageOrder ?? 0).toFixed(2)}` },
          { label: 'Discounts', value: `$${(data?.summary.totalDiscount ?? 0).toFixed(2)}` },
        ].map((m) => (
          <div key={m.label} className="bg-white p-5 rounded-xl border">
            <p className="text-sm text-gray-500">{m.label}</p>
            <p className="text-2xl font-bold mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Sales by Payment Method</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2">Method</th>
                <th className="pb-2">Count</th>
                <th className="pb-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(data?.byPayment ?? []).map((row: { paymentMethod: string; _count: number; _sum: { grandTotal: number } }) => (
                <tr key={row.paymentMethod} className="border-t">
                  <td className="py-2">{row.paymentMethod.replace('_', ' ')}</td>
                  <td className="py-2">{row._count}</td>
                  <td className="py-2 font-medium">${(row._sum.grandTotal ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Sales by Rep</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2">Rep</th>
                <th className="pb-2">Sales</th>
                <th className="pb-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(data?.bySalesRep ?? []).map((row: { name: string; count: number; revenue: number }) => (
                <tr key={row.name} className="border-t">
                  <td className="py-2">{row.name}</td>
                  <td className="py-2">{row.count}</td>
                  <td className="py-2 font-medium">${row.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4">Top Products</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2">Product</th>
                <th className="pb-2">SKU</th>
                <th className="pb-2">Qty Sold</th>
                <th className="pb-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topProducts ?? []).map((p: { name: string; sku: string; qty: number; revenue: number }) => (
                <tr key={p.sku} className="border-t">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-gray-500">{p.sku}</td>
                  <td className="py-2">{p.qty}</td>
                  <td className="py-2 font-medium">${p.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
