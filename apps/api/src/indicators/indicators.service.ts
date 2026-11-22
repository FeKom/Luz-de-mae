import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Indicators } from '@luz-de-mae/shared';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { config } from '../config.js';
import { computeIndicators, parseTabnetCsv, type TabnetTable } from './indicators.js';

const read = (name: string): TabnetTable =>
  parseTabnetCsv(readFileSync(join(config.datasusFolder, `${name}.csv`), 'utf8'));

/** Public DATASUS data does not change while the API runs, so it is computed once. */
@Injectable()
export class IndicatorsService implements OnModuleInit {
  private indicators: Indicators | undefined;

  onModuleInit(): void {
    this.indicators = computeIndicators({
      fetalDeathsByStateYear: read('obitos_fetais_uf_ano'),
      liveBirthsByStateYear: read('nascidos_vivos_uf_ano'),
      fetalDeathsByStateTiming: read('obitos_fetais_relacao_parto_uf'),
      liveBirthsVisitsByApgar: read('nascidos_consultas_x_apgar5'),
      liveBirthsVisitsByYear: read('nascidos_consultas_prenatal_ano'),
    });
  }

  get(): Indicators {
    if (this.indicators === undefined) throw new Error('indicators not loaded');
    return this.indicators;
  }
}
