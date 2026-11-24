import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('care_location')
@Index('uk_parent_name', ['parentId', 'name'], { unique: true })
@Index('uk_current_elder', ['currentElderId'], { unique: true })
export class CareLocationEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  orgId: string;

  @Column({ type: 'bigint', nullable: true })
  parentId: string | null;

  @Column({ type: 'varchar', length: 16 })
  level: 'BUILDING' | 'FLOOR' | 'ROOM' | 'BED';

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  bedStatus: 'FREE' | 'OCCUPIED' | null;

  @Column({ type: 'bigint', nullable: true })
  currentElderId: string | null;

  @ManyToOne(() => CareLocationEntity, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: CareLocationEntity | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}