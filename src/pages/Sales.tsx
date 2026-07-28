import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import SaleModal from '../components/SaleModal';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Sales() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', page, search],
    queryFn: () => api.get('/sales', { params: { page, limit: 15, search: search || undefined } }).then((r) => r.data),
  });

  const createSaleMutation = useMutation({
    mutationFn: (saleData: Record<string, unknown>) => api.post('/sales', saleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Sale created successfully');
      setIsModalOpen(false);
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to create sale');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/sales/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Status updated');
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    },
  });

  const downloadPdf = async (saleId: string, invoiceNo: string) => {
    const res = await api.get(`/reports/sales/${saleId}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNo}.pdf`;
    a.click();
  };

  if (isLoading) return <LoadingSpinner />;

  const pagination = salesData?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
        <div className="flex gap-3">
          <input
            type="search"
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm w-64"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Sale
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(salesData?.sales ?? []).map((sale: {
              id: string;
              invoiceNo: string;
              customer: { name: string };
              saleDate: string;
              grandTotal: number;
              status: string;
              paymentMethod: string;
            }) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-brand-600">{sale.invoiceNo}</td>
                <td className="px-6 py-4 text-sm">{sale.customer.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(sale.saleDate), 'MMM d, yyyy')}</td>
                <td className="px-6 py-4 text-sm font-medium">${sale.grandTotal.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <select
                    value={sale.status}
                    onChange={(e) => statusMutation.mutate({ id: sale.id, status: e.target.value })}
                    className="text-xs border rounded px-2 py-1"
                  >
                    {['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{sale.paymentMethod.replace('_', ' ')}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => downloadPdf(sale.id, sale.invoiceNo)}
                    className="text-gray-500 hover:text-brand-600"
                    title="Download PDF"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border rounded-lg text-sm bg-brand-600 text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <SaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(data) => createSaleMutation.mutate(data)}
        loading={createSaleMutation.isPending}
      />
    </div>
  );
}
