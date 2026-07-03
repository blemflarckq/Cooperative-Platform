import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * BaseEntity
 * ----------
 * A small shared base class for all TypeORM entities.
 *
 * Why do this?
 * - Consistent primary keys (UUID) across the system
 * - Consistent auditing timestamps for "when created/updated"
 * - Less repetition in every entity class
 *
 * Notes:
 * - We use UUIDs because they work well in distributed/cloud environments.
 * - Timestamps use timestamptz to avoid timezone ambiguity.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}