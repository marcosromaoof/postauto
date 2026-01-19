'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { Limits, UsageStats } from '@/types';
import toast from 'react-hot-toast';
import { Gauge, Save, RefreshCw, Activity, FileText, Image, Send, Clock } from 'lucide-react';

export default function LimitsPage() {
  const [limits, setLimits] = useState<Limits | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    requestsPerHour: 10,
    tokensPerHour: 50000,
    imagesPerDay: 50,
    postsPerHour: 5,
    cooldownSeconds: 60,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [limitsData, statsData] = await Promise.all([
        api.getLimits(),
        api.getUsageStats(),
      ]);
      setLimits(limitsData);
      setStats(statsData);
      setFormData({
        requestsPerHour: limitsData.requestsPerHour,
        tokensPerHour: limitsData.tokensPerHour,
        imagesPerDay: limitsData.imagesPerDay,
        postsPerHour: limitsData.postsPerHour,
        cooldownSeconds: limitsData.cooldownSeconds,
      });
    } catch (error) {
      toast.error('Erro ao carregar limites');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateLimits(formData);
      toast.success('Limites atualizados com sucesso');
      await loadData();
    } catch (error) {
      toast.error('Erro ao salvar limites');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData((prev) => ({ ...prev, [field]: numValue }));
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Limites / Anti-Abuso</h1>
            <p className="text-gray-500">Configure os limites de uso do sistema</p>
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Usage */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Uso Atual</h2>
              <div className="space-y-6">
                <UsageBar
                  label="Requisições IA/hora"
                  current={stats?.requestsLastHour || 0}
                  limit={limits?.requestsPerHour || 10}
                  icon={Activity}
                />
                <UsageBar
                  label="Tokens/hora"
                  current={stats?.tokensLastHour || 0}
                  limit={limits?.tokensPerHour || 50000}
                  icon={FileText}
                />
                <UsageBar
                  label="Imagens/dia"
                  current={stats?.imagesLastDay || 0}
                  limit={limits?.imagesPerDay || 50}
                  icon={Image}
                />
                <UsageBar
                  label="Posts/hora"
                  current={stats?.postsLastHour || 0}
                  limit={limits?.postsPerHour || 5}
                  icon={Send}
                />
              </div>
            </div>

            {/* Limit Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Configurar Limites</h2>
              <div className="space-y-4">
                <LimitInput
                  label="Requisições IA por hora"
                  value={formData.requestsPerHour}
                  onChange={(v) => handleChange('requestsPerHour', v)}
                  icon={Activity}
                  min={1}
                  max={100}
                />
                <LimitInput
                  label="Tokens por hora"
                  value={formData.tokensPerHour}
                  onChange={(v) => handleChange('tokensPerHour', v)}
                  icon={FileText}
                  min={1000}
                  max={500000}
                  step={1000}
                />
                <LimitInput
                  label="Imagens por dia"
                  value={formData.imagesPerDay}
                  onChange={(v) => handleChange('imagesPerDay', v)}
                  icon={Image}
                  min={1}
                  max={500}
                />
                <LimitInput
                  label="Posts por hora"
                  value={formData.postsPerHour}
                  onChange={(v) => handleChange('postsPerHour', v)}
                  icon={Send}
                  min={1}
                  max={50}
                />
                <LimitInput
                  label="Cooldown (segundos)"
                  value={formData.cooldownSeconds}
                  onChange={(v) => handleChange('cooldownSeconds', v)}
                  icon={Clock}
                  min={0}
                  max={3600}
                />

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 mt-6"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salvar Limites
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className="lg:col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Sobre os Limites</h3>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>• <strong>Requisições IA/hora:</strong> Número máximo de chamadas à API do DeepSeek por hora</li>
                <li>• <strong>Tokens/hora:</strong> Quantidade máxima de tokens consumidos por hora</li>
                <li>• <strong>Imagens/dia:</strong> Número máximo de imagens geradas pelo Gemini por dia</li>
                <li>• <strong>Posts/hora:</strong> Quantidade máxima de posts publicados no WordPress por hora</li>
                <li>• <strong>Cooldown:</strong> Tempo mínimo entre requisições consecutivas</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

function UsageBar({
  label,
  current,
  limit,
  icon: Icon,
}: {
  label: string;
  current: number;
  limit: number;
  icon: any;
}) {
  const percentage = Math.min((current / limit) * 100, 100);
  const isWarning = percentage > 50;
  const isDanger = percentage > 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm text-gray-500">
          {current.toLocaleString('pt-BR')} / {limit.toLocaleString('pt-BR')}
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function LimitInput({
  label,
  value,
  onChange,
  icon: Icon,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  icon: any;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
    </div>
  );
}
