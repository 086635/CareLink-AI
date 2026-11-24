import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('handover')
@Index('idx_org_handed', ['orgId', 'handedOverAt'])
export class HandoverEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'datetime', precision: 3 })
  shiftFrom: Date;

  @Column({ type: 'datetime', precision: 3 })
  shiftTo: Date;

  @Column({ type: 'bigint' })
  fromCaregiverId: string;

  @Column({ type: 'bigint' })
  toCaregiverId: string;

  @Column({ type: 'datetime', precision: 3 })
  handedOverAt: Date;

  @Column({ type: 'bigint', nullable: true })
  aiReportId: string | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}