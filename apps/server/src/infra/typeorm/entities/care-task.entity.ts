import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('care_task')
@Index('uk_effective_key', ['effectiveKey'], { unique: true })
@Index('idx_owner_status', ['ownerId', 'status'])
@Index('idx_org_status', ['orgId', 'status'])
@Index('idx_deadline_timeout', ['deadline', 'timeoutFlag'])
export class CareTaskEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'varchar', length: 32 })
  taskType: 'MOISTURE_CARE' | 'DEVICE_CHECK' | 'MANUAL_CHECK';

  @Column({ type: 'varchar', length: 32 })
  status: 'UNASSIGNED' | 'UNCLAIMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

  @Column({ type: 'bigint', nullable: true })
  sourceEventId: string | null;

  @Column({ type: 'bigint', nullable: true })
  createdById: string | null;

  @Column({ type: 'bigint', nullable: true })
  elderId: string | null;

  @Column({ type: 'bigint', nullable: true })
  ownerId: string | null;

  @Column({ type: 'bigint', nullable: true })
  areaLocationId: string | null;

  @Column({ type: 'tinyint' })
  priority: number;

  @Column({ type: 'datetime', precision: 3 })
  deadline: Date;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  timeoutFlag: boolean;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  timeoutAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cancelReason: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  effectiveKey: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  claimedAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  completedAt: Date | null;

  @Column({ type: 'tinyint', width: 1 })
  simulated: boolean;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}