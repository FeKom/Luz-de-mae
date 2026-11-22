import type { Indicators } from '@luz-de-mae/shared';
import { Controller, Get } from '@nestjs/common';
import { IndicatorsService } from './indicators.service.js';

@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly indicators: IndicatorsService) {}

  @Get()
  get(): Indicators {
    return this.indicators.get();
  }
}
