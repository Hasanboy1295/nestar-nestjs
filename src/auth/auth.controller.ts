import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  clearAuthCookie,
  comparePassword,
  hashPassword,
  requirePayload,
  setAuthCookie,
  signToken,
} from "../common/auth.util";
import { newId } from "../common/id";
import { clientIp, fail, rateLimit, tooManyAttempts } from "../common/http.util";
import { Member, safeMember } from "../members/member.entity";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Controller("auth")
export class AuthController {
  constructor(
    @InjectRepository(Member) private readonly members: Repository<Member>,
  ) {}

  @Post("register")
  async register(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: Record<string, unknown>,
  ) {
    const ip = clientIp(req);
    if (!rateLimit(`register:${ip}`, 10, 60_000)) tooManyAttempts();

    if (!body || typeof body !== "object") {
      fail(HttpStatus.BAD_REQUEST, "Invalid request body");
    }

    const memberFullName = String(body.memberFullName ?? "").trim();
    const memberNick = String(body.memberNick ?? "").trim().toLowerCase();
    const memberEmail = String(body.memberEmail ?? "").trim().toLowerCase();
    const memberPassword = String(body.memberPassword ?? "");

    if (memberNick.length < 3 || memberNick.length > 30) {
      fail(HttpStatus.BAD_REQUEST, "Nickname must be between 3 and 30 characters");
    }
    if (!/^[a-z0-9._]+$/.test(memberNick)) {
      fail(
        HttpStatus.BAD_REQUEST,
        "Nickname may only contain letters, numbers, dots and underscores",
      );
    }
    if (!EMAIL_RE.test(memberEmail)) {
      fail(HttpStatus.BAD_REQUEST, "Please enter a valid email address");
    }
    if (memberPassword.length < 6) {
      fail(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters long");
    }

    const existing = await this.members.findOne({
      where: [{ memberEmail }, { memberNick }],
    });

    if (existing) {
      fail(HttpStatus.CONFLICT, "Email or nickname is already taken");
    }

    const totalMembers = await this.members.count();

    const member = await this.members.save({
      id: newId(),
      memberNick,
      memberEmail,
      memberFullName,
      memberPassword: await hashPassword(memberPassword),
      memberType: totalMembers === 0 ? "ADMIN" : "USER",
      memberAuthType: "EMAIL",
    });

    const token = await signToken({
      sub: member.id,
      memberNick: member.memberNick,
      memberEmail: member.memberEmail,
      memberType: member.memberType,
      memberFullName: member.memberFullName,
    });

    setAuthCookie(res, token);
    res.status(HttpStatus.CREATED).json({ ok: true, member: safeMember(member) });
  }

  @Post("login")
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: Record<string, unknown>,
  ) {
    if (!body || typeof body !== "object") {
      fail(HttpStatus.BAD_REQUEST, "Invalid request body");
    }

    const identifier = String(body.identifier ?? "").trim().toLowerCase();
    const memberPassword = String(body.memberPassword ?? "");

    if (!identifier || !memberPassword) {
      fail(HttpStatus.BAD_REQUEST, "Enter your credentials");
    }

    const ip = clientIp(req);
    if (!rateLimit(`login:${ip}:${identifier}`, 10, 60_000)) tooManyAttempts();

    const member = await this.members.findOne({
      where: [{ memberEmail: identifier }, { memberNick: identifier }],
    });

    if (!member) {
      fail(HttpStatus.UNAUTHORIZED, "Invalid email/nickname or password");
    }

    const valid = await comparePassword(memberPassword, member.memberPassword);
    if (!valid) {
      fail(HttpStatus.UNAUTHORIZED, "Invalid email/nickname or password");
    }

    if (member.memberStatus === "BLOCKED") {
      fail(HttpStatus.FORBIDDEN, "This account has been blocked");
    }

    const token = await signToken({
      sub: member.id,
      memberNick: member.memberNick,
      memberEmail: member.memberEmail,
      memberType: member.memberType,
      memberFullName: member.memberFullName,
    });

    setAuthCookie(res, token);
    res.json({ ok: true, member: safeMember(member) });
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res);
    return { ok: true, message: "Logged out" };
  }

  @Get("me")
  async me(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = await requirePayload(req);

    const member = await this.members.findOneBy({ id: payload.sub });
    if (!member || member.memberStatus === "BLOCKED") {
      clearAuthCookie(res);
      throw new HttpException(
        { ok: false, error: "Session expired. Please sign in again." },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return { ok: true, member: safeMember(member) };
  }

  @Patch("me")
  async updateMe(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: Record<string, unknown>,
  ) {
    const payload = await requirePayload(req);

    const member = await this.members.findOneBy({ id: payload.sub });

    if (!member || member.memberStatus === "BLOCKED") {
      clearAuthCookie(res);
      throw new HttpException(
        { ok: false, error: "Not authenticated" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!body || typeof body !== "object") {
      fail(HttpStatus.BAD_REQUEST, "Invalid request body");
    }

    const hasName = typeof body.memberFullName === "string";
    const hasDesc = typeof body.memberDesc === "string";
    const hasPassword =
      typeof body.newPassword === "string" ||
      typeof body.currentPassword === "string";

    if (!hasName && !hasDesc && !hasPassword) {
      fail(HttpStatus.BAD_REQUEST, "Nothing to update");
    }

    if (hasName) {
      const name = String(body.memberFullName).trim();
      if (name.length > 80) {
        fail(HttpStatus.BAD_REQUEST, "Name is too long");
      }
      member.memberFullName = name;
    }

    if (hasDesc) {
      const desc = String(body.memberDesc).trim();
      if (desc.length > 500) {
        fail(HttpStatus.BAD_REQUEST, "Description is too long");
      }
      member.memberDesc = desc;
    }

    if (hasPassword) {
      const currentPassword = String(body.currentPassword ?? "");
      const newPassword = String(body.newPassword ?? "");

      if (!currentPassword || !newPassword) {
        fail(HttpStatus.BAD_REQUEST, "Enter current and new password");
      }
      if (newPassword.length < 6) {
        fail(
          HttpStatus.BAD_REQUEST,
          "Password must be at least 6 characters long",
        );
      }

      const valid = await comparePassword(currentPassword, member.memberPassword);
      if (!valid) {
        fail(HttpStatus.FORBIDDEN, "Current password is incorrect");
      }

      member.memberPassword = await hashPassword(newPassword);
      member.memberAuthType = "EMAIL";
    }

    await this.members.save(member);

    return { ok: true, member: safeMember(member) };
  }
}
