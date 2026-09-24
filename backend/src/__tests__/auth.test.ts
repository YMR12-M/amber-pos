import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { pool } from "../config/db";
import { app, loginAs, CREDENTIALS, setupFixtures, teardown } from "./helpers";

let cashier = "";
let kitchen = "";
let admin = "";

before(async () => {
  await setupFixtures();
  cashier = await loginAs("cashier");
  kitchen = await loginAs("kitchen");
  admin = await loginAs("admin");
});

after(async () => {
  await teardown();
});

describe("BUG #12 — the token is not reachable from JavaScript", () => {
  test("login sets an httpOnly, sameSite cookie", async () => {
    const res = await request(app).post("/api/auth/login").send(CREDENTIALS.cashier);

    assert.equal(res.status, 200);
    const cookies = res.headers["set-cookie"] as unknown as string[];
    const tokenCookie = cookies.find((c) => c.startsWith("pos_token="));

    assert.ok(tokenCookie, "a pos_token cookie must be set");
    assert.match(tokenCookie!, /HttpOnly/i, "cookie must be HttpOnly");
    assert.match(tokenCookie!, /SameSite=Strict/i, "cookie must be SameSite=Strict");
  });

  test("the response body never contains the raw token", async () => {
    const res = await request(app).post("/api/auth/login").send(CREDENTIALS.cashier);
    assert.equal(res.body.token, undefined, "token must not be readable by page scripts");
    assert.ok(res.body.user, "user profile is still returned");
  });

  test("logout clears the cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    assert.equal(res.status, 200);
    const cookies = res.headers["set-cookie"] as unknown as string[];
    assert.ok(cookies.some((c) => c.startsWith("pos_token=;")), "cookie must be cleared");
  });
});

describe("authentication", () => {
  test("wrong password is rejected", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: CREDENTIALS.admin.email, password: "wrong-password" });
    assert.equal(res.status, 401);
  });

  test("unknown email gives the same message (no user enumeration)", async () => {
    const unknown = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@amber-pos.test", password: "whatever" });
    const wrongPass = await request(app)
      .post("/api/auth/login")
      .send({ email: CREDENTIALS.admin.email, password: "wrong-password" });

    assert.equal(unknown.status, 401);
    assert.equal(unknown.body.message, wrongPass.body.message);
  });

  test("protected route without a session is 401", async () => {
    const res = await request(app).get("/api/orders");
    assert.equal(res.status, 401);
  });
});

describe("BUG #10 — kitchen staff cannot see revenue", () => {
  test("kitchen is blocked from the orders list", async () => {
    const res = await request(app).get("/api/orders").set("Cookie", kitchen);
    assert.equal(res.status, 403);
  });

  test("kitchen is blocked from sales reports", async () => {
    const res = await request(app).get("/api/orders/reports/sales").set("Cookie", kitchen);
    assert.equal(res.status, 403);
  });

  test("kitchen queue carries no money columns", async () => {
    const res = await request(app).get("/api/orders/kitchen-queue").set("Cookie", kitchen);

    assert.equal(res.status, 200);
    for (const order of res.body) {
      assert.equal(order.total, undefined, "total must not be exposed to kitchen");
      assert.equal(order.subtotal, undefined, "subtotal must not be exposed to kitchen");
      assert.equal(order.discount, undefined, "discount must not be exposed to kitchen");
    }
  });

  test("cashier cannot manage staff", async () => {
    const res = await request(app).get("/api/users").set("Cookie", cashier);
    assert.equal(res.status, 403);
  });

  test("cashier cannot create menu items", async () => {
    const res = await request(app)
      .post("/api/menu/items")
      .set("Cookie", cashier)
      .send({ category_id: 1, name: "unauthorized", price: 10 });
    assert.equal(res.status, 403);
  });

  test("admin can reach staff management", async () => {
    const res = await request(app).get("/api/users").set("Cookie", admin);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  test("user list never leaks password hashes", async () => {
    const res = await request(app).get("/api/users").set("Cookie", admin);
    for (const user of res.body) {
      assert.equal(user.password_hash, undefined, "password_hash must never be sent");
    }
  });
});

describe("BUG #11 — security headers are present", () => {
  test("helmet headers are set", async () => {
    const res = await request(app).get("/health");
    assert.ok(res.headers["x-content-type-options"], "X-Content-Type-Options must be set");
    assert.equal(res.headers["x-powered-by"], undefined, "Express fingerprint must be hidden");
  });
});

describe("stopping an account closes its open session immediately", () => {
  test("a deactivated user's existing token stops working", async () => {
    const session = await loginAs("kitchen");

    // الجلسة شغّالة قبل الإيقاف
    const before = await request(app).get("/api/auth/me").set("Cookie", session);
    assert.equal(before.status, 200);

    const [rows] = await pool.query<any[]>("SELECT id FROM users WHERE email = ?", [
      CREDENTIALS.kitchen.email,
    ]);
    const stopped = await request(app)
      .patch(`/api/users/${rows[0].id}/toggle`)
      .set("Cookie", admin);
    assert.equal(stopped.status, 200);

    // التوكن اللي في متصفحه لازم يبقى ملغي دلوقتي حالاً — مش بعد 8 ساعات
    const after = await request(app).get("/api/auth/me").set("Cookie", session);
    assert.equal(after.status, 401, "a stopped employee must lose their open session");

    const queue = await request(app).get("/api/orders/kitchen-queue").set("Cookie", session);
    assert.equal(queue.status, 401, "and every other endpoint too");

    // رجّعه تاني عشان باقي الاختبارات
    await request(app).patch(`/api/users/${rows[0].id}/toggle`).set("Cookie", admin);
  });

  test("changing a password closes sessions opened with the old one", async () => {
    const session = await loginAs("cashier");
    assert.equal((await request(app).get("/api/auth/me").set("Cookie", session)).status, 200);

    const [rows] = await pool.query<any[]>("SELECT id FROM users WHERE email = ?", [
      CREDENTIALS.cashier.email,
    ]);
    const changed = await request(app)
      .patch(`/api/users/${rows[0].id}/password`)
      .set("Cookie", admin)
      .send({ password: "Rotated-2026-x" });
    assert.equal(changed.status, 200);

    const after = await request(app).get("/api/auth/me").set("Cookie", session);
    assert.equal(after.status, 401, "the old session must not survive a password change");
  });
});
