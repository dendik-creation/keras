import { SubmitResult } from "./submit.service";
import { simulateSubmitSchedules } from "./submit.simulator";
import { createKeepAliveAgent } from "@/lib/server/https-agent";
import { axiosScrapClient } from "@/helper/axios_client";
import { envVariable } from "@/lib/utils";
import { HttpError } from "@/lib/server/http-error";
import * as cheerio from "cheerio";

export interface SubmissionExecutor {
  execute(sessionValue: string, scheduleIds: string[]): Promise<SubmitResult>;
}

export class ProductionSubmissionExecutor implements SubmissionExecutor {
  async execute(sessionValue: string, scheduleIds: string[]): Promise<SubmitResult> {
    const keepAliveAgent = createKeepAliveAgent();
    const headers = {
      Cookie: sessionValue,
      Referer: envVariable.KRS_SCHEDULES_FORM,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const params = new URLSearchParams();
    scheduleIds.forEach((id) => params.append("makul[]", id));

    const submitResponse = await axiosScrapClient.post(
      envVariable.KRS_POST_SCHEDULES,
      params,
      {
        headers,
        httpsAgent: keepAliveAgent,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 500,
      }
    );

    let htmlContent = submitResponse.data;
    if (submitResponse.status === 302 || submitResponse.status === 303) {
      const redirectUrl = submitResponse.headers["location"];
      if (redirectUrl?.includes("login")) {
        throw new HttpError(401, "Session expires di kampus, silakan login ulang");
      }
      if (redirectUrl) {
        const followResponse = await axiosScrapClient.get(redirectUrl, {
          headers: { Cookie: sessionValue },
          httpsAgent: keepAliveAgent,
        });
        htmlContent = followResponse.data;
      }
    }

    const messages = this.parseSubmitMessages(htmlContent);
    const isSuccess = messages.length > 0 || submitResponse.status === 302 || submitResponse.status === 200;

    return { isSuccess, messages, statusCode: submitResponse.status };
  }

  private parseSubmitMessages(htmlContent: string): string[] {
    const $ = cheerio.load(htmlContent);
    const messages: string[] = [];

    $(".alert[role='alert']").each((_, el) => {
      const $alert = $(el);
      const $lists = $alert.find("ul");

      if ($lists.length > 0) {
        $lists.each((__, ul) => {
          const $ul = $(ul);
          const headerText = $ul.prev("p").text().trim().toUpperCase();
          let prefix = "";
          if (headerText.includes("BERHASIL")) {
            prefix = "Kelas Tersimpan : ";
          } else if (
            headerText.includes("BENTROK") ||
            headerText.includes("GAGAL") ||
            headerText.includes("PENUH")
          ) {
            prefix = "Gagal : ";
          }

          $ul.find("li").each((___, li) => {
            const liText = $(li).text().trim();
            if (liText) {
              messages.push(`${prefix}${liText}`);
            }
          });
        });
      } else {
        const divContent = $alert.find("div");
        if (divContent.length > 0) {
          messages.push(divContent.text().trim());
        } else {
          messages.push($alert.text().trim());
        }
      }
    });

    return messages;
  }
}

export class TestSubmissionExecutor implements SubmissionExecutor {
  async execute(sessionValue: string, scheduleIds: string[]): Promise<SubmitResult> {
    return simulateSubmitSchedules(sessionValue, scheduleIds);
  }
}
