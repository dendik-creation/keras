import * as cheerio from "cheerio";
import { envVariable } from "@/lib/utils";
import { axiosScrapClient } from "@/helper/axios_client";

export type SiteStatus = {
  isSiteOff: boolean;
  deadline: string;
};

/**
 * Check whether the KRS site is in "Site Off" mode (maintenance / not yet
 * open) and read the countdown deadline if present.
 */
export async function getSiteStatus(): Promise<SiteStatus> {
  const response = await axiosScrapClient.get(envVariable.KRS_DASHBOARD_URL, {
    headers: {
      Referer: envVariable.KRS_LOGIN_SSO_URL,
      Origin: new URL(envVariable.KRS_LOGIN_SSO_URL).origin,
    },
  });

  const htmlContent = cheerio.load(response.data);
  const title = htmlContent("title").text();
  const deadlineValue = htmlContent("#deadline").attr("value")?.trim() ?? "";

  const isSiteOff = title.includes("Site Off") || deadlineValue != "";

  return { isSiteOff, deadline: deadlineValue };
}
