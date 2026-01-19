'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { DashboardData, Post } from '@/types';
import toast from 'react-hot-toast';
import {
  Activity,
  Image,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  RefreshCw,
  Eye,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function MonitoringPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData, postsData] = await Promise.all([
        api.getDashboard(),
        api.getPosts(),
      ]);
      setData(dashboardData);
      setPosts(postsData);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Post['status']) => {
    const colors: Record<Post['status'], string> = {
      pending_text: 'bg-yellow-100 text-yellow-800',
      pending_approval: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      generating_images: 'bg-purple-100 text-purple-800',
      ready: 'bg-indigo-100 text-indigo-800',
      published: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: Post['status']) => {
    const labels: Record<Post['status'], string> = {
      pending_text: 'Gerando Texto',
      pending_approval: 'Aguardando Aprovação',
      approved: 'Aprovado',
      generating_images: 'Gerando Imagens',
      ready: 'Pronto',
      published: 'Publicado',
      cancelled: 'Cancelado',
      error: 'Erro',
    };
    return labels[status] || status;
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monitoramento</h1>
            <p className="text-gray-500">Acompanhe o uso de IA, imagens e fila</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : data ? (
          <>
            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Uso de IA"
                value={`${data.iaUsage.requests} req`}
                subtitle={`${data.iaUsage.tokens.toLocaleString('pt-BR')} tokens`}
                icon={Activity}
                color="blue"
              />
              <StatCard
                title="Imagens"
                value={`${data.imageUsage.total} geradas`}
                subtitle="Últimos 7 dias"
                icon={Image}
                color="purple"
              />
              <StatCard
                title="Fila"
                value={`${data.queueStatus.pending + data.queueStatus.processing}`}
                subtitle="Em processamento"
                icon={Clock}
                color="yellow"
              />
              <StatCard
                title="Publicados"
                value={`${data.queueStatus.completed}`}
                subtitle="Total de posts"
                icon={CheckCircle}
                color="green"
              />
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
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString('pt-BR')}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="requests"
                        stroke="#3b82f6"
                        name="Requisições"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="tokens"
                        stroke="#10b981"
                        name="Tokens"
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

              {/* Queue Status Pie Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Status da Fila</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Pendentes', value: data.queueStatus.pending },
                          { name: 'Processando', value: data.queueStatus.processing },
                          { name: 'Concluídos', value: data.queueStatus.completed },
                          { name: 'Falhas', value: data.queueStatus.failed },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Errors by Source */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Erros por Fonte (24h)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.errors.bySource} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="source" type="category" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" name="Erros" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Posts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Posts Recentes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assunto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tokens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {posts.slice(0, 10).map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {post.metadata?.title || post.subject}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              post.status
                            )}`}
                          >
                            {getStatusLabel(post.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {post.tokensUsed.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(post.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedPost(post)}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Post Detail Modal */}
            {selectedPost && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Detalhes do Post</h2>
                    <button
                      onClick={() => setSelectedPost(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Assunto</label>
                      <p className="text-gray-900">{selectedPost.subject}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            selectedPost.status
                          )}`}
                        >
                          {getStatusLabel(selectedPost.status)}
                        </span>
                      </p>
                    </div>
                    {selectedPost.generatedText && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Texto Gerado</label>
                        <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm max-h-48 overflow-auto">
                          {selectedPost.generatedText.substring(0, 500)}...
                        </div>
                      </div>
                    )}
                    {selectedPost.imagePrompts && selectedPost.imagePrompts.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Prompts de Imagem</label>
                        <ul className="mt-1 space-y-1">
                          {selectedPost.imagePrompts.map((prompt, i) => (
                            <li key={i} className="text-sm text-gray-600">
                              {i + 1}. {prompt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedPost.wordpressUrl && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">URL WordPress</label>
                        <a
                          href={selectedPost.wordpressUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline block"
                        >
                          {selectedPost.wordpressUrl}
                        </a>
                      </div>
                    )}
                  </div>
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
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
