"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProjectCatalogProduct } from "@/app/admin/catalog-actions";
import type { CatalogProduct } from "@/src/catalog/project-catalog";
import { Button } from "./button";
import { Field, Input, Textarea } from "./fields";

export function CatalogProductForm({
  projectSlug,
  initial,
}: {
  projectSlug: string;
  initial?: CatalogProduct;
}) {
  const [product, setProduct] = useState<CatalogProduct>(
    () =>
      initial || {
        id: crypto.randomUUID(),
        title: "",
        slug: "",
        description: "",
        variants: [
          {
            id: crypto.randomUUID(),
            title: "Padrão",
            price: 0,
            compareAtPrice: null,
            available: true,
          },
        ],
      },
  );
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="catalog-form">
      <div className="fields">
        <Field label="Nome do produto">
          <Input
            maxLength={150}
            value={product.title}
            onChange={(event) =>
              setProduct({ ...product, title: event.target.value })
            }
          />
        </Field>
        <Field label="Rota" hint="Letras minúsculas, números e hífens.">
          <Input
            maxLength={80}
            value={product.slug}
            onChange={(event) =>
              setProduct({ ...product, slug: event.target.value })
            }
          />
        </Field>
        <Field label="Descrição">
          <Textarea
            rows={4}
            maxLength={5000}
            value={product.description}
            onChange={(event) =>
              setProduct({ ...product, description: event.target.value })
            }
          />
        </Field>
        <h2>Variantes</h2>
        {product.variants.map((variant, index) => (
          <fieldset className="option-fields" key={variant.id}>
            <legend>Variante {index + 1}</legend>
            <Field label="Nome">
              <Input
                value={variant.title}
                maxLength={100}
                onChange={(event) =>
                  setProduct({
                    ...product,
                    variants: product.variants.map((item) =>
                      item.id === variant.id
                        ? { ...item, title: event.target.value }
                        : item,
                    ),
                  })
                }
              />
            </Field>
            <div className="field-row">
              <Field label="Preço (centavos)">
                <Input
                  type="number"
                  min={0}
                  max={100000000}
                  value={variant.price}
                  onChange={(event) =>
                    setProduct({
                      ...product,
                      variants: product.variants.map((item) =>
                        item.id === variant.id
                          ? { ...item, price: Number(event.target.value) }
                          : item,
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Preço original (centavos)">
                <Input
                  type="number"
                  min={0}
                  max={100000000}
                  value={variant.compareAtPrice ?? ""}
                  onChange={(event) =>
                    setProduct({
                      ...product,
                      variants: product.variants.map((item) =>
                        item.id === variant.id
                          ? {
                              ...item,
                              compareAtPrice:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            }
                          : item,
                      ),
                    })
                  }
                />
              </Field>
            </div>
            <label className="catalog-form__check">
              <input
                type="checkbox"
                checked={variant.available}
                onChange={(event) =>
                  setProduct({
                    ...product,
                    variants: product.variants.map((item) =>
                      item.id === variant.id
                        ? { ...item, available: event.target.checked }
                        : item,
                    ),
                  })
                }
              />{" "}
              Disponível
            </label>
            {product.variants.length > 1 && (
              <Button
                variant="secondary"
                onClick={() =>
                  setProduct({
                    ...product,
                    variants: product.variants.filter(
                      (item) => item.id !== variant.id,
                    ),
                  })
                }
              >
                Remover variante
              </Button>
            )}
          </fieldset>
        ))}
        {product.variants.length < 100 && (
          <Button
            variant="secondary"
            onClick={() =>
              setProduct({
                ...product,
                variants: [
                  ...product.variants,
                  {
                    id: crypto.randomUUID(),
                    title: "",
                    price: 0,
                    compareAtPrice: null,
                    available: true,
                  },
                ],
              })
            }
          >
            Adicionar variante
          </Button>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await saveProjectCatalogProduct(
                projectSlug,
                product,
                initial?.id,
              );
              if (result.error) setError(result.error);
              else {
                router.push(
                  `/admin/projetos/${encodeURIComponent(projectSlug)}/produtos`,
                );
                router.refresh();
              }
            })
          }
        >
          {pending ? "Salvando…" : "Salvar produto"}
        </Button>
      </div>
    </div>
  );
}
