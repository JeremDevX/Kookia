const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function validateIntegrationDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for integration tests.");
  }

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("Integration tests require a local kookia_test database URL.");
  }

  let databaseName;
  try {
    databaseName = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new Error("Integration tests require a local kookia_test database URL.");
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !localHosts.has(url.hostname.toLowerCase()) ||
    databaseName !== "kookia_test"
  ) {
    throw new Error(
      "Integration tests are restricted to the local kookia_test database; no tests were started."
    );
  }
}
