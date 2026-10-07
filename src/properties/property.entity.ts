import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "listings" })
export class Property {
  @PrimaryColumn({ type: "varchar", length: 24 })
  id: string;

  @Column({ type: "varchar", length: 140 })
  title: string;

  @Column({ type: "varchar", length: 16, default: "APARTMENT" })
  type: string;

  @Column({ type: "varchar", length: 8, default: "SALE" })
  purpose: string;

  @Column({ type: "double precision" })
  price: number;

  @Column({ type: "varchar", length: 8, default: "USD" })
  currency: string;

  @Column({ type: "varchar", length: 100, default: "Tashkent" })
  city: string;

  @Column({ type: "varchar", length: 100, default: "" })
  district: string;

  @Column({ type: "varchar", length: 255, default: "" })
  address: string;

  @Column({ type: "integer", default: 1 })
  beds: number;

  @Column({ type: "integer", default: 1 })
  baths: number;

  @Column({ type: "double precision", default: 0 })
  area: number;

  @Column({ type: "text", default: "" })
  description: string;

  @Column({ type: "varchar", length: 300, default: "" })
  image: string;

  @Column({ type: "text", array: true, default: () => "'{}'" })
  features: string[];

  @Column({ type: "boolean", default: false })
  isFeatured: boolean;

  @Column({ type: "integer", default: 0 })
  views: number;

  @Column({ type: "varchar", length: 100, default: "" })
  agentName: string;

  @Column({ type: "varchar", length: 50, default: "" })
  agentNick: string;

  @Column({ type: "varchar", length: 50, default: "" })
  agentPhone: string;

  @Column({ type: "varchar", length: 8, default: "ACTIVE" })
  status: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}

export interface SafeProperty {
  id: string;
  title: string;
  type: string;
  purpose: string;
  price: number;
  currency: string;
  city: string;
  district: string;
  address: string;
  beds: number;
  baths: number;
  area: number;
  description: string;
  image: string;
  features: string[];
  isFeatured: boolean;
  views: number;
  agentName: string;
  agentNick: string;
  agentPhone: string;
  status: string;
  createdAt: string;
}

export function safeProperty(property: Property): SafeProperty {
  return {
    id: property.id,
    title: property.title,
    type: property.type,
    purpose: property.purpose,
    price: property.price,
    currency: property.currency ?? "USD",
    city: property.city,
    district: property.district ?? "",
    address: property.address ?? "",
    beds: property.beds ?? 0,
    baths: property.baths ?? 0,
    area: property.area ?? 0,
    description: property.description ?? "",
    image: property.image ?? "",
    features: property.features ?? [],
    isFeatured: Boolean(property.isFeatured),
    views: property.views ?? 0,
    agentName: property.agentName ?? "",
    agentNick: property.agentNick ?? "",
    agentPhone: property.agentPhone ?? "",
    status: property.status,
    createdAt: new Date(property.createdAt).toISOString(),
  };
}
