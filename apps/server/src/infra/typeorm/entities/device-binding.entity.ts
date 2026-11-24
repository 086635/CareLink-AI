import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('device_binding')
@Index('uk_device_active', ['deviceId', 'activeKey'], { unique: true })
export class DeviceBindingEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  deviceId: string;

  @Column({ type: 'bigint' })
  elderId: string;

  @Column({ type: 'datetime', precision: 3 })
  startedAt: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  endedAt: Date | null;

  @Column({ type: 'bigint', nullable: true })
  activeKey: string | null;

  @Column({ type: 'bigint' })
  operatorId: string;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}