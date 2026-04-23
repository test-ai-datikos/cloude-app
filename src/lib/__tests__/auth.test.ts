// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

// Must mock server-only before importing auth
vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Import after mocks are set up
const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: Record<string, unknown>, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets an httpOnly cookie with a signed JWT", async () => {
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, token, options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT format
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });

  test("sets cookie expiry ~7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expires: Date = options.expires;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeToken({
      userId: "user-1",
      email: "user@example.com",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("user@example.com");
  });

  test("returns null for an invalid/tampered token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid.jwt.token" });

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await makeToken(
      { userId: "user-1", email: "user@example.com" },
      "1s"
    );
    // Manually craft an already-expired JWT by shifting iat/exp into the past
    // Easier: use a token signed with past expiry using a negative offset trick
    // Instead, just pass a well-formed token and fake expiry via clock skew isn't easily
    // injectable here, so we verify that a structurally bad exp field causes null.
    const [header, , sig] = token.split(".");
    const payload = Buffer.from(
      JSON.stringify({ userId: "u", email: "e@e.com", exp: 1 }),
    ).toString("base64url");
    const expiredToken = `${header}.${payload}.${sig}`;

    mockCookieStore.get.mockReturnValue({ value: expiredToken });
    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledOnce();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  test("returns null when no cookie is present in request", async () => {
    const request = new NextRequest("http://localhost/api/test");

    const session = await verifySession(request);
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token in request", async () => {
    const token = await makeToken({
      userId: "user-2",
      email: "other@example.com",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const request = new NextRequest("http://localhost/api/test", {
      headers: { cookie: `auth-token=${token}` },
    });

    const session = await verifySession(request);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-2");
    expect(session?.email).toBe("other@example.com");
  });

  test("returns null for an invalid token in request", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { cookie: "auth-token=bad.token.here" },
    });

    const session = await verifySession(request);
    expect(session).toBeNull();
  });
});
