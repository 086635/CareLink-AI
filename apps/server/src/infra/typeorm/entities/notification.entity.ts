import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('notification')
@Index('idx_receiver_read', ['receiverId', 'isRead', 'createdAt'])
export class NotificationEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'bigint' })
  receiverId: string;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'varchar', length: 128 })
  title: string;

  @Column({ type: 'json' })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 32 })
  relatedType: string;

  @Column({ type: 'bigint' })
  relatedId: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  isRead: boolean;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}