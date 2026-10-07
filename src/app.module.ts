import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth/auth.controller";
import { PropertiesController } from "./properties/properties.controller";
import { FavoritesController } from "./favorites/favorites.controller";
import { MembersController } from "./members/members.controller";
import { HealthController } from "./health.controller";
import { Member } from "./members/member.entity";
import { Property } from "./properties/property.entity";

export function getDatabaseUrl(): string {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("Missing DATABASE_URL environment variable");
  }
  return uri;
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: "postgres" as const,
        url: getDatabaseUrl(),
        autoLoadEntities: true,
        synchronize: true,
        ssl:
          process.env.NODE_ENV === "production" &&
          process.env.PG_SSL !== "false"
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    TypeOrmModule.forFeature([Member, Property]),
  ],
  controllers: [
    AuthController,
    PropertiesController,
    FavoritesController,
    MembersController,
    HealthController,
  ],
})
export class AppModule {}
