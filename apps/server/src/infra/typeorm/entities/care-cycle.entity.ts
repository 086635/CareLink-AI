import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('care_cycle')
@Index('idx_device_ended', ['deviceId', 'endedAt'])
export class CareCycleEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  elderId: string;

  @Column({ type: 'bigint' })
  deviceId: string;

  @Column({ type: 'datetime', precision: 3 })
  startedAt: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  endedAt: Date | null;

  @Column({ type: 'varchar', length: 16 })
  status: 'ACTIVE' | 'CLOSED';

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}