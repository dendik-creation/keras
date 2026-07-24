import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const KRS_LOGIN_SSO_URL = process.env.KRS_LOGIN_SSO_URL!;
const KRS_DASHBOARD_URL = process.env.KRS_DASHBOARD_URL!;
const KRS_GET_SCHEDULES = process.env.KRS_GET_SCHEDULES!;
const KRS_GET_SCHEDULE_DETAIL = process.env.KRS_GET_SCHEDULE_DETAIL!;
const KRS_SCHEDULES_RESULT = process.env.KRS_SCHEDULES_RESULT!;
const KRS_SCHEDULES_FORM = process.env.KRS_SCHEDULES_FORM!;
const KRS_POST_SCHEDULES = process.env.KRS_POST_SCHEDULES!;
const KRS_RELEASE_SCHEDULES = process.env.KRS_RELEASE_SCHEDULES!;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY!;
const SHLINK_BASE_URL = process.env.SHLINK_BASE_URL!;
const SHLINK_API_KEY = process.env.SHLINK_API_KEY!;
const APP_URL = process.env.APP_URL!;
export const envVariable = {
  KRS_LOGIN_SSO_URL,
  KRS_DASHBOARD_URL,
  KRS_GET_SCHEDULES,
  KRS_GET_SCHEDULE_DETAIL,
  KRS_SCHEDULES_RESULT,
  KRS_SCHEDULES_FORM,
  KRS_POST_SCHEDULES,
  KRS_RELEASE_SCHEDULES,
  TURNSTILE_SECRET_KEY,
  SHLINK_BASE_URL,
  SHLINK_API_KEY,
  APP_URL,
};
