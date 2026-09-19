import { describe, expect, it } from "vitest";

import { resolveDatabaseEnv } from "../env";

describe("resolveDatabaseEnv", () => {
  it("defaults to the local file", () => {
    expect(resolveDatabaseEnv({}).url).toBe("file:./data/vitrina.db");
  });

  it("prefers DATABASE_URL, then TURSO_DATABASE_URL", () => {
    expect(resolveDatabaseEnv({ DATABASE_URL: "libsql://a", DATABASE_AUTH_TOKEN: "t1", TURSO_DATABASE_URL: "libsql://b" })).toMatchObject({
      url: "libsql://a",
      authToken: "t1",
    });
    expect(resolveDatabaseEnv({ TURSO_DATABASE_URL: "libsql://b", TURSO_AUTH_TOKEN: "t2" })).toMatchObject({ url: "libsql://b", authToken: "t2" });
  });

  it("finds a marketplace-prefixed pair by value", () => {
    expect(resolveDatabaseEnv({ STORAGE_URL: "libsql://c.turso.io", STORAGE_AUTH_TOKEN: "t3", OTHER_URL: "https://example.com" })).toMatchObject({
      url: "libsql://c.turso.io",
      authToken: "t3",
      source: "STORAGE_URL",
    });
    expect(resolveDatabaseEnv({ MYDB_DATABASE_URL: "libsql://d", MYDB_TOKEN: "t4" })).toMatchObject({ url: "libsql://d", authToken: "t4" });
  });

  it("ignores unrelated _URL variables", () => {
    expect(resolveDatabaseEnv({ NEXT_PUBLIC_SITE_URL: "https://vitrina.app", APP_URL: "https://vitrina.app" }).url).toBe("file:./data/vitrina.db");
  });
});
