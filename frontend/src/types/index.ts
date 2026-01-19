export interface Admin {
  id: string;
  username: string;
}

export interface Credential {
  id: string;
  key: string;
  value: string;
  isEncrypted: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Prompt {
  id: string;
  basePrompt: string;
  editorialRules: string | null;
  language: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Limits {
  id: string;
  requestsPerHour: number;
  tokensPerHour: number;
  imagesPerDay: number;
  postsPerHour: number;
  cooldownSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface Usage {
  id: string;
  type: 'ia_request' | 'ia_tokens' | 'image_generation' | 'post_creation';
  count: number;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface Log {
  id: string;
  source: 'telegram' | 'ia' | 'images' | 'wordpress' | 'system';
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface Post {
  id: string;
  subject: string;
  generatedText: string | null;
  htmlContent: string | null;
  imagePrompts: string[] | null;
  generatedImages: string[] | null;
  status: 'pending_text' | 'pending_approval' | 'approved' | 'generating_images' | 'ready' | 'published' | 'cancelled' | 'error';
  wordpressPostId: string | null;
  wordpressUrl: string | null;
  telegramMessageId: string | null;
  tokensUsed: number;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsageStats {
  requestsLastHour: number;
  tokensLastHour: number;
  imagesLastDay: number;
  postsLastHour: number;
  limits: Limits;
}

export interface DashboardData {
  usageStats: UsageStats;
  iaUsage: {
    requests: number;
    tokens: number;
    hourlyBreakdown: { hour: string; requests: number; tokens: number }[];
  };
  imageUsage: {
    total: number;
    dailyBreakdown: { date: string; count: number }[];
  };
  queueStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  errors: {
    total: number;
    bySource: { source: string; count: number }[];
    recent: Log[];
  };
}

export interface ConnectionTest {
  success: boolean;
  message: string;
}

export interface AllConnectionTests {
  telegram: ConnectionTest;
  deepseek: ConnectionTest;
  gemini: ConnectionTest;
  wordpress: ConnectionTest;
}
