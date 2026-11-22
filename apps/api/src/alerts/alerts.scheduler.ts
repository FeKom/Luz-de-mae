import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertsService } from './alerts.service.js';

/** Runs the active-search scan on start and every 10 minutes, off the request path. */
@Injectable()
export class AlertsScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(AlertsScheduler.name);

  constructor(private readonly alerts: AlertsService) {}

  onApplicationBootstrap(): void {
    this.run();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  run(): void {
    const result = this.alerts.scan();
    if (result.missedAppointments + result.latePrenatal > 0) {
      this.logger.log(
        `Busca ativa: ${result.missedAppointments} falta(s), ${result.latePrenatal} pré-natal(is) atrasado(s)`,
      );
    }
  }
}
