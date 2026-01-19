import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { Admin, Credentials, Prompt, Limits, Usage, Log, Post } from '../database/entities';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST') || 'localhost',
  port: parseInt(configService.get('DB_PORT') || '5432'),
  username: configService.get('DB_USERNAME') || 'postauto',
  password: configService.get('DB_PASSWORD') || 'postauto_secret_password',
  database: configService.get('DB_DATABASE') || 'postauto',
  entities: [Admin, Credentials, Prompt, Limits, Usage, Log, Post],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
});
