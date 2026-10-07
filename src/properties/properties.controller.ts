import { Controller, Get, HttpStatus, Param, Query } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fail } from "../common/http.util";
import { Property, safeProperty } from "./property.entity";

const SORTS: Record<string, Record<string, "ASC" | "DESC">> = {
  newest: { createdAt: "DESC" },
  price_asc: { price: "ASC" },
  price_desc: { price: "DESC" },
  popular: { views: "DESC" },
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

@Controller("properties")
export class PropertiesController {
  constructor(
    @InjectRepository(Property) private readonly properties: Repository<Property>,
  ) {}

  @Get()
  async list(@Query() query: Record<string, string | undefined>) {
    const q = query.q?.trim();
    const { city, type, purpose, featured } = query;
    const limit = Math.min(Number(query.limit) || 50, 100);
    const order = SORTS[query.sort ?? "newest"] ?? SORTS.newest;

    const qb = this.properties
      .createQueryBuilder("p")
      .where("p.status = :status", { status: "ACTIVE" });

    if (q) {
      const rx = `%${escapeLike(q.slice(0, 80))}%`;
      qb.andWhere(
        "(p.title ILIKE :rx OR p.city ILIKE :rx OR p.district ILIKE :rx OR p.address ILIKE :rx)",
        { rx },
      );
    }
    if (city) qb.andWhere("p.city = :city", { city });
    if (type) qb.andWhere("p.type = :type", { type });
    if (purpose) qb.andWhere("p.purpose = :purpose", { purpose });
    if (featured === "true") qb.andWhere("p.isFeatured = true");

    const [column, direction] = Object.entries(order)[0];
    qb.orderBy(`p.${column}`, direction).take(limit);

    const [properties, total] = await qb.getManyAndCount();

    return {
      ok: true,
      total,
      properties: properties.map((property) => safeProperty(property)),
    };
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const updated = await this.properties
      .createQueryBuilder()
      .update(Property)
      .set({ views: () => '"views" + 1' })
      .where("id = :id AND status = :status", { id, status: "ACTIVE" })
      .returning("*")
      .execute();

    const row = updated.raw[0] as Property | undefined;
    if (!row) {
      fail(HttpStatus.NOT_FOUND, "Property not found");
    }

    return { ok: true, property: safeProperty(row) };
  }
}
