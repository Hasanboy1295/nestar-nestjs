import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "members" })
export class Member {
  @PrimaryColumn({ type: "varchar", length: 24 })
  id: string;

  @Column({ type: "varchar", length: 16, default: "USER" })
  memberType: string;

  @Column({ type: "varchar", length: 16, default: "ACTIVE" })
  memberStatus: string;

  @Column({ type: "varchar", length: 16, default: "EMAIL" })
  memberAuthType: string;

  @Column({ type: "varchar", length: 30, unique: true })
  memberNick: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: true })
  memberEmail: string | null;

  @Column({ type: "varchar", length: 255 })
  memberPassword: string;

  @Column({ type: "varchar", length: 80, default: "" })
  memberFullName: string;

  @Column({ type: "varchar", length: 500, default: "" })
  memberImage: string;

  @Column({ type: "varchar", length: 500, default: "" })
  memberDesc: string;

  @Column({ type: "integer", default: 0 })
  memberPoints: number;

  @Column({ type: "text", array: true, default: () => "'{}'" })
  memberFavorites: string[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}

export interface SafeMember {
  id: string;
  memberNick: string;
  memberEmail: string | null;
  memberFullName: string;
  memberImage: string;
  memberDesc: string;
  memberType: string;
  memberStatus: string;
  memberAuthType: string;
  memberPoints: number;
  createdAt: string;
}

export function safeMember(member: Member): SafeMember {
  return {
    id: member.id,
    memberNick: member.memberNick,
    memberEmail: member.memberEmail,
    memberFullName: member.memberFullName ?? "",
    memberImage: member.memberImage ?? "",
    memberDesc: member.memberDesc ?? "",
    memberType: member.memberType,
    memberStatus: member.memberStatus,
    memberAuthType: member.memberAuthType,
    memberPoints: member.memberPoints ?? 0,
    createdAt: new Date(member.createdAt).toISOString(),
  };
}
