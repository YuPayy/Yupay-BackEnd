#!/usr/bin/env node
/**
 * scripts/generate-postman.ts
 *
 * Generate Postman collection + environment from running OpenAPI spec.
 * Cara pakai:
 *   1. Start server: npm run dev (or compile + start)
 *   2. Run: npx tsx scripts/generate-postman.ts
 *   3. Output: postman/Yupay.postman_collection.json + postman/Yupay.local.postman_environment.json
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { SchemaPack } from "openapi-to-postmanv2";

const SPEC_URL = process.env.SPEC_URL || "http://localhost:3000/api/docs.json";
const OUT_DIR = join(process.cwd(), "postman");
const COLLECTION_FILE = join(OUT_DIR, "Yupay.postman_collection.json");
const ENV_FILE = join(OUT_DIR, "Yupay.local.postman_environment.json");

async function main() {
  console.log(`Fetching OpenAPI spec from ${SPEC_URL}...`);
  const res = await fetch(SPEC_URL);
  if (!res.ok) {
    console.error(`Failed: ${res.status} ${res.statusText}`);
    console.error("Pastikan server jalan di localhost:3000");
    process.exit(1);
  }
  const spec = (await res.json()) as object;
  console.log(`✓ Got spec: ${(spec as any).info?.title} v${(spec as any).info?.version}`);

  console.log("Converting to Postman v2.1...");
  const pack = new SchemaPack({ type: "json", data: spec } as any);
  const converted = await new Promise<{
    status?: boolean;
    message?: string;
    reason?: string;
    output: { type: string; data: any }[];
  }>((resolve, reject) => {
    pack.convert((err: any, result: any) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const isSuccess =
    converted.status === true ||
    (converted.output?.[0]?.data?.item?.length ?? 0) > 0;

  if (!isSuccess) {
    console.error("Conversion failed");
    console.error(JSON.stringify(converted, null, 2).slice(0, 1000));
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(COLLECTION_FILE, JSON.stringify(converted.output[0].data, null, 2));
  console.log(`✓ Collection: ${COLLECTION_FILE}`);

  const env = {
    id: "yupay-local-env",
    name: "Yupay Local",
    values: [
      { key: "base_url", value: "http://localhost:3000", enabled: true },
      { key: "bearerToken", value: "", enabled: true },
      { key: "ocr_service_url", value: "http://localhost:5057", enabled: true },
    ],
    _postman_variable_scope: "environment",
  };
  writeFileSync(ENV_FILE, JSON.stringify(env, null, 2));
  console.log(`✓ Environment: ${ENV_FILE}`);

  const collectionStats = JSON.parse(
    require("fs").readFileSync(COLLECTION_FILE, "utf8")
  );
  const itemCount =
    collectionStats.item?.reduce(
      (sum: number, folder: any) =>
        sum + (folder.item?.length || 0) + (folder.item ? 0 : 1),
      0
    ) || 0;
  console.log(`\n📦 Total requests: ${itemCount}`);
  console.log("Import ke Postman:");
  console.log("  1. File → Import → Upload Files");
  console.log("  2. Pilih kedua file di folder postman/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
