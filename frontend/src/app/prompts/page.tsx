'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { Prompt } from '@/types';
import toast from 'react-hot-toast';
import {
  FileText,
  Save,
  Plus,
  CheckCircle,
  History,
  Play,
  X,
} from 'lucide-react';

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [basePrompt, setBasePrompt] = useState('');
  const [editorialRules, setEditorialRules] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSubject, setTestSubject] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const [allPrompts, active] = await Promise.all([
        api.getPrompts(),
        api.getActivePrompt(),
      ]);
      setPrompts(allPrompts);
      setActivePrompt(active);
      if (active) {
        setBasePrompt(active.basePrompt);
        setEditorialRules(active.editorialRules || '');
      }
    } catch (error) {
      toast.error('Erro ao carregar prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!basePrompt.trim()) {
      toast.error('O prompt base não pode ser vazio');
      return;
    }

    setSaving(true);
    try {
      if (activePrompt) {
        await api.updatePrompt(activePrompt.id, {
          basePrompt,
          editorialRules: editorialRules || undefined,
        });
      } else {
        await api.createPrompt(basePrompt, editorialRules || undefined);
      }
      toast.success('Prompt salvo com sucesso (nova versão criada)');
      setEditMode(false);
      await loadPrompts();
    } catch (error) {
      toast.error('Erro ao salvar prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.activatePrompt(id);
      toast.success('Prompt ativado com sucesso');
      await loadPrompts();
      setShowHistory(false);
    } catch (error) {
      toast.error('Erro ao ativar prompt');
    }
  };

  const handleTest = async () => {
    if (!testSubject.trim()) {
      toast.error('Digite um assunto para testar');
      return;
    }

    setTesting(true);
    try {
      const result = await api.testPrompt(testSubject);
      setTestResult(result.prompt);
    } catch (error) {
      toast.error('Erro ao testar prompt');
    } finally {
      setTesting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IA - Prompt</h1>
            <p className="text-gray-500">Configure o prompt base e regras editoriais</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <History className="w-5 h-5" />
              Histórico
            </button>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <FileText className="w-5 h-5" />
                Editar
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Editor */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Prompt Info */}
              {activePrompt && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Versão Ativa: {activePrompt.version}</p>
                    <p className="text-sm text-green-600">
                      Idioma: {activePrompt.language} | Atualizado em:{' '}
                      {new Date(activePrompt.updatedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              )}

              {/* Base Prompt */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Prompt Base</h2>
                <textarea
                  value={basePrompt}
                  onChange={(e) => setBasePrompt(e.target.value)}
                  disabled={!editMode}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono text-sm"
                  placeholder="Digite o prompt base para geração de conteúdo..."
                />
              </div>

              {/* Editorial Rules */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Regras Editoriais</h2>
                <textarea
                  value={editorialRules}
                  onChange={(e) => setEditorialRules(e.target.value)}
                  disabled={!editMode}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono text-sm"
                  placeholder="Digite as regras editoriais (tom, estilo, restrições)..."
                />
              </div>

              {/* Save Button */}
              {editMode && (
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Salvar Nova Versão
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      if (activePrompt) {
                        setBasePrompt(activePrompt.basePrompt);
                        setEditorialRules(activePrompt.editorialRules || '');
                      }
                    }}
                    className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Test Prompt */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Teste de Prompt (Sandbox)</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assunto de Teste
                    </label>
                    <input
                      type="text"
                      value={testSubject}
                      onChange={(e) => setTestSubject(e.target.value)}
                      placeholder="Ex: Inteligência Artificial"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {testing ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Testar
                      </>
                    )}
                  </button>
                  {testResult && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Resultado</label>
                        <button
                          onClick={() => setTestResult(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <pre className="p-3 bg-gray-50 rounded-lg text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                        {testResult}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Version History */}
              {showHistory && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Versões</h2>
                  <div className="space-y-3 max-h-96 overflow-auto">
                    {prompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className={`p-3 rounded-lg border ${
                          prompt.isActive
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Versão {prompt.version}</span>
                          {prompt.isActive ? (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                              Ativa
                            </span>
                          ) : (
                            <button
                              onClick={() => handleActivate(prompt.id)}
                              className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200"
                            >
                              Ativar
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(prompt.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
