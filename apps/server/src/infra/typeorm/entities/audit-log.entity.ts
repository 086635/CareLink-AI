import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_log')
@Index('idx_org_created', ['orgId', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'bigint', nullable: true })
  operatorId: string | null;

  @Column({ type: 'varchar', length: 32 })
  objectType: string;

  @Column({ type: 'bigint', nullable: true })
  objectId: string | null;

  @Column({ type: 'varchar', length: 32 })
  action: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  summary: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}