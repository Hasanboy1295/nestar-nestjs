import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";

function allowedOrigins(): Set<string> {
  const raw =
    process.env.ALLOWED_ORIGINS ??
    "http://localhost:3000,http://localhost:3001";
  return new Set(
    raw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  app.setGlobalPrefix("api");

  const whitelist = allowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || whitelist.has(origin)) callback(null, true);
      else callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  const instance = app.getHttpAdapter().getInstance();
  instance.set("trust proxy", true);

  const port = Number(process.env.PORT) || 3002;
  await app.listen(port, "0.0.0.0");
  console.log(`nestar-nestjs API listening on http://localhost:${port}/api`);
}

void bootstrap();
