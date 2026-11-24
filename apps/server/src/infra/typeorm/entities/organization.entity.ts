import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('organization')
export class OrganizationEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contact: string | null;

  @Column({ type: 'varchar', length: 16, default: 'ENABLED' })
  status: 'ENABLED' | 'DISABLED';

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}