import { test, expect, beforeEach, spyOn } from "bun:test";
import { postSubmit, deleteSubmit, syncSubmit } from "@/modules/submit/submit.controller";
import * as sessionModule from "@/lib/server/session";
import * as redisModule from "@/lib/server/redis";
import * as warTestModeModule from "@/lib/server/war-test-mode";
import { envVariable } from "@/lib/utils";
import { resetSimulatedSession } from "@/modules/submit/submit.simulator";
import {
  SAVED_SCHEDULE_KEY,
  WAR_TEST_SCHEDULE_KEY,
  WAR_TEST_OWNED_COURSES_KEY,
  WAR_TEST_SECURED_COURSES_KEY,
  WAR_TEST_RELEASE_HISTORY_KEY,
} from "@/helper/frontend_helper";

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
    value: "test_session_isolation_123",
  } as any);

  const mockRedis = new MockRedis();
  spyOn(redisModule, "getRedisClient").mockReturnValue(mockRedis as any);
  spyOn(warTestModeModule, "isWarTestMode").mockReturnValue(true);
  resetSimulatedSession("test_session_isolation_123");
});

test("Test Mode storage keys and Production keys are distinct", () => {
  expect(SAVED_SCHEDULE_KEY).not.toBe(WAR_TEST_SCHEDULE_KEY);
  expect(WAR_TEST_SCHEDULE_KEY).toBe("war_test_schedule");
  expect(WAR_TEST_OWNED_COURSES_KEY).toBe("war_test_owned_courses");
  expect(WAR_TEST_SECURED_COURSES_KEY).toBe("war_test_secured_courses");
  expect(WAR_TEST_RELEASE_HISTORY_KEY).toBe("war_test_release_history");
});

test("DELETE /api/submit in Test Mode releases course and allows subsequent submit", async () => {
  // 1. Submit course IF1001-A
  const postReq = new Request("http://localhost/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      stream: false,
      nim: "TEST_USER",
      courses: [{ code: "IF1001", class: "A" }],
    }),
  });

  const postRes = await postSubmit(postReq);
  expect(postRes.status).toBe(200);

  // 2. Release course IF1001-A via DELETE
  const deleteReq = new Request("http://localhost/api/submit", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courses: JSON.stringify([{ course_code: "IF1001", course_class: "A" }]) }),
  });

  const deleteRes = await deleteSubmit(deleteReq);
  expect(deleteRes.status).toBe(200);
  const deleteData = await deleteRes.json();
  expect(deleteData.success).toBe(true);

  // 3. Sync courses to check status - IF1001-A should now have valid sim submit id (eligible for submit again!)
  const syncReq = new Request("http://localhost/api/submit?courses=" + encodeURIComponent(JSON.stringify([{ code: "IF1001", class: "A" }])), {
    method: "GET",
  });

  const syncRes = await syncSubmit(syncReq);
  expect(syncRes.status).toBe(200);
  const syncData = await syncRes.json();
  expect(syncData.success).toBe(true);
  expect(syncData.data[0].schedule_submit_id).toBe("SIM-IF1001-A");
});

test("DELETE /api/submit?reset=true resets test simulation session", async () => {
  const resetReq = new Request("http://localhost/api/submit?reset=true", {
    method: "DELETE",
  });

  const resetRes = await deleteSubmit(resetReq);
  expect(resetRes.status).toBe(200);
  const resetData = await resetRes.json();
  expect(resetData.success).toBe(true);
});
