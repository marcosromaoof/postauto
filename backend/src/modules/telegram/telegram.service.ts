import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import TelegramBot from 'node-telegram-bot-api';
import { Post, PostStatus, LogSource } from '../../database/entities';
import { CredentialsService } from '../credentials';
import { LogsService } from '../logs';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: TelegramBot | null = null;
  private authorizedChatId: string | null = null;
  private onSubjectCallback: ((subject: string, messageId: string) => Promise<void>) | null = null;
  private onApprovalCallback: ((postId: string, action: 'approve' | 'adjust' | 'cancel', data?: string) => Promise<void>) | null = null;

  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    private credentialsService: CredentialsService,
    private logsService: LogsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initBot();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot) {
      this.bot.stopPolling();
    }
  }

  async initBot(): Promise<void> {
    const config = await this.credentialsService.getTelegramConfig();
    if (!config) {
      await this.logsService.warn(LogSource.TELEGRAM, 'Bot do Telegram não configurado');
      return;
    }

    this.authorizedChatId = config.chatId;

    try {
      if (this.bot) {
        this.bot.stopPolling();
      }

      this.bot = new TelegramBot(config.botToken, { polling: true });

      this.bot.on('message', async (msg) => {
        await this.handleMessage(msg);
      });

      this.bot.on('callback_query', async (query) => {
        await this.handleCallbackQuery(query);
      });

      await this.logsService.info(LogSource.TELEGRAM, 'Bot do Telegram iniciado com sucesso');
    } catch (error: any) {
      await this.logsService.error(LogSource.TELEGRAM, `Erro ao iniciar bot: ${error.message}`);
    }
  }

  async reinitBot(): Promise<void> {
    await this.initBot();
  }

  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id.toString();

    if (chatId !== this.authorizedChatId) {
      await this.logsService.warn(LogSource.TELEGRAM, `Mensagem de chat não autorizado: ${chatId}`);
      if (this.bot) {
        await this.bot.sendMessage(msg.chat.id, '❌ Você não está autorizado a usar este bot.');
      }
      return;
    }

    const text = msg.text || '';

    if (text.startsWith('/start')) {
      await this.sendWelcomeMessage(chatId);
      return;
    }

    if (text.startsWith('/help')) {
      await this.sendHelpMessage(chatId);
      return;
    }

    if (text.startsWith('/status')) {
      await this.sendStatusMessage(chatId);
      return;
    }

    const subjectMatch = text.match(/^Assunto:\s*(.+)$/i);
    if (subjectMatch) {
      const subject = subjectMatch[1].trim();
      await this.logsService.info(LogSource.TELEGRAM, `Novo assunto recebido: ${subject}`);
      
      if (this.onSubjectCallback) {
        await this.onSubjectCallback(subject, msg.message_id.toString());
      }
      
      if (this.bot) {
        await this.bot.sendMessage(
          chatId,
          `✅ Assunto recebido: "${subject}"\n\n⏳ Gerando texto... Aguarde a aprovação.`,
        );
      }
      return;
    }

    if (this.bot) {
      await this.bot.sendMessage(
        chatId,
        '❓ Formato não reconhecido.\n\nPara criar um novo post, envie:\n`Assunto: seu assunto aqui`',
        { parse_mode: 'Markdown' },
      );
    }
  }

  private async handleCallbackQuery(query: TelegramBot.CallbackQuery): Promise<void> {
    if (!query.data || !this.bot) return;

    const chatId = query.message?.chat.id.toString();
    if (chatId !== this.authorizedChatId) {
      await this.bot.answerCallbackQuery(query.id, { text: 'Não autorizado' });
      return;
    }

    const [action, postId] = query.data.split(':');

    await this.logsService.info(LogSource.TELEGRAM, `Callback recebido: ${action} para post ${postId}`);

    switch (action) {
      case 'approve':
        if (this.onApprovalCallback) {
          await this.onApprovalCallback(postId, 'approve');
        }
        await this.bot.answerCallbackQuery(query.id, { text: '✅ Post aprovado!' });
        await this.bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: query.message?.chat.id, message_id: query.message?.message_id },
        );
        await this.bot.sendMessage(
          chatId!,
          `✅ Post aprovado!\n\n⏳ Gerando imagens... Isso pode levar alguns minutos.`,
        );
        break;

      case 'adjust':
        await this.bot.answerCallbackQuery(query.id, { text: 'Envie os ajustes desejados' });
        await this.bot.sendMessage(
          chatId!,
          `📝 Envie os ajustes desejados para o post.\n\nFormato:\n\`Ajuste:${postId}: sua descrição dos ajustes\``,
          { parse_mode: 'Markdown' },
        );
        break;

      case 'cancel':
        if (this.onApprovalCallback) {
          await this.onApprovalCallback(postId, 'cancel');
        }
        await this.bot.answerCallbackQuery(query.id, { text: '❌ Post cancelado' });
        await this.bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: query.message?.chat.id, message_id: query.message?.message_id },
        );
        await this.bot.sendMessage(chatId!, '❌ Post cancelado.');
        break;
    }
  }

  async sendApprovalRequest(post: Post): Promise<void> {
    if (!this.bot || !this.authorizedChatId) {
      await this.logsService.warn(LogSource.TELEGRAM, 'Bot não configurado para enviar aprovação');
      return;
    }

    const title = post.metadata?.title || post.subject;
    const textPreview = post.generatedText?.substring(0, 1000) || '';

    const message = `📝 *Novo artigo gerado*\n\n` +
      `*Título:* ${title}\n\n` +
      `*Prévia do texto:*\n${textPreview}${post.generatedText && post.generatedText.length > 1000 ? '...' : ''}\n\n` +
      `⚠️ *Imagens NÃO foram geradas ainda.*\n` +
      `Serão geradas apenas após a aprovação.\n\n` +
      `*Prompts de imagem:*\n${(post.imagePrompts || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Aprovar', callback_data: `approve:${post.id}` },
          { text: '📝 Ajustar texto', callback_data: `adjust:${post.id}` },
          { text: '❌ Cancelar', callback_data: `cancel:${post.id}` },
        ],
      ],
    };

    await this.bot.sendMessage(this.authorizedChatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }

  async sendPublishNotification(post: Post, url: string): Promise<void> {
    if (!this.bot || !this.authorizedChatId) return;

    const title = post.metadata?.title || post.subject;
    const message = `🎉 *Post publicado com sucesso!*\n\n` +
      `*Título:* ${title}\n` +
      `*URL:* ${url}`;

    await this.bot.sendMessage(this.authorizedChatId, message, { parse_mode: 'Markdown' });
  }

  async sendErrorNotification(postId: string, error: string): Promise<void> {
    if (!this.bot || !this.authorizedChatId) return;

    const message = `❌ *Erro no processamento*\n\n` +
      `*Post ID:* ${postId}\n` +
      `*Erro:* ${error}`;

    await this.bot.sendMessage(this.authorizedChatId, message, { parse_mode: 'Markdown' });
  }

  private async sendWelcomeMessage(chatId: string): Promise<void> {
    if (!this.bot) return;

    const message = `👋 *Bem-vindo ao PostAuto Bot!*\n\n` +
      `Este bot permite criar posts automaticamente.\n\n` +
      `*Como usar:*\n` +
      `1. Envie: \`Assunto: seu assunto aqui\`\n` +
      `2. Aguarde a geração do texto\n` +
      `3. Aprove, ajuste ou cancele\n` +
      `4. Após aprovação, imagens serão geradas\n` +
      `5. Post será publicado automaticamente\n\n` +
      `Use /help para mais informações.`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  private async sendHelpMessage(chatId: string): Promise<void> {
    if (!this.bot) return;

    const message = `📚 *Comandos disponíveis:*\n\n` +
      `/start - Mensagem de boas-vindas\n` +
      `/help - Esta mensagem de ajuda\n` +
      `/status - Ver status dos posts recentes\n\n` +
      `*Para criar um post:*\n` +
      `\`Assunto: seu assunto aqui\`\n\n` +
      `*Para ajustar um texto:*\n` +
      `\`Ajuste:ID_DO_POST: descrição dos ajustes\``;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  private async sendStatusMessage(chatId: string): Promise<void> {
    if (!this.bot) return;

    const recentPosts = await this.postRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    if (recentPosts.length === 0) {
      await this.bot.sendMessage(chatId, '📭 Nenhum post encontrado.');
      return;
    }

    const statusEmoji: Record<PostStatus, string> = {
      [PostStatus.PENDING_TEXT]: '⏳',
      [PostStatus.PENDING_APPROVAL]: '🔔',
      [PostStatus.APPROVED]: '✅',
      [PostStatus.GENERATING_IMAGES]: '🖼️',
      [PostStatus.READY]: '📦',
      [PostStatus.PUBLISHED]: '🎉',
      [PostStatus.CANCELLED]: '❌',
      [PostStatus.ERROR]: '⚠️',
    };

    const message = `📊 *Posts recentes:*\n\n` +
      recentPosts.map((post) => {
        const emoji = statusEmoji[post.status] || '❓';
        const title = post.metadata?.title || post.subject;
        return `${emoji} *${title.substring(0, 30)}*\nStatus: ${post.status}`;
      }).join('\n\n');

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  setOnSubjectCallback(callback: (subject: string, messageId: string) => Promise<void>): void {
    this.onSubjectCallback = callback;
  }

  setOnApprovalCallback(callback: (postId: string, action: 'approve' | 'adjust' | 'cancel', data?: string) => Promise<void>): void {
    this.onApprovalCallback = callback;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const config = await this.credentialsService.getTelegramConfig();
    if (!config) {
      return { success: false, message: 'Telegram não configurado' };
    }

    try {
      const testBot = new TelegramBot(config.botToken);
      const me = await testBot.getMe();
      return {
        success: true,
        message: `Conectado como @${me.username}`,
      };
    } catch (error: any) {
      return { success: false, message: `Erro: ${error.message}` };
    }
  }
}
