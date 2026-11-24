import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('sensor_reading')
@Index('idx_device_collected', ['deviceId', 'collectedAt'])
export class SensorReadingEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  deviceId: string;

  @Column({ type: 'datetime', precision: 3 })
  collectedAt: Date;

  @Column({ type: 'datetime', precision: 3 })
  receivedAt: Date;

  @Column({ type: 'varchar', length: 32 })
  metricType: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  metricValue: number;

  @Column({ type: 'varchar', length: 16 })
  quality: 'NORMAL' | 'INVALID';

  @Column({ type: 'tinyint', width: 1 })
  simulated: boolean;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}