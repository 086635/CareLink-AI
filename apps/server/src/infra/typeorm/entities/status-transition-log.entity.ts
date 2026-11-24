import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('status_transition_log')
@Index('idx_entity', ['entityType', 'entityId'])
export class StatusTransitionLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 8 })
  entityType: 'EVENT' | 'TASK';

  @Column({ type: 'bigint' })
  entityId: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  fromStatus: string | null;

  @Column({ type: 'varchar', length: 32 })
  toStatus: string;

  @Column({ type: 'bigint', nullable: true })
  operatorId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}