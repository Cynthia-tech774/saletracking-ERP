import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import ProductModal from '../components/ProductModal';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Products() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, lowStockOnly],
    queryFn: () =>
      api.get('/products', { params: { search: search || undefined, lowStock: lowStockOnly || undefined, limit: 100 } }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing?.id
        ? api.put(`/products/${editing.id}`, payload)
        : api.post('/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(editing ? 'Product updated' : 'Product created');
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Cannot delete'),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex gap-3 items-center">
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            Low stock
          </label>
          {canEdit && (
            <button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg text-sm"
            >
              <PlusIcon className="h-5 w-5 mr-1" /> Add
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              {canEdit && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.products ?? []).map((p: { id: string; name: string; sku: string; category: string; price: number; stock: number; cost: number; description?: string }) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium">{p.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{p.sku}</td>
                <td className="px-6 py-4 text-sm">{p.category}</td>
                <td className="px-6 py-4 text-sm">${p.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={p.stock < 10 ? 'text-red-600 font-semibold' : ''}>{p.stock}</span>
                </td>
                {canEdit && (
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => { setEditing(p); setModalOpen(true); }} className="text-gray-500 hover:text-brand-600">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    {user?.role === 'ADMIN' && (
                      <button onClick={() => confirm('Delete?') && deleteMutation.mutate(p.id)} className="text-gray-500 hover:text-red-600">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={(form) => saveMutation.mutate(form)}
        initial={editing ?? undefined}
        loading={saveMutation.isPending}
      />
    </div>
  );
}
