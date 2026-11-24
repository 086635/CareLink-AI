import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('caregiver')
@Index('uk_org_account', ['orgId', 'account'], { unique: true })
export class CaregiverEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 64 })
  account: string;

  @Column({ type: 'varchar', length: 100 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 8 })
  role: 'ADM' | 'SUP' | 'CG';

  @Column({ type: 'tinyint', width: 1, default: 1 })
  onDuty: boolean;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'DISABLED';

  @Column({ type: 'bigint', nullable: true })
  areaLocationId: string | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}