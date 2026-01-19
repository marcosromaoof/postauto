import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedData1705700000001 implements MigrationInterface {
  name = 'SeedData1705700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create default admin user (password: admin123)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await queryRunner.query(`
      INSERT INTO "admin" ("username", "password")
      VALUES ('admin', '${hashedPassword}')
    `);

    // Create default limits
    await queryRunner.query(`
      INSERT INTO "limits" ("requestsPerHour", "tokensPerHour", "imagesPerDay", "postsPerHour", "cooldownSeconds")
      VALUES (10, 50000, 50, 5, 60)
    `);

    // Create default prompt
    await queryRunner.query(`
      INSERT INTO "prompts" ("basePrompt", "editorialRules", "language", "version", "isActive")
      VALUES (
        'Você é um redator profissional especializado em criar artigos informativos e envolventes. Escreva um artigo completo sobre o assunto fornecido, seguindo as melhores práticas de SEO e legibilidade.

O artigo deve conter:
1. Um título atraente e otimizado para SEO
2. Uma introdução que capture a atenção do leitor
3. Pelo menos 3 seções com subtítulos (H2)
4. Parágrafos bem estruturados com informações relevantes
5. Uma conclusão que resuma os pontos principais
6. Ao final, gere 3 prompts de imagem em inglês que ilustrem o conteúdo do artigo

Formato de resposta esperado:
---TITULO---
[título do artigo]
---CONTEUDO---
[conteúdo completo do artigo em HTML]
---PROMPTS_IMAGEM---
[prompt 1]
[prompt 2]
[prompt 3]',
        'Idioma: Português do Brasil
Tom: Profissional e informativo
Evitar: Linguagem informal, gírias, erros gramaticais
Incluir: Dados relevantes, exemplos práticos quando aplicável
Tamanho: Entre 800 e 1500 palavras',
        'pt-BR',
        1,
        true
      )
    `);

    // Create placeholder credentials (to be filled by admin)
    const credentials = [
      { key: 'telegram_bot_token', description: 'Token do bot do Telegram' },
      { key: 'telegram_chat_id', description: 'ID do chat autorizado no Telegram' },
      { key: 'deepseek_api_key', description: 'API Key do DeepSeek' },
      { key: 'deepseek_model', description: 'Modelo do DeepSeek a ser usado' },
      { key: 'gemini_api_key', description: 'API Key do Gemini' },
      { key: 'wordpress_url', description: 'URL do WordPress' },
      { key: 'wordpress_user', description: 'Usuário do WordPress' },
      { key: 'wordpress_app_password', description: 'Application Password do WordPress' },
    ];

    for (const cred of credentials) {
      await queryRunner.query(`
        INSERT INTO "credentials" ("key", "value", "description", "isEncrypted")
        VALUES ('${cred.key}', '', '${cred.description}', false)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "credentials"`);
    await queryRunner.query(`DELETE FROM "prompts"`);
    await queryRunner.query(`DELETE FROM "limits"`);
    await queryRunner.query(`DELETE FROM "admin"`);
  }
}
