import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('device')
@Index('uk_device_no', ['deviceNo'], { unique: true })
export class DeviceEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'varchar', length: 64 })
  deviceNo: string;

  @Column({ type: 'varchar', length: 32 })
  deviceType: string;

  @Column({ type: 'varchar', length: 16 })
  source: 'REAL' | 'SIMULATED';

  @Column({ type: 'varchar', length: 100 })
  deviceKeyHash: string;

  @Column({ type: 'varchar', length: 16, default: 'UNKNOWN' })
  onlineStatus: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

  @Column({ type: 'datetime', precision: 3, nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'int', nullable: true })
  battery: number | null;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'RETIRED';

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}