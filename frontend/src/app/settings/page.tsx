'use client';

import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Settings, Lock, RefreshCw, Bot, CheckCircle, XCircle } from 'lucide-react';

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [reinitingBot, setReinitingBot] = useState(false);
  const [testingConnections, setTestingConnections] = useState(false);
  const [connectionResults, setConnectionResults] = useState<{
    telegram: { success: boolean; message: string };
    deepseek: { success: boolean; message: string };
    gemini: { success: boolean; message: string };
    wordpress: { success: boolean; message: string };
  } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast.success('Senha alterada com sucesso');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleReinitBot = async () => {
    setReinitingBot(true);
    try {
      await api.reinitTelegramBot();
      toast.success('Bot do Telegram reiniciado com sucesso');
    } catch (error) {
      toast.error('Erro ao reiniciar bot');
    } finally {
      setReinitingBot(false);
    }
  };

  const handleTestConnections = async () => {
    setTestingConnections(true);
    try {
      const results = await api.testAllConnections();
      setConnectionResults(results);
      
      const allSuccess = Object.values(results).every((r) => r.success);
      if (allSuccess) {
        toast.success('Todas as conexões estão funcionando!');
      } else {
        toast.error('Algumas conexões falharam');
      }
    } catch (error) {
      toast.error('Erro ao testar conexões');
    } finally {
      setTestingConnections(false);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500">Gerencie as configurações do sistema</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary-100">
                <Lock className="w-5 h-5 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Alterar Senha</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha Atual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {changingPassword ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Alterar Senha
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Telegram Bot */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-100">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Bot do Telegram</h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Se você alterou as credenciais do Telegram, reinicie o bot para aplicar as mudanças.
            </p>

            <button
              onClick={handleReinitBot}
              disabled={reinitingBot}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {reinitingBot ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Reiniciar Bot
                </>
              )}
            </button>
          </div>

          {/* Test Connections */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Settings className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Testar Conexões</h2>
              </div>
              <button
                onClick={handleTestConnections}
                disabled={testingConnections}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {testingConnections ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Testar Todas
                  </>
                )}
              </button>
            </div>

            {connectionResults && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(connectionResults).map(([service, result]) => (
                  <div
                    key={service}
                    className={`p-4 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium capitalize">{service}</span>
                    </div>
                    <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {!connectionResults && (
              <p className="text-sm text-gray-500">
                Clique em "Testar Todas" para verificar as conexões com os serviços externos.
              </p>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
