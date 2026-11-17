import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { syncBuiltinESMExports } from "node:module";
import net from "node:net";
import test from "node:test";
import { fileURLToPath } from "node:url";

function fakeProcess() {
  const child = new EventEmitter();
  Object.assign(child, { pid: 1, exitCode: null, signalCode: null, stdout: new EventEmitter() });
  child.stdout.setEncoding = () => child.stdout;
  child.finish = (code, signal = null) => {
    child.exitCode = code;
    child.signalCode = signal;
    child.emit("exit", code, signal);
    child.emit("close", code, signal);
  };
  child.kill = (signal) => queueMicrotask(() => child.finish(null, signal));
  return child;
}

test("cleans up the demo if Vite stops during seeding", async (t) => {
  let nextPort = 54320;
  t.mock.method(net, "createServer", () => ({
    once() {}, listen(_port, _host, ready) { ready(); }, close(ready) { ready(); },
    address: () => ({ port: ++nextPort }),
  }));
  t.mock.method(globalThis, "fetch", async () => Response.json({ user: { id: "demo-fixture" } }));
  let api;
  let web;
  t.mock.method(childProcess, "spawn", (command, args) => {
    const child = fakeProcess();
    if (args.includes("server/src/index.ts")) api = child;
    else if (args.includes("node_modules/vite/bin/vite.js")) web = child;
    else queueMicrotask(() => {
      if (command === "docker" && args[0] === "port") child.stdout.emit("data", "127.0.0.1:55432");
      if (args.includes("server/src/scripts/seedLocalDemoScenario.ts")) web.finish(null, "SIGTERM");
      child.finish(0);
    });
    return child;
  });
  const docker = t.mock.method(childProcess, "spawnSync", () => ({ status: 0 }));
  syncBuiltinESMExports();

  const log = t.mock.method(console, "log", () => {});
  const error = t.mock.method(console, "error", () => {});
  const argv = process.argv;
  const exitCode = process.exitCode;
  const filepath = new URL("./localDemoSession.mjs", import.meta.url);
  const signals = ["SIGINT", "SIGTERM"];
  const listeners = signals.map(signal => process.listeners(signal));
  process.argv = [process.execPath, fileURLToPath(filepath), "--fixtures"];
  // Keep a regression from stalling the test process indefinitely.
  const watchdog = setTimeout(() => process.emit("SIGTERM"), 1_000);
  try {
    await import(filepath.href);
    assert.equal(process.exitCode, 1);
    assert.equal(error.mock.calls[0].arguments[0], "Le serveur web s’est arrêté (SIGTERM).");
    assert.ok(log.mock.calls.every(({ arguments: args }) => !args[0].includes("prête")));
    assert.equal(api.signalCode, "SIGTERM");
    assert.ok(docker.mock.calls.some(({ arguments: [command, [operation]] }) => command === "docker" && operation === "rm"));
  } finally {
    clearTimeout(watchdog);
    process.argv = argv;
    process.exitCode = exitCode;
    signals.forEach((signal, index) => {
      for (const listener of process.listeners(signal)) if (!listeners[index].includes(listener)) process.off(signal, listener);
    });
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});
