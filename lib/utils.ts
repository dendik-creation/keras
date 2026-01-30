import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const KRS_LOGIN_SSO_URL = process.env.KRS_LOGIN_SSO_URL!;
const KRS_DASHBOARD_URL = process.env.KRS_DASHBOARD_URL!;
const KRS_GET_SCHEDULES = process.env.KRS_GET_SCHEDULES!;
const KRS_SUBMIT_SCHEDULES = process.env.KRS_SUBMIT_SCHEDULES!;
export const envVariable = {
  KRS_LOGIN_SSO_URL,
  KRS_DASHBOARD_URL,
  KRS_GET_SCHEDULES,
  KRS_SUBMIT_SCHEDULES,
};
