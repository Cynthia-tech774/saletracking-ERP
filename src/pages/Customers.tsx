import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import CustomerModal from '../components/CustomerModal';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Customers() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.get('/customers', { params: { search: search || undefined, limit: 100 } }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing?.id ? api.put(`/customers/${editing.id}`, payload) : api.post('/customers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      toast.success(editing ? 'Customer updated' : 'Customer created');
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-3xl font-bold">Customers</h1>
        <div className="flex gap-3">
          <input
            type="search"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg text-sm"
          >
            <PlusIcon className="h-5 w-5 mr-1" /> Add
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.customers ?? []).map((c: {
          id: string;
          name: string;
          email: string;
          phone: string;
          company?: string;
          totalSpent: number;
          _count: { sales: number };
        }) => (
          <div key={c.id} className="bg-white rounded-xl border p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{c.name}</h3>
                {c.company && <p className="text-sm text-gray-500">{c.company}</p>}
              </div>
              <button onClick={() => { setEditing(c); setModalOpen(true); }} className="text-gray-400 hover:text-brand-600">
                <PencilIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 text-sm text-gray-600 space-y-1">
              <p>{c.email}</p>
              <p>{c.phone}</p>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between text-sm">
              <span className="text-gray-500">{c._count.sales} sales</span>
              <span className="font-semibold text-brand-600">${c.totalSpent.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <CustomerModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={(form) => saveMutation.mutate(form)}
        initial={editing ?? undefined}
        loading={saveMutation.isPending}
      />
    </div>
  );
}
