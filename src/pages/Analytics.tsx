import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const statusData = (data?.salesByStatus ?? []).map((s: { status: string; _count: number }) => ({
    name: s.status,
    value: s._count,
  }));

  const monthlyData = (data?.charts.monthlySales ?? []).map((d: { date: string; amount: number }) => ({
    date: format(new Date(d.date), 'MMM d'),
    amount: d.amount,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border">
          <h2 className="text-lg font-semibold mb-4">Monthly Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl border">
          <h2 className="text-lg font-semibold mb-4">Sales by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {statusData.map((_: unknown, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl border lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Product Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={(data?.topProducts ?? []).map((p: { name: string; totalSold: number; revenue: number }) => ({
                name: p.name?.slice(0, 15),
                sold: p.totalSold,
                revenue: p.revenue,
              }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sold" fill="#10b981" name="Units Sold" />
              <Bar dataKey="revenue" fill="#6366f1" name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
