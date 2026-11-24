import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('elder')
@Index('idx_org_status', ['orgId', 'status'])
export class ElderEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 8 })
  gender: 'MALE' | 'FEMALE';

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'bigint', nullable: true })
  bedLocationId: string | null;

  @Column({ type: 'tinyint' })
  careLevel: number;

  @Column({ type: 'varchar', length: 16 })
  mobility: 'BEDRIDDEN' | 'LIMITED' | 'MOBILE';

  @Column({ type: 'varchar', length: 500, nullable: true })
  careNotes: string | null;

  @Column({ type: 'varchar', length: 16, default: 'IN_CARE' })
  status: 'IN_CARE' | 'ARCHIVED';

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}