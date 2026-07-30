import { test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { processThroughGate, _test_cleanup } from "@/lib/server/war-gate";
import * as redisModule from "@/lib/server/redis";
import { envVariable } from "@/lib/utils";

class MockRedis {
  status = "ready";
  store = new Map<string, any>();
  zsets = new Map<string, string[]>();

  async ping() { return "PONG"; }
  async set(key: string, val: string, ...args: any[]) {
    if (args.includes("NX")) {
      if (this.store.has(key)) return null;
      this.store.set(key, val);
      return "OK";
    }
    this.store.set(key, val);
    return "OK";
  }
  async get(key: string) { return this.store.get(key) || null; }
  async del(key: string) { this.store.delete(key); return 1; }
  async incr(key: string) {
    const v = parseInt(this.store.get(key) || "0") + 1;
    this.store.set(key, v.toString());
    return v;
  }
  async decr(key: string) {
    const v = parseInt(this.store.get(key) || "0") - 1;
    this.store.set(key, v.toString());
    return v;
  }
  async zadd(key: string, score: number, member: string) {
    if (!this.zsets.has(key)) this.zsets.set(key, []);
    this.zsets.get(key)!.push(member);
    return 1;
  }
  async zrange(key: string, start: number, stop: number) {
    const z = this.zsets.get(key) || [];
    return z.slice(0, 1);
  }
  async zrem(key: string, member: string) {
    const z = this.zsets.get(key) || [];
    this.zsets.set(key, z.filter(m => m !== member));
    return 1;
  }
  async zcard(key: string) {
    return (this.zsets.get(key) || []).length;
  }
  async zrank(key: string, member: string) {
    const z = this.zsets.get(key) || [];
    const index = z.indexOf(member);
    return index >= 0 ? index : null;
  }
  
  onMessageHandler: any = null;
  duplicate() { return this; }
  async subscribe(channel: string) { return 1; }
  async publish(channel: string, message: string) {
    if (this.onMessageHandler) {
       this.onMessageHandler(channel, message);
    }
    return 1;
  }
  on(event: string, handler: any) {
    if (event === "message") this.onMessageHandler = handler;
    if (event === "error") {}
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

beforeEach(() => {
  const mockRedis = new MockRedis();
  spyOn(redisModule, "getRedisClient").mockReturnValue(mockRedis as any);
  
  envVariable.WAR_PRIORITY_ENABLED = true;
  envVariable.WAR_PRIORITY_NIMS = "PRIO1,PRIO2,PRIO3";
  envVariable.WAR_PRIORITY_GATE_TIMEOUT_MS = 2000;
  envVariable.WAR_PRIORITY_DISCOVERY_WINDOW_MS = 250;
});

afterEach(() => {
  envVariable.WAR_PRIORITY_ENABLED = false;
  _test_cleanup();
});

test("Case 1: Normal only - Waits for discovery window", async () => {
  const start = Date.now();
  await processThroughGate("NORMAL1", true, {}, async () => "ok");
  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(200);
});

test("Case 2: Priority only - Immediate execution", async () => {
  const start = Date.now();
  await processThroughGate("PRIO1", true, {}, async () => "ok");
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(100);
});

test("Case 3: Normal first, Priority arrives within discovery window", async () => {
  const order: string[] = [];
  
  const p1 = processThroughGate("NORMAL1", true, {}, async () => {
    order.push("normal");
    return "ok";
  });
  
  await sleep(100);
  
  const p2 = processThroughGate("PRIO1", true, {}, async () => {
    order.push("priority");
    return "ok";
  });
  
  await Promise.all([p1, p2]);
  expect(order).toEqual(["priority", "normal"]);
});

test("Case 4: Normal first, Priority arrives after discovery window expires", async () => {
  const order: string[] = [];
  
  const p1 = processThroughGate("NORMAL1", true, {}, async () => {
    order.push("normal");
    await sleep(200);
    return "ok";
  });
  
  await sleep(350);
  
  const p2 = processThroughGate("PRIO1", true, {}, async () => {
    order.push("priority");
    return "ok";
  });
  
  await Promise.all([p1, p2]);
  expect(order).toEqual(["normal", "priority"]);
});

test("Case 5: Priority crashes (Gate timeout)", async () => {
  envVariable.WAR_PRIORITY_GATE_TIMEOUT_MS = 400;
  const order: string[] = [];
  
  const p1 = processThroughGate("NORMAL1", true, {}, async () => {
    order.push("normal");
    return "ok";
  });
  
  await sleep(100);
  
  const p2 = processThroughGate("PRIO1", true, {}, async () => {
    await sleep(2000);
    return "ok";
  });
  
  await Promise.race([p1, sleep(1500).then(() => { throw new Error("Timeout"); })]);
  
  expect(order).toEqual(["normal"]);
});

test("Case 6: Multiple priority users", async () => {
  const order: string[] = [];
  
  const p1 = processThroughGate("NORMAL1", true, {}, async () => {
    order.push("normal");
    return "ok";
  });
  
  await sleep(50);
  const p2 = processThroughGate("PRIO1", true, {}, async () => {
    await sleep(100);
    order.push("prio1");
    return "ok";
  });
  
  await sleep(50);
  const p3 = processThroughGate("PRIO2", true, {}, async () => {
    await sleep(100);
    order.push("prio2");
    return "ok";
  });
  
  await sleep(50);
  const p4 = processThroughGate("PRIO3", true, {}, async () => {
    await sleep(100);
    order.push("prio3");
    return "ok";
  });
  
  await Promise.all([p1, p2, p3, p4]);
  expect(order).toEqual(["prio1", "prio2", "prio3", "normal"]);
});

test("Case 7: Mixed queue", async () => {
  const order: string[] = [];
  
  const p1 = processThroughGate("NORMAL1", true, {}, async () => { order.push("normal1"); return "ok"; });
  await sleep(20);
  const p2 = processThroughGate("NORMAL2", true, {}, async () => { order.push("normal2"); return "ok"; });
  await sleep(20);
  const p3 = processThroughGate("PRIO1", true, {}, async () => { await sleep(100); order.push("prio1"); return "ok"; });
  await sleep(20);
  const p4 = processThroughGate("PRIO2", true, {}, async () => { await sleep(100); order.push("prio2"); return "ok"; });
  await sleep(20);
  const p5 = processThroughGate("NORMAL3", true, {}, async () => { order.push("normal3"); return "ok"; });
  
  await Promise.all([p1, p2, p3, p4, p5]);
  expect(order).toEqual(["prio1", "prio2", "normal1", "normal2", "normal3"]);
});
