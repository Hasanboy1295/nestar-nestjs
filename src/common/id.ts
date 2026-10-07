import { randomBytes } from "crypto";

/** Same format as MongoDB ObjectId — keeps API ids unchanged. */
export function newId(): string {
  return randomBytes(12).toString("hex");
}
