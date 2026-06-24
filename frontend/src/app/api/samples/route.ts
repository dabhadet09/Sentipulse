import { NextResponse } from "next/server";
import { SAMPLE_DATASETS } from "@/lib/sample-data";

export async function GET() {
  return NextResponse.json({ samples: SAMPLE_DATASETS });
}
