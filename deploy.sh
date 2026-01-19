#!/bin/bash

# PostAuto - Script de Deploy Automatizado
# Este script instala e configura todo o ambiente necessário para rodar o PostAuto
# Compatível com Ubuntu 22.04

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis
APP_DIR="/var/www/postauto"
LOG_DIR="/var/log/postauto"
UPLOAD_DIR="/var/www/postauto/uploads"
DB_NAME="postauto"
DB_USER="postauto"
DB_PASSWORD="postauto_secret_password_$(openssl rand -hex 8)"
JWT_SECRET="jwt_secret_$(openssl rand -hex 32)"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   PostAuto - Deploy Automatizado${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Função para log
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] AVISO:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERRO:${NC} $1"
    exit 1
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root (sudo ./deploy.sh)"
fi

# 1. Atualizar sistema
log "Atualizando sistema..."
apt-get update -y
apt-get upgrade -y

# 2. Instalar dependências básicas
log "Instalando dependências básicas..."
apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release git build-essential

# 3. Instalar Node.js 20
log "Instalando Node.js 20..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
log "Node.js versão: $(node -v)"

# 4. Instalar PM2
log "Instalando PM2..."
npm install -g pm2

# 5. Instalar PostgreSQL
log "Instalando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
fi
systemctl start postgresql
systemctl enable postgresql

# 6. Configurar PostgreSQL
log "Configurando banco de dados PostgreSQL..."
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 7. Instalar Redis
log "Instalando Redis..."
if ! command -v redis-server &> /dev/null; then
    apt-get install -y redis-server
fi
systemctl start redis-server
systemctl enable redis-server

# 8. Instalar Nginx
log "Instalando Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi
systemctl start nginx
systemctl enable nginx

# 9. Criar diretórios
log "Criando diretórios..."
mkdir -p $APP_DIR
mkdir -p $LOG_DIR
mkdir -p $UPLOAD_DIR
chown -R www-data:www-data $UPLOAD_DIR

# 10. Copiar arquivos da aplicação
log "Copiando arquivos da aplicação..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -r $SCRIPT_DIR/backend $APP_DIR/
cp -r $SCRIPT_DIR/frontend $APP_DIR/
cp -r $SCRIPT_DIR/nginx $APP_DIR/
cp $SCRIPT_DIR/ecosystem.config.js $APP_DIR/

# 11. Configurar variáveis de ambiente do backend
log "Configurando variáveis de ambiente..."
cat > $APP_DIR/backend/.env << EOF
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_DATABASE=$DB_NAME

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRATION=1h

# Admin (credenciais iniciais)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Server
PORT=3001
NODE_ENV=production

# Upload
UPLOAD_DIR=$UPLOAD_DIR
EOF

# 12. Instalar dependências do backend
log "Instalando dependências do backend..."
cd $APP_DIR/backend
npm install

# 13. Compilar backend
log "Compilando backend..."
npm run build

# 14. Rodar migrations
log "Executando migrations..."
npm run migration:run || {
    warn "Migration falhou, tentando sincronizar banco..."
    # Se migration falhar, criar tabelas manualmente
    sudo -u postgres psql -d $DB_NAME << 'EOSQL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE usage_type_enum AS ENUM ('ia_request', 'ia_tokens', 'image_generation', 'post_creation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE log_source_enum AS ENUM ('telegram', 'ia', 'images', 'wordpress', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE log_level_enum AS ENUM ('info', 'warn', 'error', 'debug');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_status_enum AS ENUM ('pending_text', 'pending_approval', 'approved', 'generating_images', 'ready', 'published', 'cancelled', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "admin" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "username" character varying NOT NULL,
    "password" character varying NOT NULL,
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_admin_username" UNIQUE ("username"),
    CONSTRAINT "PK_admin" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "credentials" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "key" character varying NOT NULL,
    "value" text NOT NULL,
    "isEncrypted" boolean NOT NULL DEFAULT false,
    "description" character varying,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_credentials_key" UNIQUE ("key"),
    CONSTRAINT "PK_credentials" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "prompts" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "basePrompt" text NOT NULL,
    "editorialRules" text,
    "language" character varying NOT NULL DEFAULT 'pt-BR',
    "version" integer NOT NULL DEFAULT 1,
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_prompts" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "limits" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "requestsPerHour" integer NOT NULL DEFAULT 10,
    "tokensPerHour" integer NOT NULL DEFAULT 50000,
    "imagesPerDay" integer NOT NULL DEFAULT 50,
    "postsPerHour" integer NOT NULL DEFAULT 5,
    "cooldownSeconds" integer NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_limits" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "usage" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "type" usage_type_enum NOT NULL,
    "count" integer NOT NULL DEFAULT 1,
    "metadata" jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_usage" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "logs" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "source" log_source_enum NOT NULL,
    "level" log_level_enum NOT NULL DEFAULT 'info',
    "message" text NOT NULL,
    "metadata" jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_logs" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "posts" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "subject" character varying NOT NULL,
    "generatedText" text,
    "htmlContent" text,
    "imagePrompts" jsonb,
    "generatedImages" jsonb,
    "status" post_status_enum NOT NULL DEFAULT 'pending_text',
    "wordpressPostId" character varying,
    "wordpressUrl" character varying,
    "telegramMessageId" character varying,
    "tokensUsed" integer NOT NULL DEFAULT 0,
    "metadata" jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_posts" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_usage_type" ON "usage" ("type");
CREATE INDEX IF NOT EXISTS "IDX_usage_createdAt" ON "usage" ("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_logs_source" ON "logs" ("source");
CREATE INDEX IF NOT EXISTS "IDX_logs_level" ON "logs" ("level");
CREATE INDEX IF NOT EXISTS "IDX_logs_createdAt" ON "logs" ("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_posts_status" ON "posts" ("status");
CREATE INDEX IF NOT EXISTS "IDX_posts_createdAt" ON "posts" ("createdAt");
EOSQL
}

# 15. Inserir dados iniciais
log "Inserindo dados iniciais..."
HASHED_PASSWORD=$(node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(h => console.log(h));")
sudo -u postgres psql -d $DB_NAME << EOSQL
INSERT INTO "admin" ("username", "password")
SELECT 'admin', '$HASHED_PASSWORD'
WHERE NOT EXISTS (SELECT 1 FROM "admin" WHERE "username" = 'admin');

INSERT INTO "limits" ("requestsPerHour", "tokensPerHour", "imagesPerDay", "postsPerHour", "cooldownSeconds")
SELECT 10, 50000, 50, 5, 60
WHERE NOT EXISTS (SELECT 1 FROM "limits");

INSERT INTO "prompts" ("basePrompt", "editorialRules", "language", "version", "isActive")
SELECT 'Você é um redator profissional especializado em criar artigos informativos e envolventes. Escreva um artigo completo sobre o assunto fornecido, seguindo as melhores práticas de SEO e legibilidade.

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
'pt-BR', 1, true
WHERE NOT EXISTS (SELECT 1 FROM "prompts");

INSERT INTO "credentials" ("key", "value", "description", "isEncrypted")
SELECT 'telegram_bot_token', '', 'Token do bot do Telegram', false
WHERE NOT EXISTS (SELECT 1 FROM "credentials" WHERE "key" = 'telegram_bot_token');

INSERT INTO "credentials" ("key", "value", "description", "isEncrypted")
SELECT 'telegram_chat_id', '', 'ID do chat autorizado no Telegram', false
WHERE NOT EXISTS (SELECT 1 FROM "credentials" WHERE "key" = 'telegram_chat_id');

INSERT INTO "credentials" ("key", "value", "description", "isEncrypted")
SELECT 'deepseek_api_key', '', 'API Key do DeepSeek', false
WHERE NOT EXISTS (SELECT 1 FROM "credentials" WHERE "key" = 'deepseek_api_key');

INSERT INTO "credentials" ("key", "value", "description", "isEncrypted")
SELECT 'deepseek_model', 'deepseek-chat', 'Modelo do DeepSeek a ser usado', false
WHERE NOT EXISTS (SELECT 1 FROM "credentials" WHERE "key" = 'deepseek_model');

INSERT INTO "credentials" ("key", "value", "description", "isEncrypted")
SELECT 'gemini_api_key', '', 'API Key do Gemini', false
WHERE NOT EXISTS (SELECT 1 FROM "credentials" WHERE "key" = 'gemini_api_key');

INSERT INTO "credentials" ("key", "value", "description", "isEncrypted")
SELECT 'wordpress_url', '', 'URL do WordPress', false
WHERE NOT EXISTS (SELECT 1 FROM "credentials" WHERE "key" = 'wordpress_url');

INSERT INTO "credentials" ("key", "value", "description", "isEncrypted")
SELECT 'wordpress_user', '', 'Usuário do WordPress', false
WHERE NOT EXISTS (SELECT 1 FROM "credentials" WHERE "key" = 'wordpress_user');

INSERT INTO "credentials" ("key", "value", "description", "isEncrypted")
SELECT 'wordpress_app_password', '', 'Application Password do WordPress', false
WHERE NOT EXISTS (SELECT 1 FROM "credentials" WHERE "key" = 'wordpress_app_password');
EOSQL

# 16. Instalar dependências do frontend
log "Instalando dependências do frontend..."
cd $APP_DIR/frontend
npm install

# 17. Compilar frontend
log "Compilando frontend..."
npm run build

# 18. Configurar Nginx
log "Configurando Nginx..."
rm -f /etc/nginx/sites-enabled/default
cp $APP_DIR/nginx/postauto.conf /etc/nginx/sites-available/postauto
ln -sf /etc/nginx/sites-available/postauto /etc/nginx/sites-enabled/postauto
nginx -t
systemctl reload nginx

# 19. Configurar PM2
log "Configurando PM2..."
cd $APP_DIR
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# 20. Ajustar permissões
log "Ajustando permissões..."
chown -R www-data:www-data $APP_DIR
chown -R www-data:www-data $LOG_DIR
chmod -R 755 $APP_DIR
chmod -R 755 $UPLOAD_DIR

# 21. Verificar serviços
log "Verificando serviços..."
sleep 5

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Deploy Concluído com Sucesso!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Acesse o painel admin em: ${YELLOW}http://localhost${NC}"
echo ""
echo -e "Credenciais padrão:"
echo -e "  Usuário: ${YELLOW}admin${NC}"
echo -e "  Senha: ${YELLOW}admin123${NC}"
echo ""
echo -e "${RED}IMPORTANTE: Altere a senha após o primeiro login!${NC}"
echo ""
echo -e "Banco de dados:"
echo -e "  Nome: ${YELLOW}$DB_NAME${NC}"
echo -e "  Usuário: ${YELLOW}$DB_USER${NC}"
echo -e "  Senha: ${YELLOW}$DB_PASSWORD${NC}"
echo ""
echo -e "Para verificar os serviços:"
echo -e "  ${YELLOW}pm2 status${NC}"
echo -e "  ${YELLOW}pm2 logs${NC}"
echo ""
echo -e "Para verificar os logs:"
echo -e "  ${YELLOW}tail -f /var/log/postauto/backend-out.log${NC}"
echo -e "  ${YELLOW}tail -f /var/log/postauto/frontend-out.log${NC}"
echo ""

# Verificar status final
log "Status dos serviços:"
systemctl status postgresql --no-pager || true
systemctl status redis-server --no-pager || true
systemctl status nginx --no-pager || true
pm2 status

echo ""
log "Deploy finalizado!"
