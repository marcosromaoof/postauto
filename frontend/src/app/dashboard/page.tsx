'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { DashboardData } from '@/types';
import toast from 'react-hot-toast';
import {
  Activity,
  Image,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const dashboardData = await api.getDashboard();
      setData(dashboardData);
    } catch (error) {
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Visão geral do sistema</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : data ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Requisições IA/hora"
                value={data.usageStats.requestsLastHour}
                limit={data.usageStats.limits.requestsPerHour}
                icon={Activity}
                color="blue"
              />
              <StatCard
                title="Tokens/hora"
                value={data.usageStats.tokensLastHour}
                limit={data.usageStats.limits.tokensPerHour}
                icon={FileText}
                color="green"
              />
              <StatCard
                title="Imagens/dia"
                value={data.usageStats.imagesLastDay}
                limit={data.usageStats.limits.imagesPerDay}
                icon={Image}
                color="purple"
              />
              <StatCard
                title="Erros (24h)"
                value={data.errors.total}
                icon={AlertTriangle}
                color="red"
              />
            </div>

            {/* Queue Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status da Fila</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QueueStatusCard
                  label="Pendentes"
                  value={data.queueStatus.pending}
                  icon={Clock}
                  color="yellow"
                />
                <QueueStatusCard
                  label="Processando"
                  value={data.queueStatus.processing}
                  icon={Loader}
                  color="blue"
                />
                <QueueStatusCard
                  label="Concluídos"
                  value={data.queueStatus.completed}
                  icon={CheckCircle}
                  color="green"
                />
                <QueueStatusCard
                  label="Falhas"
                  value={data.queueStatus.failed}
                  icon={XCircle}
                  color="red"
                />
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* IA Usage Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Uso de IA (24h)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.iaUsage.hourlyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="hour"
                        tickFormatter={(value) => new Date(value).getHours() + 'h'}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString('pt-BR')}
                      />
                      <Line
                        type="monotone"
                        dataKey="requests"
                        stroke="#3b82f6"
                        name="Requisições"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Image Usage Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Imagens Geradas (7 dias)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.imageUsage.dailyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" name="Imagens" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Errors */}
            {data.errors.recent.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Erros Recentes</h2>
                <div className="space-y-3">
                  {data.errors.recent.slice(0, 5).map((error) => (
                    <div
                      key={error.id}
                      className="flex items-start gap-3 p-3 bg-red-50 rounded-lg"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{error.message}</p>
                        <p className="text-xs text-gray-500">
                          {error.source} - {new Date(error.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500">Erro ao carregar dados</div>
        )}
      </div>
    </AuthGuard>
  );
}

function StatCard({
  title,
  value,
  limit,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  limit?: number;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  const percentage = limit ? Math.min((value / limit) * 100, 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {limit && (
          <span className="text-sm text-gray-500">
            {value} / {limit}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{value.toLocaleString('pt-BR')}</h3>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
      {limit && (
        <div className="mt-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function QueueStatusCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: 'yellow' | 'blue' | 'green' | 'red';
}) {
  const colorClasses = {
    yellow: 'text-yellow-600 bg-yellow-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
