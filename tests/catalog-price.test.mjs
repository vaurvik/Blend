import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePurchase } from "../src/catalog/resolve-purchase.ts";

test("a seleção usa o preço do catálogo e recusa variantes indisponíveis ou de outro produto", () => {
  const catalog = [
    {
      id: "p1",
      slug: "a",
      title: "Produto",
      description: "",
      variants: [
        {
          id: "v1",
          title: "Padrão",
          price: 1500,
          compareAtPrice: null,
          available: true,
        },
        {
          id: "v2",
          title: "Esgotado",
          price: 2000,
          compareAtPrice: null,
          available: false,
        },
      ],
    },
    {
      id: "p2",
      slug: "b",
      title: "Outro",
      description: "",
      variants: [
        {
          id: "v3",
          title: "Outro",
          price: 3000,
          compareAtPrice: null,
          available: true,
        },
      ],
    },
  ];
  assert.equal(
    resolvePurchase(catalog, {
      productId: "p1",
      variantId: "v1",
      quantity: 2,
      price: 1,
    }).totalAmount,
    3000,
  );
  assert.equal(
    resolvePurchase(catalog, { productId: "p1", variantId: "v2", quantity: 1 }),
    null,
  );
  assert.equal(
    resolvePurchase(catalog, { productId: "p1", variantId: "v3", quantity: 1 }),
    null,
  );
  assert.equal(
    resolvePurchase(catalog, { productId: "p1", variantId: "v1", quantity: 0 }),
    null,
  );
});
