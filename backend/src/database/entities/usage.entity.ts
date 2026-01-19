import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum UsageType {
  IA_REQUEST = 'ia_request',
  IA_TOKENS = 'ia_tokens',
  IMAGE_GENERATION = 'image_generation',
  POST_CREATION = 'post_creation',
}

@Entity('usage')
export class Usage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: UsageType,
  })
  type: UsageType;

  @Column({ default: 1 })
  count: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
