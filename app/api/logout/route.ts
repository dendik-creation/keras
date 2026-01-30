import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("external_session");
    return NextResponse.json({
      success: true,
      message: "Logout sukses",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal melakukan logout" },
      { status: 500 },
    );
  }
}
