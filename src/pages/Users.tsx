import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from '../components/LoadingSpinner';

const ROLES = ['ADMIN', 'MANAGER', 'USER'];

export default function Users() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
    enabled: user?.role === 'ADMIN',
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User removed');
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed'),
  });

  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>
      <p className="text-gray-500 text-sm">Manage team roles. New users can be registered via API by admins.</p>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(users ?? []).map((u: { id: string; name: string; email: string; role: string; createdAt: string }) => (
              <tr key={u.id}>
                <td className="px-6 py-4 text-sm font-medium">{u.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                <td className="px-6 py-4">
                  <select
                    value={u.role}
                    disabled={u.id === user?.id}
                    onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
                    className="text-sm border rounded px-2 py-1"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  {u.id !== user?.id && (
                    <button
                      onClick={() => confirm(`Remove ${u.name}?`) && deleteMutation.mutate(u.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
