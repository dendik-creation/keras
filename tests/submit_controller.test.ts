import { test, expect, beforeEach, spyOn } from "bun:test";
import { postSubmit } from "@/modules/submit/submit.controller";
import * as sessionModule from "@/lib/server/session";
import * as redisModule from "@/lib/server/redis";
import * as warTestModeModule from "@/lib/server/war-test-mode";
import { envVariable } from "@/lib/utils";

class MockRedis {
  status = "ready";
  store = new Map<string, any>();
  zsets = new Map<string, string[]>();

  async ping() { return "PONG"; }
  async set(key: string, val: string, ...args: any[]) {
    this.store.set(key, val);
    return "OK";
  }
  async get(key: string) { return this.store.get(key) || null; }
  async del(key: string) { this.store.delete(key); return 1; }
  async incr(key: string) { return 1; }
  async decr(key: string) { return 0; }
  async zadd(key: string, score: number, member: string) {
    if (!this.zsets.has(key)) this.zsets.set(key, []);
    this.zsets.get(key)!.push(member);
    return 1;
  }
  async zrange(key: string, start: number, stop: number) {
    return this.zsets.get(key)?.slice(0, 1) || [];
  }
  async zrem(key: string, member: string) { return 1; }
  async zcard(key: string) { return 0; }
  async zrank(key: string, member: string) { return 0; }
  duplicate() { return this; }
  async subscribe(channel: string) { return 1; }
  async publish(channel: string, message: string) { return 1; }
  on(event: string, handler: any) {}
}

beforeEach(() => {
  envVariable.WAR_PRIORITY_ENABLED = false;
  spyOn(sessionModule, "getSessionCookie").mockResolvedValue({
    name: "session",
    value: "mock_session_val",
  } as any);

  const mockRedis = new MockRedis();
  spyOn(redisModule, "getRedisClient").mockReturnValue(mockRedis as any);
  spyOn(warTestModeModule, "isWarTestMode").mockReturnValue(true);
});

test("postSubmit in stream mode emits preparation events before execution and attempts after execution", async () => {
  const req = new Request("http://localhost/api/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    },
    body: JSON.stringify({
      nim: "NORMAL1",
      courses: [{ code: "IF7777", class: "A" }],
    }),
  });

  const response = await postSubmit(req);
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toContain("application/x-ndjson");

  const text = await response.text();
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const events = lines.map((l) => JSON.parse(l));

  const eventNames = events.filter((e) => e.type === "event").map((e) => e.name);

  // Preparation events must come first
  expect(eventNames).toContain("SUBMIT_PAGE_SCRAPED");
  expect(eventNames).toContain("CHECKBOX_VALUES_EXTRACTED");
  expect(eventNames).toContain("EXECUTION_GRANTED");

  // ATTEMPT_STARTED must come AFTER EXECUTION_GRANTED
  const execIndex = eventNames.indexOf("EXECUTION_GRANTED");
  const attemptStartIndex = eventNames.indexOf("ATTEMPT_STARTED");

  expect(execIndex).toBeGreaterThan(-1);
  expect(attemptStartIndex).toBeGreaterThan(execIndex);

  const doneEvent = events.find((e) => e.type === "done");
  expect(doneEvent).toBeDefined();
  expect(typeof doneEvent.success).toBe("boolean");
});

test("postSubmit in non-stream mode returns standard JSON", async () => {
  envVariable.WAR_PRIORITY_ENABLED = false;
  const req = new Request("http://localhost/api/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      stream: false,
      nim: "NORMAL1",
      courses: [{ code: "IF9999", class: "B" }],
    }),
  });

  const response = await postSubmit(req);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(typeof data.success).toBe("boolean");
  expect(Array.isArray(data.messages)).toBe(true);
});
