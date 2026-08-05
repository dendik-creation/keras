import { sessionCheck } from "@/modules/auth/auth.controller";

export const dynamic = "force-dynamic";

export const GET = sessionCheck;
