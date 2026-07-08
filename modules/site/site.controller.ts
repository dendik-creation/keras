import { NextResponse } from "next/server";
import { getSiteStatus } from "@/modules/site/site.service";

/** GET /api/site-off-check */
export async function siteOffCheck() {
  try {
    const status = await getSiteStatus();
    return NextResponse.json(status, { status: 200 });
  } catch (err) {
    console.error("Error check site off:", err);
    return NextResponse.json(
      { message: "Gagal pengecekan site off" },
      { status: 500 },
    );
  }
}
