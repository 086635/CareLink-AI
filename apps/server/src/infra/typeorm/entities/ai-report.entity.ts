import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('ai_report')
@Index('idx_org_type', ['orgId', 'type'])
@Index('idx_elder', ['elderId'])
export class AiReportEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'varchar', length: 32 })
  type: 'HANDOVER_SUMMARY' | 'CARE_REPORT' | 'ANOMALY_HINT';

  @Column({ type: 'bigint', nullable: true })
  elderId: string | null;

  @Column({ type: 'json' })
  content: Record<string, unknown>;

  @Column({ type: 'json' })
  dataRange: Record<string, unknown>;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  insufficientFlag: boolean;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  degradedFlag: boolean;

  @Column({ type: 'varchar', length: 8, default: 'AI' })
  source: 'AI';

  @Column({ type: 'bigint', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}