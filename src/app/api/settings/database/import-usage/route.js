import { NextResponse } from "next/server";
import { importUsageFromSqlite, importUsageFromJson } from "./importUsage.js";

// POST /api/settings/database/import-usage
// Import HISTORICAL USAGE ONLY (usageHistory rows) from a 9router backup
// (SQLite data.sqlite or the exported JSON backup). Configuration is never
// touched — only usage statistics are merged in, deduped by exact row signature.
export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let result;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
      const bytes = Buffer.from(await file.arrayBuffer());
      result = await importUsageFromSqlite(bytes, file.name || "data.sqlite");
    } else {
      const payload = await request.json();
      result = await importUsageFromJson(payload);
    }
    return NextResponse.json(result);
  } catch (error) {
    console.log("Error importing usage history:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import usage history" },
      { status: 400 }
    );
  }
}
