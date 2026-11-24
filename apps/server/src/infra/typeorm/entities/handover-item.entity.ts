import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('handover_item')
@Index('idx_handover', ['handoverId'])
@Index('idx_task', ['taskId'])
export class HandoverItemEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  handoverId: string;

  @Column({ type: 'bigint' })
  taskId: string;

  @Column({ type: 'bigint', nullable: true })
  ownerBefore: string | null;

  @Column({ type: 'bigint', nullable: true })
  ownerAfter: string | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}