import request from "supertest";
import { afterAll } from "vitest";

type ClosableServer = {
  listening: boolean;
  close: (callback: (error?: Error) => void) => unknown;
};

type TrackedAgentFactory = typeof request.agent & { trackedServers?: Set<ClosableServer> };

const agentFactory = request.agent as TrackedAgentFactory;
if (!agentFactory.trackedServers) {
  const servers = new Set<ClosableServer>();
  const originalAgent = request.agent;
  const trackedAgent = ((...args: Parameters<typeof request.agent>) => {
    const agent = originalAgent(...args);
    const app = (agent as unknown as { app?: unknown }).app;
    if (isClosableServer(app)) servers.add(app);
    return agent;
  }) as TrackedAgentFactory;
  trackedAgent.trackedServers = servers;
  request.agent = trackedAgent;
}

const servers = (request.agent as TrackedAgentFactory).trackedServers!;

afterAll(async () => {
  for (const server of servers) {
    if (!server.listening) continue;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  servers.clear();
});

function isClosableServer(value: unknown): value is ClosableServer {
  return typeof value === "object" && value !== null
    && "listening" in value && typeof value.listening === "boolean"
    && "close" in value && typeof value.close === "function";
}
