import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('care_record')
@Index('idx_elder_executed', ['elderId', 'executedAt'])
@Index('idx_executor_executed', ['executorId', 'executedAt'])
export class CareRecordEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'bigint' })
  taskId: string;

  @Column({ type: 'bigint', nullable: true })
  eventId: string | null;

  @Column({ type: 'bigint' })
  elderId: string;

  @Column({ type: 'bigint', nullable: true })
  deviceId: string | null;

  @Column({ type: 'bigint' })
  executorId: string;

  @Column({ type: 'datetime', precision: 3 })
  executedAt: Date;

  @Column({ type: 'varchar', length: 32 })
  checkResult: 'CONFIRMED_MOISTURE' | 'NO_CHANGE_NEEDED' | 'FALSE_ALARM' | 'NEED_FURTHER';

  @Column({ type: 'varchar', length: 32, nullable: true })
  careResult: 'CHANGED' | 'NEED_FURTHER' | null;

  @Column({ type: 'tinyint', width: 1, nullable: true })
  skinAbnormal: boolean | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ type: 'tinyint', width: 1 })
  simulated: boolean;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}