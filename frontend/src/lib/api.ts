import axios, { AxiosInstance } from 'axios';
import {
  Credential,
  Prompt,
  Limits,
  Log,
  Post,
  UsageStats,
  DashboardData,
  AllConnectionTests,
} from '@/types';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.token = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Auth
  async login(username: string, password: string): Promise<{ accessToken: string; expiresIn: string }> {
    const response = await this.client.post('/auth/login', { username, password });
    this.setToken(response.data.accessToken);
    return response.data;
  }

  async verifyToken(): Promise<{ valid: boolean; user: { id: string; username: string } }> {
    const response = await this.client.post('/auth/verify');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/auth/change-password', { currentPassword, newPassword });
  }

  // Credentials
  async getCredentials(): Promise<Credential[]> {
    const response = await this.client.get('/credentials');
    return response.data;
  }

  async updateCredential(key: string, value: string, encrypt: boolean = true): Promise<Credential> {
    const response = await this.client.put('/credentials', { key, value, encrypt });
    return response.data;
  }

  async testTelegramConnection(): Promise<{ configured: boolean }> {
    const response = await this.client.get('/credentials/telegram/test');
    return response.data;
  }

  async testDeepSeekConnection(): Promise<{ configured: boolean }> {
    const response = await this.client.get('/credentials/deepseek/test');
    return response.data;
  }

  async testGeminiConnection(): Promise<{ configured: boolean }> {
    const response = await this.client.get('/credentials/gemini/test');
    return response.data;
  }

  async testWordPressConnection(): Promise<{ configured: boolean }> {
    const response = await this.client.get('/credentials/wordpress/test');
    return response.data;
  }

  // Prompts
  async getPrompts(): Promise<Prompt[]> {
    const response = await this.client.get('/prompts');
    return response.data;
  }

  async getActivePrompt(): Promise<Prompt | null> {
    const response = await this.client.get('/prompts/active');
    return response.data;
  }

  async createPrompt(basePrompt: string, editorialRules?: string): Promise<Prompt> {
    const response = await this.client.post('/prompts', { basePrompt, editorialRules });
    return response.data;
  }

  async updatePrompt(id: string, data: { basePrompt?: string; editorialRules?: string }): Promise<Prompt> {
    const response = await this.client.put(`/prompts/${id}`, data);
    return response.data;
  }

  async activatePrompt(id: string): Promise<Prompt> {
    const response = await this.client.post(`/prompts/${id}/activate`);
    return response.data;
  }

  async testPrompt(subject: string): Promise<{ prompt: string }> {
    const response = await this.client.post('/prompts/test', { subject });
    return response.data;
  }

  // Limits
  async getLimits(): Promise<Limits> {
    const response = await this.client.get('/limits');
    return response.data;
  }

  async updateLimits(data: Partial<Limits>): Promise<Limits> {
    const response = await this.client.put('/limits', data);
    return response.data;
  }

  async getUsageStats(): Promise<UsageStats> {
    const response = await this.client.get('/limits/stats');
    return response.data;
  }

  // Monitoring
  async getDashboard(): Promise<DashboardData> {
    const response = await this.client.get('/monitoring/dashboard');
    return response.data;
  }

  async getIaUsage(hours?: number): Promise<DashboardData['iaUsage']> {
    const response = await this.client.get('/monitoring/ia', { params: { hours } });
    return response.data;
  }

  async getImageUsage(days?: number): Promise<DashboardData['imageUsage']> {
    const response = await this.client.get('/monitoring/images', { params: { days } });
    return response.data;
  }

  async getQueueStatus(): Promise<DashboardData['queueStatus']> {
    const response = await this.client.get('/monitoring/queue');
    return response.data;
  }

  async getErrorsSummary(hours?: number): Promise<DashboardData['errors']> {
    const response = await this.client.get('/monitoring/errors', { params: { hours } });
    return response.data;
  }

  // Logs
  async getLogs(params?: {
    source?: string;
    level?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: Log[]; total: number }> {
    const response = await this.client.get('/logs', { params });
    return response.data;
  }

  async getTelegramLogs(limit?: number): Promise<Log[]> {
    const response = await this.client.get('/logs/telegram', { params: { limit } });
    return response.data;
  }

  async getIaLogs(limit?: number): Promise<Log[]> {
    const response = await this.client.get('/logs/ia', { params: { limit } });
    return response.data;
  }

  async getImagesLogs(limit?: number): Promise<Log[]> {
    const response = await this.client.get('/logs/images', { params: { limit } });
    return response.data;
  }

  async getWordPressLogs(limit?: number): Promise<Log[]> {
    const response = await this.client.get('/logs/wordpress', { params: { limit } });
    return response.data;
  }

  async getErrorLogs(limit?: number): Promise<Log[]> {
    const response = await this.client.get('/logs/errors', { params: { limit } });
    return response.data;
  }

  async getLogStats(): Promise<{
    total: number;
    bySource: Record<string, number>;
    byLevel: Record<string, number>;
    errorsLast24h: number;
  }> {
    const response = await this.client.get('/logs/stats');
    return response.data;
  }

  // Posts
  async getPosts(): Promise<Post[]> {
    const response = await this.client.get('/posts');
    return response.data;
  }

  async getPost(id: string): Promise<Post> {
    const response = await this.client.get(`/posts/${id}`);
    return response.data;
  }

  async createPost(subject: string): Promise<Post> {
    const response = await this.client.post('/posts', { subject });
    return response.data;
  }

  async approvePost(id: string): Promise<Post> {
    const response = await this.client.post(`/posts/${id}/approve`);
    return response.data;
  }

  async cancelPost(id: string): Promise<Post> {
    const response = await this.client.post(`/posts/${id}/cancel`);
    return response.data;
  }

  // Telegram
  async testTelegram(): Promise<{ success: boolean; message: string }> {
    const response = await this.client.get('/telegram/test');
    return response.data;
  }

  async reinitTelegramBot(): Promise<{ message: string }> {
    const response = await this.client.post('/telegram/reinit');
    return response.data;
  }

  // Test all connections
  async testAllConnections(): Promise<AllConnectionTests> {
    const response = await this.client.get('/test/connections');
    return response.data;
  }
}

export const api = new ApiClient();
