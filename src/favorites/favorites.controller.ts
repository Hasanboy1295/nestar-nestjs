import { Controller, Get, HttpStatus, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { requirePayload } from "../common/auth.util";
import { fail } from "../common/http.util";
import { Member } from "../members/member.entity";
import { Property, safeProperty } from "../properties/property.entity";

@Controller("favorites")
export class FavoritesController {
  constructor(
    @InjectRepository(Member) private readonly members: Repository<Member>,
    @InjectRepository(Property) private readonly properties: Repository<Property>,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    const payload = await requirePayload(req);

    const member = await this.members.findOneBy({ id: payload.sub });
    if (!member || member.memberStatus === "BLOCKED") {
      fail(HttpStatus.UNAUTHORIZED, "Not authenticated");
    }

    const favorites = member.memberFavorites ?? [];
    const properties = favorites.length
      ? await this.properties.find({
          where: { id: In(favorites) },
          order: { createdAt: "DESC" },
        })
      : [];

    return {
      ok: true,
      properties: properties.map((property) => safeProperty(property)),
    };
  }

  @Post(":id")
  async toggle(@Param("id") id: string, @Req() req: Request) {
    const payload = await requirePayload(req);

    const property = await this.properties.findOneBy({ id });
    if (!property) {
      fail(HttpStatus.NOT_FOUND, "Property not found");
    }

    const member = await this.members.findOneBy({ id: payload.sub });
    if (!member || member.memberStatus === "BLOCKED") {
      fail(HttpStatus.UNAUTHORIZED, "Not authenticated");
    }

    const favorites = member.memberFavorites ?? [];
    const alreadyFavorite = favorites.includes(id);

    if (alreadyFavorite) {
      member.memberFavorites = favorites.filter((favoriteId) => favoriteId !== id);
    } else {
      member.memberFavorites = [...favorites, id];
    }
    await this.members.save(member);

    return { ok: true, favorite: !alreadyFavorite };
  }
}
