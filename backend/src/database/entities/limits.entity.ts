import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('limits')
export class Limits {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 10 })
  requestsPerHour: number;

  @Column({ default: 50000 })
  tokensPerHour: number;

  @Column({ default: 50 })
  imagesPerDay: number;

  @Column({ default: 5 })
  postsPerHour: number;

  @Column({ default: 60 })
  cooldownSeconds: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
