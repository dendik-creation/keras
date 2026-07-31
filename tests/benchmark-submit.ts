import fs from "fs";
import path from "path";

const ENDPOINT = process.env.KRS_POST_SCHEDULES || "http://localhost:3000/api/savekrs";
const EXTERNAL_SESSION = process.env.EXTERNAL_SESSION || "mock_session_token";
const COURSE_SUBMIT_IDS = JSON.parse(process.env.COURSE_SUBMIT_IDS || '["course_submit_id_1", "course_submit_id_2"]');

const TOTAL_REQUESTS = Number(process.env.TOTAL_REQUESTS || 50);
const CONCURRENCY = Number(process.env.CONCURRENCY || 2);
const REQUEST_INTERVAL_MS = Number(process.env.REQUEST_INTERVAL_MS || 200);
const START_DELAY_MS = Number(process.env.START_DELAY_MS || 0);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 10000);

interface RequestLog {
  id: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  status: number;
  success: boolean;
  error?: string;
  bodyTruncated?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculatePercentile(numbers: number[], percentile: number): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runSingleRequest(id: number): Promise<RequestLog> {
  const startMs = Date.now();
  const startTime = new Date(startMs).toISOString();

  const formData = new URLSearchParams();
  COURSE_SUBMIT_IDS.forEach((cid: string) => {
    formData.append("makul[]", cid);
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": `external_session=${EXTERNAL_SESSION}`
      },
      body: formData.toString(),
      signal: controller.signal
    });

    clearTimeout(timer);
    const endMs = Date.now();
    const durationMs = endMs - startMs;
    const text = await res.text();
    const truncatedBody = text.length > 200 ? text.slice(0, 200) + "..." : text;

    const log: RequestLog = {
      id,
      startTime,
      endTime: new Date(endMs).toISOString(),
      durationMs,
      status: res.status,
      success: res.ok,
      bodyTruncated: truncatedBody
    };

    console.log(`[${id}]\nStarted:\n${startTime}\nLatency:\n${durationMs}ms\nStatus:\n${res.status}\nSuccess:\n${res.ok}\nBody:\n${truncatedBody}\n`);
    return log;
  } catch (err: any) {
    clearTimeout(timer);
    const endMs = Date.now();
    const durationMs = endMs - startMs;
    const errMsg = err.name === "AbortError" ? "Request Timeout" : err.message;

    const log: RequestLog = {
      id,
      startTime,
      endTime: new Date(endMs).toISOString(),
      durationMs,
      status: 0,
      success: false,
      error: errMsg
    };

    console.log(`[${id}]\nStarted:\n${startTime}\nLatency:\n${durationMs}ms\nStatus:\n0\nSuccess:\nfalse\nError:\n${errMsg}\n`);
    return log;
  }
}

async function main() {
  console.log("=== BENCHMARK START ===");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Total Requests: ${TOTAL_REQUESTS}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Interval: ${REQUEST_INTERVAL_MS}ms`);

  if (START_DELAY_MS > 0) {
    await sleep(START_DELAY_MS);
  }

  const results: RequestLog[] = [];
  let requestCounter = 0;

  async function worker() {
    while (true) {
      if (requestCounter >= TOTAL_REQUESTS) break;
      requestCounter++;
      const currentId = requestCounter;

      const log = await runSingleRequest(currentId);
      results.push(log);

      if (requestCounter < TOTAL_REQUESTS && REQUEST_INTERVAL_MS > 0) {
        await sleep(REQUEST_INTERVAL_MS);
      }
    }
  }

  const startTimeOverall = Date.now();
  const workerCount = Math.min(CONCURRENCY, TOTAL_REQUESTS);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  const totalDurationSec = (Date.now() - startTimeOverall) / 1000;

  const total = results.length;
  const successful = results.filter((r) => r.success).length;
  const failed = total - successful;

  const statusCounts: Record<string, number> = {
    "200": 0, "302": 0, "400": 0, "401": 0, "403": 0, "429": 0, "500": 0
  };

  const latencies = results.map((r) => r.durationMs);
  results.forEach((r) => {
    const key = String(r.status);
    if (key in statusCounts) {
      statusCounts[key]++;
    }
  });

  const avgLatency = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : "0";
  const minLatency = latencies.length ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length ? Math.max(...latencies) : 0;
  const medianLatency = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);
  const rps = totalDurationSec > 0 ? (total / totalDurationSec).toFixed(2) : "0";

  console.log("=== FINAL SUMMARY ===");
  console.log(`Total Requests: ${total}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`HTTP 200: ${statusCounts["200"]}`);
  console.log(`HTTP 302: ${statusCounts["302"]}`);
  console.log(`HTTP 400: ${statusCounts["400"]}`);
  console.log(`HTTP 401: ${statusCounts["401"]}`);
  console.log(`HTTP 403: ${statusCounts["403"]}`);
  console.log(`HTTP 429: ${statusCounts["429"]}`);
  console.log(`HTTP 500: ${statusCounts["500"]}`);
  console.log(`Average Latency: ${avgLatency}ms`);
  console.log(`Median Latency: ${medianLatency}ms`);
  console.log(`P95: ${p95}ms`);
  console.log(`P99: ${p99}ms`);
  console.log(`Maximum Latency: ${maxLatency}ms`);
  console.log(`Minimum Latency: ${minLatency}ms`);
  console.log(`Requests Per Second: ${rps}`);

  const output = {
    configuration: {
      endpoint: ENDPOINT,
      totalRequests: TOTAL_REQUESTS,
      concurrency: CONCURRENCY,
      requestIntervalMs: REQUEST_INTERVAL_MS,
      startDelayMs: START_DELAY_MS,
      timeoutMs: TIMEOUT_MS
    },
    summary: {
      totalRequests: total,
      successful,
      failed,
      statusCounts,
      avgLatencyMs: Number(avgLatency),
      medianLatencyMs: medianLatency,
      p95Ms: p95,
      p99Ms: p99,
      maxLatencyMs: maxLatency,
      minLatencyMs: minLatency,
      requestsPerSecond: Number(rps)
    },
    requests: results
  };

  const outputPath = path.join(process.cwd(), "benchmark-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Results saved to ${outputPath}`);
}

main().catch(console.error);
