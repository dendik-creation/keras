import { NextResponse } from "next/server";

const REPO = "dendik-creation/keras";

// Cache the GitHub response for 1 hour (avoids per-visitor rate limits).
export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "keras-app",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ stars: null }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(
      { stars: typeof data.stargazers_count === "number" ? data.stargazers_count : null },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ stars: null }, { status: 200 });
  }
}
