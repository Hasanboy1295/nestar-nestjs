import { Controller, Get, HttpStatus, Req } from "@nestjs/common";
import type { Request } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { requirePayload } from "../common/auth.util";
import { fail } from "../common/http.util";
import { Member, safeMember } from "./member.entity";

@Controller("members")
export class MembersController {
  constructor(
    @InjectRepository(Member) private readonly members: Repository<Member>,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    const payload = await requirePayload(req);

    const authMember = await this.members.findOneBy({ id: payload.sub });
    if (!authMember || authMember.memberStatus === "BLOCKED") {
      fail(HttpStatus.UNAUTHORIZED, "Not authenticated");
    }
    if (authMember.memberType !== "ADMIN") {
      fail(HttpStatus.FORBIDDEN, "Admin privileges required");
    }

    const [members, total] = await Promise.all([
      this.members.find({ order: { createdAt: "DESC" }, take: 50 }),
      this.members.count(),
    ]);

    return {
      ok: true,
      total,
      members: members.map((member) => safeMember(member)),
    };
  }
}
