import { Module } from '@nestjs/common';
import { IndicatorsController } from './indicators.controller.js';
import { IndicatorsService } from './indicators.service.js';

@Module({
  controllers: [IndicatorsController],
  providers: [IndicatorsService],
})
export class IndicatorsModule {}
