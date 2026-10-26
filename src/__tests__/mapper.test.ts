import { describe, expect, it } from "vitest";
import { isSecretField, mapAirtableRecord, parseJsonField } from "../lib/mapper";

describe("parseJsonField", () => {
  it("parses a normal JSON array", () => {
    const result = parseJsonField(
      '[{"product_name":"Mechanical Keyboard","variant_name":"Black","quantity":1}]',
    );
    expect(result.unavailable).toBe(false);
    expect(Array.isArray(result.value)).toBe(true);
  });

  it("parses double-encoded items", () => {
    const inner = JSON.stringify([
      { product_name: "Mechanical Keyboard", variant_name: "Black", quantity: 1, price: "6500.00" },
    ]);
    const result = parseJsonField(JSON.stringify(inner));
    expect(result.unavailable).toBe(false);
    expect((result.value as Array<{ product_name: string }>)[0].product_name).toBe(
      "Mechanical Keyboard",
    );
  });

  it("marks invalid JSON as unavailable", () => {
    const result = parseJsonField("{not-json");
    expect(result.unavailable).toBe(true);
    expect(result.value).toBeNull();
  });
});

describe("mapAirtableRecord", () => {
  it("strips secret fields and maps the portal shape", () => {
    const mapped = mapAirtableRecord({
      id: "recbvMoOCuyQ9rurh",
      createdTime: "2026-10-26T00:16:56.000Z",
      fields: {
        session_id: "923009869694",
        order_no: "1001",
        customer_email: "umer.trades.pk@gmail.com",
        return_reason: "exchange",
        exchange_status: "inspection_done",
        inspection_status: "passed",
        payment_status: "paid",
        amount_due: 300,
        amount_paid: 300,
        currency: "PKR",
        original_items: JSON.stringify(
          JSON.stringify([
            { product_name: "Mechanical Keyboard", variant_name: "Black", quantity: 1, price: "6500.00" },
          ]),
        ),
        replacement_items: JSON.stringify([
          { replacement_product: "Mechanical Keyboard", replacement_variant: "White", quantity: 1, unit_price: 6800 },
        ]),
        shopify_access_token: "shpat_should_never_leak",
        n8n_key: "secret",
        updated_at: "2026-10-26T00:31:13.403Z",
      },
    });

    expect(mapped.id).toBe("recbvMoOCuyQ9rurh");
    expect(mapped.customer.phone).toBe("923009869694");
    expect(mapped.original_items[0].product_name).toBe("Mechanical Keyboard");
    expect(mapped.replacement_items[0].replacement_variant).toBe("White");
    expect(JSON.stringify(mapped)).not.toContain("shpat");
    expect(JSON.stringify(mapped)).not.toContain("n8n_key");
  });
});

describe("isSecretField", () => {
  it("flags shopify tokens and keys", () => {
    expect(isSecretField("shopify_access_token")).toBe(true);
    expect(isSecretField("portal_key")).toBe(true);
    expect(isSecretField("order_no")).toBe(false);
  });
});
