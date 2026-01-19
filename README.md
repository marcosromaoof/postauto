# PostAuto

Sistema de automação de posts para WordPress via Telegram, utilizando DeepSeek para geração de texto e Gemini para geração de imagens.

## Stack Tecnológica

- **Backend:** Node.js 20+ / NestJS / TypeScript
- **Frontend:** Next.js 14 / React / TailwindCSS
- **Banco de Dados:** PostgreSQL
- **Cache/Fila:** Redis / BullMQ
- **Servidor Web:** Nginx
- **Sistema Operacional:** Ubuntu 22.04

## Funcionalidades

### Fluxo Principal

1. **Telegram:** Recebe assuntos via comando `Assunto: <texto>`
2. **DeepSeek:** Gera texto do artigo e prompts de imagem
3. **Aprovação:** Usuário aprova, ajusta ou cancela via Telegram
4. **Gemini:** Gera imagens (apenas após aprovação)
5. **WordPress:** Publica post completo com imagens

### Painel Admin

- **Login:** Autenticação JWT com sessão curta
- **Credenciais:** Configuração de APIs (Telegram, DeepSeek, Gemini, WordPress)
- **IA - Prompt:** Editor de prompt com versionamento e sandbox de teste
- **Limites:** Configuração de limites anti-abuso
- **Monitoramento:** Dashboard com uso de IA, imagens e fila
- **Logs:** Visualização de logs por fonte e nível
- **Configurações:** Alteração de senha e teste de conexões

## Deploy

### Requisitos

- Ubuntu 22.04 (servidor limpo)
- Acesso root (sudo)
- Conexão com internet

### Instalação Automática

```bash
# Clonar repositório
git clone https://github.com/marcosromaoof/postauto.git
cd postauto

# Executar deploy
chmod +x deploy.sh
sudo ./deploy.sh
```

O script irá:

1. Atualizar o sistema
2. Instalar Node.js 20, PostgreSQL, Redis, Nginx
3. Criar banco de dados e usuário
4. Executar migrations
5. Instalar dependências (backend e frontend)
6. Compilar aplicações
7. Configurar Nginx e PM2
8. Iniciar serviços

### Após o Deploy

1. Acesse `http://localhost` (ou IP do servidor)
2. Login com credenciais padrão:
   - Usuário: `admin`
   - Senha: `admin123`
3. **Altere a senha imediatamente**
4. Configure as credenciais dos serviços:
   - Telegram (Bot Token e Chat ID)
   - DeepSeek (API Key)
   - Gemini (API Key)
   - WordPress (URL, usuário e Application Password)

## Configuração dos Serviços

### Telegram

1. Crie um bot com [@BotFather](https://t.me/BotFather)
2. Copie o token do bot
3. Obtenha seu Chat ID (envie mensagem para [@userinfobot](https://t.me/userinfobot))
4. Configure no painel admin

### DeepSeek

1. Acesse [DeepSeek](https://platform.deepseek.com/)
2. Crie uma conta e obtenha API Key
3. Configure no painel admin

### Gemini

1. Acesse [Google AI Studio](https://aistudio.google.com/)
2. Crie uma API Key
3. Configure no painel admin

### WordPress

1. No WordPress, vá em Usuários > Seu Perfil
2. Gere uma Application Password
3. Configure URL, usuário e senha no painel admin

## Uso via Telegram

### Comandos

- `/start` - Mensagem de boas-vindas
- `/help` - Ajuda
- `/status` - Ver posts recentes

### Criar Post

```
Assunto: Inteligência Artificial no Brasil
```

### Fluxo de Aprovação

1. Bot envia texto gerado com botões:
   - ✅ Aprovar
   - 📝 Ajustar texto
   - ❌ Cancelar

2. Após aprovação:
   - Imagens são geradas
   - Post é publicado no WordPress
   - Notificação com URL é enviada

## Estrutura do Projeto

```
postauto/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── modules/        # Módulos da aplicação
│   │   │   ├── auth/       # Autenticação JWT
│   │   │   ├── credentials/# Gerenciamento de credenciais
│   │   │   ├── prompts/    # Gerenciamento de prompts
│   │   │   ├── limits/     # Limites anti-abuso
│   │   │   ├── logs/       # Sistema de logs
│   │   │   ├── monitoring/ # Monitoramento
│   │   │   ├── telegram/   # Integração Telegram
│   │   │   ├── deepseek/   # Integração DeepSeek
│   │   │   ├── gemini/     # Integração Gemini
│   │   │   ├── wordpress/  # Integração WordPress
│   │   │   └── queue/      # Fila BullMQ
│   │   ├── database/       # Entidades e migrations
│   │   └── common/         # Guards, decorators, etc
│   └── package.json
├── frontend/               # Painel Admin Next.js
│   ├── src/
│   │   ├── app/           # Páginas (App Router)
│   │   ├── components/    # Componentes React
│   │   ├── lib/           # API client e store
│   │   └── types/         # Tipos TypeScript
│   └── package.json
├── nginx/                  # Configuração Nginx
├── deploy.sh              # Script de deploy
├── ecosystem.config.js    # Configuração PM2
└── README.md
```

## Comandos Úteis

### PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs

# Reiniciar serviços
pm2 restart all

# Parar serviços
pm2 stop all
```

### Logs

```bash
# Backend
tail -f /var/log/postauto/backend-out.log

# Frontend
tail -f /var/log/postauto/frontend-out.log
```

### Banco de Dados

```bash
# Acessar PostgreSQL
sudo -u postgres psql -d postauto
```

## Limites Padrão

| Limite | Valor |
|--------|-------|
| Requisições IA/hora | 10 |
| Tokens/hora | 50.000 |
| Imagens/dia | 50 |
| Posts/hora | 5 |
| Cooldown | 60s |

## Segurança

- Credenciais armazenadas com criptografia AES-256
- Autenticação JWT com expiração curta (1h)
- Apenas um chat Telegram autorizado
- Logs imutáveis para auditoria
- Limites anti-abuso configuráveis

## Checklist Pós-Deploy

### Infraestrutura
- [ ] Node.js 20+ instalado
- [ ] PostgreSQL ativo
- [ ] Redis ativo
- [ ] Nginx ativo
- [ ] PM2 rodando serviços

### Backend
- [ ] API responde em localhost:3001
- [ ] Banco criado e populado
- [ ] Migrations aplicadas

### Painel Admin
- [ ] Login funciona
- [ ] Sessão expira corretamente
- [ ] Todas as áreas carregam
- [ ] Credenciais salvam criptografadas

### Telegram
- [ ] Bot responde
- [ ] Apenas chat autorizado funciona
- [ ] Enviar assunto gera texto
- [ ] Aprovação funciona

### IA e Imagens
- [ ] Texto gerado corretamente
- [ ] Imagens NÃO geradas antes da aprovação
- [ ] Imagens geradas após aprovação
- [ ] Limites respeitados

### WordPress
- [ ] Conexão testada
- [ ] Upload de imagens funciona
- [ ] Post criado corretamente
- [ ] Imagem destacada definida

## Licença

MIT License

## Suporte

Para dúvidas ou problemas, abra uma issue no repositório.
