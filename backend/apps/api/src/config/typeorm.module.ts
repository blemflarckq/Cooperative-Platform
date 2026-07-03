import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './typeorm.datasource';

/**
 * TypeOrmModule config for Nest runtime.
 * We reuse the AppDataSource options so config stays consistent between:
 * - migrations (CLI)
 * - runtime (Nest)
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      // Nest expects some options at root; AppDataSource.options includes them already.
      // You can turn on logging locally if you like:
      // logging: true,
      autoLoadEntities: true, // ✅ Nest will auto register entities used in modules
    }),
  ],
})
export class TypeOrmRootModule {}
