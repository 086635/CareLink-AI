import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('rule_config')
@Index('uk_org_rule', ['orgId', 'ruleKey'], { unique: true })
export class RuleConfigEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', nullable: true })
  orgId: string | null;

  @Column({ type: 'varchar', length: 64 })
  ruleKey: string;

  @Column({ type: 'json' })
  ruleValue: Record<string, unknown>;

  @Column({ type: 'varchar', length: 256, nullable: true })
  description: string | null;

  @Column({ type: 'bigint', nullable: true })
  updatedById: string | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}