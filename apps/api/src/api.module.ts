import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';

import { TypeOrmRootModule } from './config/typeorm.module';

@Module({
  imports: [TypeOrmRootModule],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
