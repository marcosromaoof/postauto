'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { Credential, AllConnectionTests } from '@/types';
import toast from 'react-hot-toast';
import {
  Key,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  XCircle,
  Bot,
  Brain,
  Image,
  Globe,
} from 'lucide-react';

const credentialGroups = [
  {
    title: 'Telegram',
    icon: Bot,
    keys: ['telegram_bot_token', 'telegram_chat_id'],
    testKey: 'telegram' as const,
  },
  {
    title: 'DeepSeek (IA)',
    icon: Brain,
    keys: ['deepseek_api_key', 'deepseek_model'],
    testKey: 'deepseek' as const,
  },
  {
    title: 'Gemini (Imagens)',
    icon: Image,
    keys: ['gemini_api_key'],
    testKey: 'gemini' as const,
  },
  {
    title: 'WordPress',
    icon: Globe,
    keys: ['wordpress_url', 'wordpress_user', 'wordpress_app_password'],
    testKey: 'wordpress' as const,
  },
];

const credentialLabels: Record<string, string> = {
  telegram_bot_token: 'Bot Token',
  telegram_chat_id: 'Chat ID Autorizado',
  deepseek_api_key: 'API Key',
  deepseek_model: 'Modelo (ex: deepseek-chat)',
  gemini_api_key: 'API Key',
  wordpress_url: 'URL do Site',
  wordpress_user: 'Usuário',
  wordpress_app_password: 'Application Password',
};

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<AllConnectionTests | null>(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const data = await api.getCredentials();
      setCredentials(data);
      const initialValues: Record<string, string> = {};
      data.forEach((cred) => {
        initialValues[cred.key] = cred.value === '********' ? '' : cred.value;
      });
      setValues(initialValues);
    } catch (error) {
      toast.error('Erro ao carregar credenciais');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    if (!values[key]) {
      toast.error('Valor não pode ser vazio');
      return;
    }

    setSaving(key);
    try {
      await api.updateCredential(key, values[key]);
      toast.success('Credencial salva com sucesso');
      await loadCredentials();
    } catch (error) {
      toast.error('Erro ao salvar credencial');
    } finally {
      setSaving(null);
    }
  };

  const handleTestAll = async () => {
    setTesting(true);
    try {
      const results = await api.testAllConnections();
      setTestResults(results);
      
      const allSuccess = Object.values(results).every((r) => r.success);
      if (allSuccess) {
        toast.success('Todas as conexões estão funcionando!');
      } else {
        toast.error('Algumas conexões falharam');
      }
    } catch (error) {
      toast.error('Erro ao testar conexões');
    } finally {
      setTesting(false);
    }
  };

  const toggleShowValue = (key: string) => {
    setShowValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Credenciais</h1>
            <p className="text-gray-500">Configure as credenciais dos serviços</p>
          </div>
          <button
            onClick={handleTestAll}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {testing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Testar Conexões
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {credentialGroups.map((group) => {
              const Icon = group.icon;
              const testResult = testResults?.[group.testKey];

              return (
                <div
                  key={group.title}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary-100">
                        <Icon className="w-5 h-5 text-primary-600" />
                      </div>
                      <h2 className="font-semibold text-gray-900">{group.title}</h2>
                    </div>
                    {testResult && (
                      <div
                        className={`flex items-center gap-1 text-sm ${
                          testResult.success ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                          {testResult.success ? 'Conectado' : 'Falha'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-4">
                    {group.keys.map((key) => {
                      const cred = credentials.find((c) => c.key === key);
                      const isSecret = key.includes('token') || key.includes('password') || key.includes('api_key');

                      return (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {credentialLabels[key] || key}
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type={isSecret && !showValues[key] ? 'password' : 'text'}
                                value={values[key] || ''}
                                onChange={(e) =>
                                  setValues((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                placeholder={cred?.isEncrypted ? '(valor criptografado)' : 'Digite o valor'}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                              {isSecret && (
                                <button
                                  type="button"
                                  onClick={() => toggleShowValue(key)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showValues[key] ? (
                                    <EyeOff className="w-5 h-5" />
                                  ) : (
                                    <Eye className="w-5 h-5" />
                                  )}
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => handleSave(key)}
                              disabled={saving === key}
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                            >
                              {saving === key ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                              ) : (
                                <Save className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                          {cred?.description && (
                            <p className="mt-1 text-xs text-gray-500">{cred.description}</p>
                          )}
                        </div>
                      );
                    })}
                    {testResult && !testResult.success && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600">{testResult.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
