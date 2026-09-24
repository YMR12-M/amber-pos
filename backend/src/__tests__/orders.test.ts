import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { pool } from "../config/db";
import {
  app,
  loginAs,
  setupFixtures,
  insertMenuItem,
  freeTableId,
  freeOwnTables,
  setTaxRate,
  trackOrder,
  teardown,
} from "./helpers";

let cashier = "";
let admin = "";
let kitchen = "";
let itemId = 0;

before(async () => {
  const fixtures = await setupFixtures();
  itemId = fixtures.itemId;
  cashier = await loginAs("cashier");
  admin = await loginAs("admin");
  kitchen = await loginAs("kitchen");
});

after(async () => {
  await teardown();
});

async function createOrder(body: Record<string, unknown>, cookie = cashier) {
  const res = await request(app).post("/api/orders").set("Cookie", cookie).send(body);
  if (res.status === 201) trackOrder(res.body.id);
  return res;
}

describe("BUG #2 — discount must never exceed subtotal", () => {
  test("rejects a discount larger than the subtotal", async () => {
    const res = await createOrder({
      order_type: "takeaway",
      items: [{ menu_item_id: itemId, quantity: 1 }],
      discount: 999999,
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /الخصم/);
  });

  test("accepts a discount equal to the subtotal (total = 0)", async () => {
    const [rows] = await pool.query<any[]>("SELECT price FROM menu_items WHERE id = ?", [itemId]);
    const price = Number(rows[0].price);

    const res = await createOrder({
      order_type: "takeaway",
      items: [{ menu_item_id: itemId, quantity: 1 }],
      discount: price,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.total, 0);
  });

  test("no order in the database ever has a negative total", async () => {
    const [rows] = await pool.query<any[]>("SELECT COUNT(*) AS n FROM orders WHERE total < 0");
    assert.equal(Number(rows[0].n), 0);
  });
});

describe("BUG #4 — a table cannot be double-booked", () => {
  test("second order on an occupied table is rejected with 409", async () => {
    const tableId = await freeTableId();

    const first = await createOrder({
      table_id: tableId,
      order_type: "dine_in",
      items: [{ menu_item_id: itemId, quantity: 1 }],
    });
    assert.equal(first.status, 201);

    const second = await createOrder({
      table_id: tableId,
      order_type: "dine_in",
      items: [{ menu_item_id: itemId, quantity: 1 }],
    });
    assert.equal(second.status, 409);
  });

  test("concurrent orders on one table: exactly one wins", async () => {
    await freeOwnTables();
    const tableId = await freeTableId();

    const body = {
      table_id: tableId,
      order_type: "dine_in",
      items: [{ menu_item_id: itemId, quantity: 1 }],
    };

    const results = await Promise.all([createOrder(body), createOrder(body), createOrder(body)]);
    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);

    assert.equal(created.length, 1, "exactly one order should be created");
    assert.equal(rejected.length, 2, "the other two should hit 409");
  });
});

describe("BUG #1 & #3 — payment closes the order and frees the table", () => {
  test("pay marks the order paid, records the method, and frees the table", async () => {
    await freeOwnTables();
    const tableId = await freeTableId();

    const created = await createOrder({
      table_id: tableId,
      order_type: "dine_in",
      items: [{ menu_item_id: itemId, quantity: 2 }],
    });
    assert.equal(created.status, 201);

    const paid = await request(app)
      .post(`/api/orders/${created.body.id}/pay`)
      .set("Cookie", cashier)
      .send({ payment_method: "cash" });

    assert.equal(paid.status, 200);

    const [orderRows] = await pool.query<any[]>(
      "SELECT status, payment_method, paid_at FROM orders WHERE id = ?",
      [created.body.id]
    );
    assert.equal(orderRows[0].status, "paid");
    assert.equal(orderRows[0].payment_method, "cash");
    assert.ok(orderRows[0].paid_at, "paid_at must be stamped");

    const [tableRows] = await pool.query<any[]>(
      "SELECT status FROM restaurant_tables WHERE id = ?",
      [tableId]
    );
    assert.equal(tableRows[0].status, "free", "table must be released after payment");
  });

  test("paying twice is rejected", async () => {
    const created = await createOrder({
      order_type: "takeaway",
      items: [{ menu_item_id: itemId, quantity: 1 }],
    });

    const first = await request(app)
      .post(`/api/orders/${created.body.id}/pay`)
      .set("Cookie", cashier)
      .send({ payment_method: "card" });
    assert.equal(first.status, 200);

    const second = await request(app)
      .post(`/api/orders/${created.body.id}/pay`)
      .set("Cookie", cashier)
      .send({ payment_method: "card" });
    assert.equal(second.status, 409);
  });

  test("sales report is no longer empty once orders are paid", async () => {
    const res = await request(app).get("/api/orders/reports/sales?days=7").set("Cookie", admin);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.daily));
    assert.ok(res.body.daily.length > 0, "report must contain the paid orders");
    assert.ok(res.body.by_payment_method.length > 0, "payment methods must be broken down");
  });
});

describe("BUG #5 — money is exact, not floating point", () => {
  test("3 x 0.10 with 14% tax gives exactly 0.30 / 0.04 / 0.34", async () => {
    const pennyItem = await insertMenuItem("float-precision-test", 0.1);
    await setTaxRate(0.14);

    try {
      const res = await createOrder({
        order_type: "takeaway",
        items: [{ menu_item_id: pennyItem, quantity: 3 }],
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.subtotal, 0.3, "subtotal must be exactly 0.30");
      assert.equal(res.body.tax, 0.04, "tax must be exactly 0.04");
      assert.equal(res.body.total, 0.34, "total must be exactly 0.34");
    } finally {
      await setTaxRate(0);
    }
  });
});

describe("BUG #14 — order status cascades to its items", () => {
  test("marking an order ready also marks every item ready", async () => {
    const created = await createOrder({
      order_type: "takeaway",
      items: [
        { menu_item_id: itemId, quantity: 1 },
        { menu_item_id: itemId, quantity: 2 },
      ],
    });

    const res = await request(app)
      .patch(`/api/orders/${created.body.id}/status`)
      .set("Cookie", kitchen)
      .send({ status: "ready" });
    assert.equal(res.status, 200);

    const [items] = await pool.query<any[]>(
      "SELECT status FROM order_items WHERE order_id = ?",
      [created.body.id]
    );
    assert.ok(items.length >= 2);
    assert.ok(
      items.every((i) => i.status === "ready"),
      "every item should follow the order status"
    );
  });
});

describe("BUG #13 — list endpoints are paginated", () => {
  test("returns a paginated envelope and honours page_size", async () => {
    const res = await request(app).get("/api/orders?page=1&page_size=2").set("Cookie", admin);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length <= 2, "page_size must be respected");
    assert.equal(typeof res.body.total, "number");
    assert.equal(res.body.page, 1);
  });

  test("page_size above the cap is rejected", async () => {
    const res = await request(app).get("/api/orders?page_size=5000").set("Cookie", admin);
    assert.equal(res.status, 400);
  });
});

describe("server never trusts client-supplied prices", () => {
  test("a price sent by the client is ignored", async () => {
    const [rows] = await pool.query<any[]>("SELECT price FROM menu_items WHERE id = ?", [itemId]);
    const realPrice = Number(rows[0].price);

    const res = await createOrder({
      order_type: "takeaway",
      items: [{ menu_item_id: itemId, quantity: 1, unit_price: 0.01, price: 0.01 }],
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.subtotal, realPrice, "must use the database price");
  });

  test("a tax_rate sent by the client is ignored — the saved setting wins", async () => {
    const res = await createOrder({
      order_type: "takeaway",
      items: [{ menu_item_id: itemId, quantity: 1 }],
      tax_rate: 5,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.tax, 0, "tax must come from settings, not from the request");
  });
});

describe("settings drive the receipt and the tax", () => {
  test("a tax rate above the configured ceiling is rejected", async () => {
    const res = await request(app)
      .put("/api/settings")
      .set("Cookie", admin)
      .send({
        merchant_name: "ceiling test",
        station: "POS-01",
        currency: "ج.م",
        tax_rate: 5,
      });

    assert.equal(res.status, 400);
  });

  test("cashier cannot change the settings", async () => {
    const res = await request(app)
      .put("/api/settings")
      .set("Cookie", cashier)
      .send({ merchant_name: "x", station: "POS-01", currency: "ج.م", tax_rate: 0 });

    assert.equal(res.status, 403);
  });

  test("the public endpoint exposes the shop name but no tax id", async () => {
    const res = await request(app).get("/api/settings/public");

    assert.equal(res.status, 200);
    assert.equal(typeof res.body.merchant_name, "string");
    assert.equal(res.body.tax_id, undefined, "tax id must stay behind auth");
    assert.equal(res.body.tax_rate, undefined, "tax rate must stay behind auth");
  });
});

describe("tables and categories are managed from the dashboard", () => {
  test("admin creates and deletes a table; a duplicate label is rejected", async () => {
    const label = `spec table ${Date.now()}`;

    const created = await request(app).post("/api/tables").set("Cookie", admin).send({ label });
    assert.equal(created.status, 201);

    const duplicate = await request(app).post("/api/tables").set("Cookie", admin).send({ label });
    assert.equal(duplicate.status, 409);

    const removed = await request(app)
      .delete(`/api/tables/${created.body.id}`)
      .set("Cookie", admin);
    assert.equal(removed.status, 200);
    assert.equal(removed.body.archived, false, "a never-used table is deleted outright");
  });

  test("a category that still holds items cannot be deleted", async () => {
    const created = await request(app)
      .post("/api/menu/categories")
      .set("Cookie", admin)
      .send({ name: `spec category ${Date.now()}` });
    assert.equal(created.status, 201);

    await insertMenuItem("spec item", 5, created.body.id);

    const blocked = await request(app)
      .delete(`/api/menu/categories/${created.body.id}`)
      .set("Cookie", admin);
    assert.equal(blocked.status, 409);

    await pool.query("DELETE FROM menu_items WHERE category_id = ?", [created.body.id]);
    await pool.query("DELETE FROM categories WHERE id = ?", [created.body.id]);
  });

  test("a menu item that was already ordered cannot be deleted", async () => {
    const res = await request(app).delete(`/api/menu/items/${itemId}`).set("Cookie", admin);
    assert.equal(res.status, 409);
  });
});

describe("a closed order is closed all the way down", () => {
  test("item status cannot be changed on a paid order", async () => {
    const created = await createOrder({
      order_type: "takeaway",
      items: [{ menu_item_id: itemId, quantity: 1 }],
    });
    assert.equal(created.status, 201);

    const [items] = await pool.query<any[]>(
      "SELECT id FROM order_items WHERE order_id = ? LIMIT 1",
      [created.body.id]
    );

    const paid = await request(app)
      .post(`/api/orders/${created.body.id}/pay`)
      .set("Cookie", cashier)
      .send({ payment_method: "cash" });
    assert.equal(paid.status, 200);

    // قبل الإصلاح ده كان بيرجّع 200 ويرجّع صنف في فاتورة مدفوعة
    // لـ "قيد الانتظار" — الورق يقول اتقدّم والقاعدة تقول لأ.
    const res = await request(app)
      .patch(`/api/orders/${created.body.id}/items/${items[0].id}/status`)
      .set("Cookie", kitchen)
      .send({ status: "pending" });

    assert.equal(res.status, 409);

    const [after] = await pool.query<any[]>("SELECT status FROM order_items WHERE id = ?", [
      items[0].id,
    ]);
    assert.equal(after[0].status, "served", "the paid order's items stay as they were");
  });
});

describe("the open-orders list comes back in one request", () => {
  test("status accepts a comma-separated list", async () => {
    const created = await createOrder({
      order_type: "takeaway",
      items: [{ menu_item_id: itemId, quantity: 1 }],
    });
    assert.equal(created.status, 201);

    const res = await request(app)
      .get("/api/orders?status=pending,preparing,ready,served&page_size=100")
      .set("Cookie", cashier);

    assert.equal(res.status, 200);
    assert.ok(
      res.body.data.some((o: { id: number }) => o.id === created.body.id),
      "the new order must appear in the combined list"
    );
    for (const order of res.body.data) {
      assert.ok(
        ["pending", "preparing", "ready", "served"].includes(order.status),
        `unexpected status in the filtered list: ${order.status}`
      );
    }
  });

  test("an unknown status in the list is rejected", async () => {
    const res = await request(app).get("/api/orders?status=pending,nonsense").set("Cookie", cashier);
    assert.equal(res.status, 400);
  });
});

describe("timestamps are UTC, so the clock on screen is the real one", () => {
  test("a just-created order reads as now, not hours off", async () => {
    const created = await createOrder({
      order_type: "takeaway",
      items: [{ menu_item_id: itemId, quantity: 1 }],
    });
    assert.equal(created.status, 201);

    const res = await request(app).get(`/api/orders/${created.body.id}`).set("Cookie", cashier);
    assert.equal(res.status, 200);

    // نفس منطق `parseServerDate` في الواجهة: النص بيتقري UTC.
    const createdAt = new Date(`${String(res.body.created_at).replace(" ", "T")}Z`);
    const driftMinutes = Math.abs(Date.now() - createdAt.getTime()) / 60000;

    // قبل الإصلاح ده كان بيساوي فرق توقيت السيرفر (3 ساعات في مصر)،
    // فمؤقّت المطبخ كان بيطلع بالسالب ويتقصّ على صفر — يعني مفيش طلب
    // كان بيتعلّم "متأخر" أبداً.
    assert.ok(
      driftMinutes < 2,
      `created_at is ${driftMinutes.toFixed(0)} minutes away from now — timezone mismatch`
    );
  });
});
