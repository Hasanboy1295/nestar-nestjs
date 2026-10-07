// Migrate data from MongoDB (source) to PostgreSQL (target), keeping ids.
// Usage: node --env-file=.env scripts/migrate.mjs
//   MONGO_URI / MONGO_DEV / MONGO_PROD  — source (MongoDB connection string)
//   DATABASE_URL                        — target (PostgreSQL connection string)

import { MongoClient } from "mongodb";
import pgpkg from "pg";

const { Pool } = pgpkg;

const mongoUri =
  process.env.MONGO_URI ?? process.env.MONGO_PROD ?? process.env.MONGO_DEV;
const pgUrl = process.env.DATABASE_URL;

if (!mongoUri || !pgUrl) {
  console.error("Missing MONGO_URI/MONGO_DEV/MONGO_PROD or DATABASE_URL");
  process.exit(1);
}

const mongo = new MongoClient(mongoUri);
await mongo.connect();

const sourceDb = mongo.db(mongoUri.split("/").pop().split("?")[0]);
const pool = new Pool({ connectionString: pgUrl });

const members = await sourceDb.collection("members").find({}).toArray();
const listings = await sourceDb
  .collection("listings")
  .find({ title: { $exists: true } })
  .toArray();

console.log(`source: members=${members.length} listings=${listings.length}`);

const client = await pool.connect();
try {
  await client.query("BEGIN");

  for (const m of members) {
    await client.query(
      `INSERT INTO members (
         id, "memberType", "memberStatus", "memberAuthType",
         "memberNick", "memberEmail", "memberPassword",
         "memberFullName", "memberImage", "memberDesc", "memberPoints",
         "memberFavorites", "createdAt", "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO NOTHING`,
      [
        String(m._id),
        m.memberType ?? "USER",
        m.memberStatus ?? "ACTIVE",
        m.memberAuthType ?? "EMAIL",
        m.memberNick,
        m.memberEmail,
        m.memberPassword,
        m.memberFullName ?? "",
        m.memberImage ?? "",
        m.memberDesc ?? "",
        m.memberPoints ?? 0,
        (m.memberFavorites ?? []).map((f) => String(f)),
        m.createdAt ?? new Date(),
        m.updatedAt ?? new Date(),
      ],
    );
  }

  for (const p of listings) {
    await client.query(
      `INSERT INTO listings (
         id, title, type, purpose, price, currency, city, district, address,
         beds, baths, area, description, image, features, "isFeatured", views,
         "agentName", "agentNick", "agentPhone", status, "createdAt", "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       ON CONFLICT (id) DO NOTHING`,
      [
        String(p._id),
        p.title,
        p.type ?? "APARTMENT",
        p.purpose ?? "SALE",
        p.price ?? 0,
        p.currency ?? "USD",
        p.city ?? "Tashkent",
        p.district ?? "",
        p.address ?? "",
        p.beds ?? 1,
        p.baths ?? 1,
        p.area ?? 0,
        p.description ?? "",
        p.image ?? "",
        p.features ?? [],
        Boolean(p.isFeatured),
        p.views ?? 0,
        p.agentName ?? "",
        p.agentNick ?? "",
        p.agentPhone ?? "",
        p.status ?? "ACTIVE",
        p.createdAt ?? new Date(),
        p.updatedAt ?? new Date(),
      ],
    );
  }

  await client.query("COMMIT");
  console.log(`migrated: ${members.length} members, ${listings.length} listings`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
  await mongo.close();
}
