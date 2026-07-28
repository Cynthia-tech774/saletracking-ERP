import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  UsersIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((res) => res.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const metrics = [
    {
      title: 'Total Revenue',
      value: `$${(data?.metrics.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: CurrencyDollarIcon,
      color: 'bg-emerald-500',
    },
    {
      title: 'Today\'s Revenue',
      value: `$${(data?.today.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      sub: `${data?.today.salesCount ?? 0} sales today`,
      icon: CurrencyDollarIcon,
      color: 'bg-brand-500',
    },
    {
      title: 'Customers',
      value: data?.metrics.totalCustomers ?? 0,
      icon: UsersIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Low Stock',
      value: data?.metrics.lowStockCount ?? 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
    },
    {
      title: 'Pending Sales',
      value: data?.metrics.pendingSales ?? 0,
      icon: ClockIcon,
      color: 'bg-amber-500',
    },
    {
      title: 'Est. Profit',
      value: `$${(data?.metrics.estimatedProfit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: ShoppingBagIcon,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.title} className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
            <div className="p-5 flex items-center gap-4">
              <div className={`flex-shrink-0 rounded-xl p-3 ${m.color}`}>
                <m.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{m.title}</p>
                <p className="text-xl font-bold">{m.value}</p>
                {'sub' in m && m.sub && <p className="text-xs text-gray-400">{m.sub}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Weekly Sales</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data?.charts.weeklySales ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'MMM d')} />
              <YAxis />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
              <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Top Products</h2>
          <div className="space-y-3">
            {(data?.topProducts ?? []).map((product: { id: string; name: string; sku: string; totalSold: number; revenue: number }) => (
              <div key={product.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{product.totalSold} sold</p>
                  <p className="text-sm text-gray-500">${product.revenue?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Recent Sales</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.recentSales ?? []).map((sale: { id: string; invoiceNo: string; customer: { name: string }; grandTotal: number; saleDate: string; status: string }) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-brand-600">{sale.invoiceNo}</td>
                    <td className="px-4 py-3 text-sm">{sale.customer.name}</td>
                    <td className="px-4 py-3 text-sm">${sale.grandTotal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(sale.saleDate), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sale.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(data?.lowStockProducts?.length ?? 0) > 0 && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-xl lg:col-span-2">
            <h2 className="text-lg font-semibold text-red-800 mb-3">Low Stock Alert</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.lowStockProducts.map((p: { id: string; name: string; stock: number; sku: string }) => (
                <div key={p.id} className="bg-white p-3 rounded-lg text-sm">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-red-600 font-semibold">{p.stock} left · {p.sku}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
}
