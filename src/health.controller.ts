import { Controller, Get, HttpStatus } from "@nestjs/common";
import { DataSource } from "typeorm";
import { fail } from "./common/http.util";

@Controller("health")
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  health() {
    if (!this.dataSource.isInitialized) {
      fail(HttpStatus.SERVICE_UNAVAILABLE, "Database unavailable");
    }
    return {
      ok: true,
      service: "nestar-nestjs",
      db: "connected",
      time: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }
}
