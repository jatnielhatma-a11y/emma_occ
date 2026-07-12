import { NextResponse } from "next/server";
import { buildProductionHealthReport } from "@/lib/operations/health";
import { errorMessage, logOperationalEvent } from "@/lib/operations/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await buildProductionHealthReport();
    return NextResponse.json(report, {
      status: report.status === "down" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    logOperationalEvent("error", "health_check_failed", { error: errorMessage(error) });
    return NextResponse.json(
      {
        ok: false,
        status: "down",
        checkedAt: new Date().toISOString(),
        error: "Health check failed."
      },
      { status: 503 }
    );
  }
}
