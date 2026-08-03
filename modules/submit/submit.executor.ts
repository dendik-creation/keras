import { SubmitResult, SubmitMessage } from "./submit.service";
import { simulateSubmitSchedules } from "./submit.simulator";
import { createKeepAliveAgent } from "@/lib/server/https-agent";
import { axiosScrapClient } from "@/helper/axios_client";
import { envVariable } from "@/lib/utils";
import { HttpError } from "@/lib/server/http-error";
import * as cheerio from "cheerio";
import { ResilienceEngine } from "./submit.resilience";

// Chaos testing configuration
const CHAOS_MODE = process.env.WAR_CHAOS_MODE_ENABLED === "true";
const CHAOS_504_PROBABILITY = 0.2; // 20% chance of 504

async function maybeInjectChaos() {
  if (!CHAOS_MODE) return;
  if (Math.random() < CHAOS_504_PROBABILITY) {
    throw new Error("CHAOS_INDUCED_TIMEOUT");
  }
}

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

    const adaptiveTimeout = await ResilienceEngine.getAdaptiveTimeout();

    let submitResponse;
    const startMs = Date.now();
    try {
      await maybeInjectChaos();

      submitResponse = await axiosScrapClient.post(
        envVariable.KRS_POST_SCHEDULES,
        params,
        {
          headers,
          httpsAgent: keepAliveAgent,
          maxRedirects: 0,
          timeout: adaptiveTimeout,
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );
    } catch (error: any) {
      await ResilienceEngine.recordFailure();
      const isChaos = error?.message === "CHAOS_INDUCED_TIMEOUT";
      const messages: SubmitMessage[] = [{
        type: "error",
        title: "Timeout",
        items: scheduleIds.map(id => `[ID ${id}] Koneksi timeout atau terputus${isChaos ? " (CHAOS)" : ""}`)
      }];
      return { isSuccess: false, messages, statusCode: 504 };
    }

    let htmlContent = submitResponse.data;
    if (submitResponse.status === 302 || submitResponse.status === 303) {
      const redirectUrl = submitResponse.headers["location"];
      if (redirectUrl?.includes("login")) {
        throw new HttpError(401, "Session expires di kampus, silakan login ulang");
      }
      if (redirectUrl) {
        try {
          const followResponse = await axiosScrapClient.get(redirectUrl, {
            headers: { Cookie: sessionValue },
            httpsAgent: keepAliveAgent,
          });
          htmlContent = followResponse.data;
        } catch (followError: any) {
          const messages: SubmitMessage[] = [{
            type: "error",
            title: "Timeout",
            items: scheduleIds.map(id => `[ID ${id}] Timeout saat verifikasi redirect`)
          }];
          return { isSuccess: false, messages, statusCode: 504 };
        }
      }
    }

    const messages = this.parseSubmitMessages(htmlContent);
    const isSuccess = messages.length > 0 || submitResponse.status === 302 || submitResponse.status === 200;

    const latencyMs = Date.now() - startMs;
    await ResilienceEngine.recordSuccess(latencyMs);

    return { isSuccess, messages, statusCode: submitResponse.status };
  }

  private parseSubmitMessages(htmlContent: string): SubmitMessage[] {
    const $ = cheerio.load(htmlContent);
    const messages: SubmitMessage[] = [];

    $(".alert[role='alert']").each((_, el) => {
      const $alert = $(el);
      const $lists = $alert.find("ul");

      if ($lists.length > 0) {
        $lists.each((__, ul) => {
          const $ul = $(ul);
          const headerText = $ul.prev("p").text().trim().toUpperCase();
          let type: "success" | "warning" | "error" = "error";
          if (headerText.includes("BERHASIL")) {
            type = "success";
          } else if (headerText.includes("PENUH") || headerText.includes("BENTROK")) {
            type = "warning";
          }

          const items: string[] = [];
          $ul.find("li").each((___, li) => {
            const liText = $(li).text().trim();
            if (liText) {
              items.push(liText);
            }
          });
          
          if (items.length > 0) {
            messages.push({ type, title: headerText || "INFORMASI", items });
          }
        });
      } else {
        const divContent = $alert.find("div");
        const text = divContent.length > 0 ? divContent.text().trim() : $alert.text().trim();
        if (text) {
          const isSuccess = text.toUpperCase().includes("BERHASIL") || text.toUpperCase().includes("TERSIMPAN");
          messages.push({
            type: isSuccess ? "success" : "error",
            title: isSuccess ? "BERHASIL" : "GAGAL",
            items: [text]
          });
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
