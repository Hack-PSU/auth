/**
 * Rules that decide whether a session is delivered as a cookie or a token, and
 * which redirect targets are allowed to receive one.
 *
 * Run with: node --experimental-strip-types --test src/lib/auth-environment.test.mjs
 */
import assert from "node:assert";
import { test } from "node:test";
import {
  getEnvironmentForSession,
  shouldUseCookieAuth,
  resolveReturnTo,
  buildReturnUrl,
} from "./auth-environment.ts";

const AUTH = "https://auth.hackpsu.org";

await test("a local destination gets token auth even from a production origin", () => {
  // The login page is served from auth.hackpsu.org, so its Origin always looks
  // like production. Only returnTo says where the session is actually going.
  assert.equal(
    getEnvironmentForSession(AUTH, "http://localhost:3000/dashboard"),
    "local",
  );
  assert.equal(shouldUseCookieAuth(AUTH, "http://localhost:3000/dashboard"), false);
});

await test("production destinations still use the shared cookie", () => {
  assert.equal(shouldUseCookieAuth(AUTH, "https://admin.hackpsu.org/x"), true);
  assert.equal(shouldUseCookieAuth(AUTH, "https://hackpsu.org/x"), true);
});

await test("vercel previews cannot share the cookie either", () => {
  assert.equal(shouldUseCookieAuth(AUTH, "https://x-git-abc.vercel.app/y"), false);
});

await test("returnTo is matched on its origin, not the whole URL", () => {
  // A path made every destination look local before this was fixed.
  assert.equal(
    getEnvironmentForSession(AUTH, "https://admin.hackpsu.org/deep/path?q=1"),
    "production",
  );
});

await test("the token rides along only where a cookie cannot work", () => {
  assert.ok(
    buildReturnUrl("http://localhost:3000/p", "TKN", AUTH).includes("authToken=TKN"),
  );
  assert.ok(
    !buildReturnUrl("https://admin.hackpsu.org/p", "TKN", AUTH).includes("authToken"),
  );
});

await test("unknown redirect targets never receive a token", () => {
  assert.equal(resolveReturnTo("https://evil.example/steal"), "https://hackpsu.org");
  // Suffix confusion: this is not a hackpsu.org host.
  assert.equal(resolveReturnTo("https://hackpsu.org.evil.com"), "https://hackpsu.org");
  assert.ok(!buildReturnUrl("https://evil.example/steal", "TKN", AUTH).includes("TKN"));
});

await test("known destinations are preserved untouched", () => {
  for (const ok of [
    "https://admin.hackpsu.org/a",
    "http://localhost:3000/a",
    "https://preview.vercel.app/a",
  ]) {
    assert.equal(resolveReturnTo(ok), ok);
  }
});

await test("a relative returnTo stays on the auth origin", () => {
  assert.equal(resolveReturnTo("/profile"), "/profile");
  assert.equal(resolveReturnTo("javascript:alert(1)"), "https://hackpsu.org");
});
