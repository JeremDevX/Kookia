import type { Request, Response } from "express";
import { afterEach, expect, it, vi } from "vitest";
import { rateLimit } from "./rateLimit.js";

afterEach(() => vi.restoreAllMocks());

it("removes expired buckets during traffic and preserves active limits", () => {
  const middleware = rateLimit(1, 100);
  let now = 1000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const deleted = vi.spyOn(Map.prototype, "delete");
  const next = vi.fn();
  const status = vi.fn(() => ({ json: vi.fn() }));
  const send = (path: string) => middleware({ ip: "127.0.0.1", path } as Request, { status } as unknown as Response, next);

  send("/past-window");
  now = 1025;
  send("/current-window");
  expect(next).toHaveBeenCalledTimes(2);

  now = 1100;
  send("/current-window");
  expect(deleted).toHaveBeenCalledWith("127.0.0.1:/past-window");
  expect(deleted).not.toHaveBeenCalledWith("127.0.0.1:/current-window");
  expect(status).toHaveBeenCalledWith(429);
  expect(next).toHaveBeenCalledTimes(2);

  send("/past-window");
  expect(next).toHaveBeenCalledTimes(3);
});
