import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PostStatus {
  PENDING_TEXT = 'pending_text',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  GENERATING_IMAGES = 'generating_images',
  READY = 'ready',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  ERROR = 'error',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subject: string;

  @Column({ type: 'text', nullable: true })
  generatedText: string;

  @Column({ type: 'text', nullable: true })
  htmlContent: string;

  @Column({ type: 'jsonb', nullable: true })
  imagePrompts: string[];

  @Column({ type: 'jsonb', nullable: true })
  generatedImages: string[];

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.PENDING_TEXT,
  })
  status: PostStatus;

  @Column({ nullable: true })
  wordpressPostId: string;

  @Column({ nullable: true })
  wordpressUrl: string;

  @Column({ nullable: true })
  telegramMessageId: string;

  @Column({ type: 'int', default: 0 })
  tokensUsed: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
