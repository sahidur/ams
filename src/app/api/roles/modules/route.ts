import { NextResponse } from "next/server";
import { SYSTEM_MODULES } from "../route";

// GET all system modules
export async function GET() {
  return NextResponse.json(SYSTEM_MODULES);
}
