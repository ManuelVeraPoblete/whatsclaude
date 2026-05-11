import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { setConnectionState } from "@/lib/db";

export async function POST() {
  setConnectionState({
    status: "disconnected",
    qr_string: null,
    phone: null,
  });

  const authDir = path.resolve(process.cwd(), "auth");
  fs.rmSync(authDir, { recursive: true, force: true });

  const restartFlag = path.resolve(process.cwd(), "data", ".restart");
  fs.writeFileSync(restartFlag, "");

  return NextResponse.json({ ok: true });
}
