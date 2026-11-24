import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('care_event')
@Index('uk_dedup_key', ['dedupKey'], { unique: true })
@Index('idx_elder_status', ['elderId', 'status'])
@Index('idx_org_created', ['orgId', 'createdAt'])
export class CareEventEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'varchar', length: 32 })
  eventType: 'MOISTURE' | 'DEVICE_FAULT';

  @Column({ type: 'varchar', length: 32 })
  status: 'PENDING_CHECK' | 'PROCESSING' | 'COMPLETED' | 'FALSE_ALARM_CLOSED';

  @Column({ type: 'bigint', nullable: true })
  elderId: string | null;

  @Column({ type: 'bigint' })
  deviceId: string;

  @Column({ type: 'bigint', nullable: true })
  careCycleId: string | null;

  @Column({ type: 'json' })
  triggerEvidence: Record<string, unknown>;

  @Column({ type: 'datetime', precision: 3 })
  triggeredAt: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  lastSignalAt: Date | null;

  @Column({ type: 'int', default: 1 })
  signalCount: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  dedupKey: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  falseAlarmReason: string | null;

  @Column({ type: 'tinyint', width: 1 })
  simulated: boolean;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}