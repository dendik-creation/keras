import {
  deleteSubmit,
  postSubmit,
  syncSubmit,
} from "@/modules/submit/submit.controller";

export const dynamic = "force-dynamic";

export const GET = syncSubmit;
export const POST = postSubmit;
export const DELETE = deleteSubmit;
