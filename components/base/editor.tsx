"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/src/catalog/model";
import { Storefront } from "@/components/base/storefront/storefront";
import { saveProduct } from "@/app/admin/actions";
import { editorSections, EditorSection } from "./editor-sections";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  MediaUpload,
} from "@/components/base";

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function Editor({
  initial,
  originalSlug,
}: {
  initial: Product;
  originalSlug?: string;
}) {
  const [product, setProduct] = useState<Product>(() => ({
    ...structuredClone(initial),
    mediaId: initial.mediaId || crypto.randomUUID(),
  }));
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => "",
  );
  const activeSection =
    editorSections.find((section) => section.id === hash) || editorSections[0];
  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((p) => ({ ...p, [key]: value }));
  }
  function option(
    i: number,
    key: keyof Product["options"][number],
    value: string | number,
  ) {
    setProduct((p) => ({
      ...p,
      options: p.options.map((o, n) => (n === i ? { ...o, [key]: value } : o)),
    }));
  }
  function save() {
    start(async () => {
      const result = await saveProduct(
        {
          ...product,
          images: product.images.filter(Boolean),
          benefits: product.benefits.filter(Boolean),
          marqueeItems: product.marqueeItems.filter(Boolean),
        },
        originalSlug,
      );
      if (result.error) setError(result.error);
      else router.push(`/admin/projetos/${encodeURIComponent(product.slug)}`);
    });
  }
  const text = (
    label: string,
    key:
      | "slug"
      | "projectName"
      | "title"
      | "announcement"
      | "campaignSupport"
      | "campaignImage"
      | "brandName"
      | "facebookUrl"
      | "logo"
      | "video"
      | "buttonText"
      | "routineTitle"
      | "routineText"
      | "reviewTitle"
      | "reviewText"
      | "footerText",
    hint?: string,
  ) => (
    <Field label={label} hint={hint}>
      <Input value={product[key]} onChange={(e) => set(key, e.target.value)} />
    </Field>
  );
  return (
    <div className={`editor${showPreview ? "" : " editor--settings"}`}>
      <aside className="editor-form">
        <Link
          href={
            originalSlug
              ? `/admin/projetos/${encodeURIComponent(originalSlug)}`
              : "/admin"
          }
        >
          ← Projeto
        </Link>
        <p className="eyebrow-label editor-eyebrow">
          PERSONALIZAÇÃO <span aria-hidden="true">/</span>{" "}
          {originalSlug ? "EDITAR SITE" : "NOVO SITE"}
        </p>
        <h1>{originalSlug ? "Configurações do projeto" : "Criar projeto"}</h1>
        <p>Configure o domínio, a identidade e o conteúdo deste site.</p>
        <Button
          variant="secondary"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? "Ocultar prévia" : "Abrir prévia"}
        </Button>
        <nav className="settings-nav" aria-label="Seções das configurações">
          {editorSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={
                activeSection.id === section.id ? "page" : undefined
              }
            >
              {section.label}
            </a>
          ))}
        </nav>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="fields">
          <div className="editor-section__intro">
            <span className="eyebrow-label">CONFIGURAÇÕES DO PROJETO</span>
            <h2>{activeSection.label}</h2>
            <p>{activeSection.description}</p>
          </div>
          <EditorSection
            id="site-config"
            active={activeSection.id === "site-config"}
          >
            {text(
              "Nome do projeto",
              "projectName",
              "Identificação interna no painel",
            )}
            {text("Rota", "slug", "Ex.: meu-produto")}
            <Field
              label="Domínio do site"
              hint="Sem https:// nem barra. Configure o DNS e HTTPS na hospedagem."
            >
              <Input
                value={product.domain}
                placeholder="www.meuproduto.com.br"
                onChange={(e) =>
                  set("domain", e.target.value.toLowerCase().trim())
                }
              />
            </Field>
            <Field label="Título da página (SEO)">
              <Input
                value={product.seoTitle}
                onChange={(e) => set("seoTitle", e.target.value)}
                placeholder={product.title}
              />
            </Field>
            <Field label="Descrição para buscadores">
              <Textarea
                value={product.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
              />
            </Field>
            <Field label="Indexação">
              <Select
                value={product.indexable ? "yes" : "no"}
                onChange={(e) => set("indexable", e.target.value === "yes")}
              >
                <option value="yes">Permitir buscadores</option>
                <option value="no">Não indexar</option>
              </Select>
            </Field>
            <div>
              <strong>Favicon</strong>
              {product.favicon && (
                <img
                  className="media-thumb"
                  src={product.favicon}
                  alt="Favicon atual"
                />
              )}
              <MediaUpload
                siteId={product.mediaId}
                accept="image/png,image/jpeg,image/webp"
                onUploaded={(url) => set("favicon", url)}
              />
              {product.favicon && (
                <Button variant="secondary" onClick={() => set("favicon", "")}>
                  Remover favicon
                </Button>
              )}
            </div>
            <div>
              <strong>Imagem para compartilhamento</strong>
              {product.socialImage && (
                <img
                  className="media-thumb"
                  src={product.socialImage}
                  alt="Imagem de compartilhamento atual"
                />
              )}
              <MediaUpload
                siteId={product.mediaId}
                accept="image/png,image/jpeg,image/webp"
                onUploaded={(url) => set("socialImage", url)}
              />
              {product.socialImage && (
                <Button
                  variant="secondary"
                  onClick={() => set("socialImage", "")}
                >
                  Remover imagem
                </Button>
              )}
            </div>
          </EditorSection>
          <EditorSection
            id="page-content"
            active={activeSection.id === "page-content"}
          >
            {originalSlug ? (
              <p>O título é definido no catálogo do projeto.</p>
            ) : (
              text("Título", "title")
            )}
            {text("Título da faixa promocional", "announcement")}
            {text("Texto de apoio da promoção", "campaignSupport")}
            <strong>Imagem da faixa promocional</strong>
            {product.campaignImage && (
              <img
                className="media-thumb"
                src={product.campaignImage}
                alt="Faixa promocional"
              />
            )}
            <MediaUpload
              siteId={product.mediaId}
              accept="image/png,image/jpeg,image/webp"
              onUploaded={(url) => set("campaignImage", url)}
            />
            {product.campaignImage && (
              <Button
                variant="secondary"
                onClick={() => set("campaignImage", "")}
              >
                Remover imagem da faixa
              </Button>
            )}
            <Field
              label="Mensagens do letreiro"
              hint="Uma mensagem por linha, até oito"
            >
              <Textarea
                rows={4}
                value={product.marqueeItems.join("\n")}
                onChange={(e) =>
                  set("marqueeItems", e.target.value.split("\n"))
                }
              />
            </Field>
            {text("Nome da loja", "brandName")}
            {text("Link do Facebook (opcional)", "facebookUrl")}
            <strong>Logo</strong>
            {product.logo && (
              <img
                className="media-thumb"
                src={product.logo}
                alt="Logo atual"
              />
            )}
            <MediaUpload
              siteId={product.mediaId}
              accept="image/png,image/jpeg,image/webp"
              onUploaded={(url) => set("logo", url)}
            />
            {product.logo && (
              <Button variant="secondary" onClick={() => set("logo", "")}>
                Remover logo
              </Button>
            )}
            <Field label="Cor principal">
              <Input
                type="color"
                value={product.color}
                onChange={(e) => set("color", e.target.value)}
              />
            </Field>
            <div className="field-row">
              {(
                [
                  ["Cor do cabeçalho", "headerColor"],
                  ["Cor do fundo", "backgroundColor"],
                  ["Cor do texto", "textColor"],
                ] as const
              ).map(([label, key]) => (
                <Field label={label} key={key}>
                  <Input
                    type="color"
                    value={product[key]}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </EditorSection>
          <EditorSection
            id="site-media"
            active={activeSection.id === "site-media"}
          >
            <div className="field-row">
              <Field label="Nota (0 a 5)">
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={product.rating}
                  onChange={(e) => set("rating", Number(e.target.value))}
                />
              </Field>
              <Field label="Nº de avaliações">
                <Input
                  type="number"
                  min="0"
                  value={product.reviewCount}
                  onChange={(e) => set("reviewCount", Number(e.target.value))}
                />
              </Field>
            </div>
            <strong>Imagens do produto</strong>
            <div className="media-list">
              {product.images.filter(Boolean).map((image, i) => (
                <div key={`${image}-${i}`}>
                  <img
                    className="media-thumb"
                    src={image}
                    alt={`Imagem ${i + 1}`}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      set(
                        "images",
                        product.images.filter((_, n) => n !== i),
                      )
                    }
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
            {product.images.length < 8 && (
              <MediaUpload
                siteId={product.mediaId}
                accept="image/png,image/jpeg,image/webp"
                onUploaded={(url) =>
                  set("images", [...product.images.filter(Boolean), url])
                }
              />
            )}
            <strong>Vídeo do produto</strong>
            {product.video && (
              <div>
                <video className="media-video" src={product.video} controls />
                <Button variant="secondary" onClick={() => set("video", "")}>
                  Remover vídeo
                </Button>
              </div>
            )}
            <MediaUpload
              siteId={product.mediaId}
              accept="video/mp4"
              onUploaded={(url) => set("video", url)}
            />
            <Field label="Destaques" hint="Um por linha, máximo de quatro">
              <Textarea
                rows={4}
                value={product.benefits.join("\n")}
                onChange={(e) => set("benefits", e.target.value.split("\n"))}
              />
            </Field>
          </EditorSection>
          <EditorSection
            id="site-navigation"
            active={activeSection.id === "site-navigation"}
          >
            {(
              [
                ["Início", "home"],
                ["Produto", "product"],
                ["Como funciona", "routine"],
                ["Opiniões", "reviews"],
                ["Perguntas", "faq"],
              ] as const
            ).map(([label, key]) => (
              <Field label={label} key={key}>
                <Input
                  value={product.navigation[key]}
                  onChange={(e) =>
                    set("navigation", {
                      ...product.navigation,
                      [key]: e.target.value,
                    })
                  }
                />
              </Field>
            ))}
          </EditorSection>
          <EditorSection
            id="site-products"
            active={activeSection.id === "site-products"}
          >
            {originalSlug && (
              <p>
                Nome, preço e disponibilidade são definidos no{" "}
                <Link
                  href={`/admin/projetos/${encodeURIComponent(originalSlug)}/produtos`}
                >
                  catálogo do projeto
                </Link>
                . Este template exibe até duas variantes.
              </p>
            )}
            {product.options.map((o, i) => (
              <fieldset className="option-fields" key={i}>
                <legend>Produto {i + 1}</legend>
                {(
                  [
                    ["Nome", "name"],
                    ["Descrição", "detail"],
                    ["Etiqueta", "badge"],
                  ] as const
                ).map(([label, key]) => (
                  <Field label={label} key={key}>
                    <Input
                      value={o[key]}
                      readOnly={Boolean(originalSlug && key === "name")}
                      onChange={(e) => option(i, key, e.target.value)}
                    />
                  </Field>
                ))}
                <div className="field-row">
                  <Field label="Preço (centavos)">
                    <Input
                      type="number"
                      min="0"
                      readOnly={Boolean(originalSlug)}
                      value={o.price}
                      onChange={(e) =>
                        option(i, "price", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Preço original (centavos)">
                    <Input
                      type="number"
                      min="0"
                      readOnly={Boolean(originalSlug)}
                      value={o.originalPrice}
                      onChange={(e) =>
                        option(i, "originalPrice", Number(e.target.value))
                      }
                    />
                  </Field>
                </div>
                {!originalSlug && product.options.length > 1 && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      set(
                        "options",
                        product.options.filter((_, n) => n !== i),
                      )
                    }
                  >
                    Remover produto
                  </Button>
                )}
              </fieldset>
            ))}
            {!originalSlug && product.options.length < 2 && (
              <Button
                variant="secondary"
                onClick={() =>
                  set("options", [
                    ...product.options,
                    {
                      name: "Novo produto",
                      detail: "",
                      badge: "",
                      price: 1000,
                      originalPrice: 1000,
                      available: true,
                    },
                  ])
                }
              >
                + Adicionar produto
              </Button>
            )}
            {text("Texto do botão", "buttonText")}
            <Field label="Tipo de contagem regressiva">
              <Select
                value={product.offerTimerMode}
                onChange={(e) =>
                  set(
                    "offerTimerMode",
                    e.target.value as Product["offerTimerMode"],
                  )
                }
              >
                <option value="date">Data e hora fixas</option>
                <option value="duration">Duração por visita</option>
              </Select>
            </Field>
            {product.offerTimerMode === "date" ? (
              <Field label="Fim da oferta" hint="Horário local; opcional">
                <Input
                  type="datetime-local"
                  value={
                    product.offerEndsAt
                      ? new Date(
                          new Date(product.offerEndsAt).getTime() -
                            new Date(product.offerEndsAt).getTimezoneOffset() *
                              60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    set(
                      "offerEndsAt",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : "",
                    )
                  }
                />
              </Field>
            ) : (
              <Field
                label="Duração da contagem (minutos)"
                hint="Reinicia ao atualizar ou abrir a página. Ex.: 120 minutos = 2 horas."
              >
                <Input
                  type="number"
                  min={1}
                  max={10080}
                  step={1}
                  value={product.offerDurationMinutes}
                  onChange={(e) =>
                    set("offerDurationMinutes", Number(e.target.value))
                  }
                />
              </Field>
            )}
          </EditorSection>
          <EditorSection
            id="site-trust"
            active={activeSection.id === "site-trust"}
          >
            {product.trustItems.map((item, i) => (
              <fieldset className="option-fields" key={i}>
                <legend>Informação {i + 1}</legend>
                <Field label="Título">
                  <Input
                    value={item.title}
                    onChange={(e) =>
                      set(
                        "trustItems",
                        product.trustItems.map((v, n) =>
                          n === i ? { ...v, title: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Texto">
                  <Input
                    value={item.text}
                    onChange={(e) =>
                      set(
                        "trustItems",
                        product.trustItems.map((v, n) =>
                          n === i ? { ...v, text: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </Field>
              </fieldset>
            ))}
          </EditorSection>
          <EditorSection
            id="site-routine"
            active={activeSection.id === "site-routine"}
          >
            {text("Título", "routineTitle")}
            {text("Texto", "routineText")}
            {product.routineBenefits.map((b, i) => (
              <fieldset className="option-fields" key={i}>
                <legend>Benefício {i + 1}</legend>
                <Field label="Título">
                  <Input
                    value={b.title}
                    onChange={(e) =>
                      set(
                        "routineBenefits",
                        product.routineBenefits.map((item, n) =>
                          n === i ? { ...item, title: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Texto">
                  <Textarea
                    value={b.text}
                    onChange={(e) =>
                      set(
                        "routineBenefits",
                        product.routineBenefits.map((item, n) =>
                          n === i ? { ...item, text: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Button
                  variant="secondary"
                  onClick={() =>
                    set(
                      "routineBenefits",
                      product.routineBenefits.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remover
                </Button>
              </fieldset>
            ))}
            {product.routineBenefits.length < 4 && (
              <Button
                variant="secondary"
                onClick={() =>
                  set("routineBenefits", [
                    ...product.routineBenefits,
                    { title: "", text: "" },
                  ])
                }
              >
                + Benefício
              </Button>
            )}
          </EditorSection>
          <EditorSection id="site-faq" active={activeSection.id === "site-faq"}>
            {product.faq.map((f, i) => (
              <fieldset className="option-fields" key={i}>
                <legend>Pergunta {i + 1}</legend>
                <Field label="Pergunta">
                  <Input
                    value={f.question}
                    onChange={(e) =>
                      set(
                        "faq",
                        product.faq.map((item, n) =>
                          n === i
                            ? { ...item, question: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Resposta">
                  <Textarea
                    value={f.answer}
                    onChange={(e) =>
                      set(
                        "faq",
                        product.faq.map((item, n) =>
                          n === i ? { ...item, answer: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Button
                  variant="secondary"
                  onClick={() =>
                    set(
                      "faq",
                      product.faq.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remover
                </Button>
              </fieldset>
            ))}
            {product.faq.length < 12 && (
              <Button
                variant="secondary"
                onClick={() =>
                  set("faq", [...product.faq, { question: "", answer: "" }])
                }
              >
                + Pergunta
              </Button>
            )}
          </EditorSection>
          <EditorSection
            id="site-reviews"
            active={activeSection.id === "site-reviews"}
          >
            {text("Título da seção", "reviewTitle")}
            {text("Texto da seção", "reviewText")}
            {product.reviews.map((r, i) => (
              <fieldset className="option-fields" key={i}>
                <legend>Avaliação {i + 1}</legend>
                {(
                  [
                    ["Título", "title"],
                    ["Texto", "text"],
                    ["Autor", "author"],
                  ] as const
                ).map(([label, key]) => (
                  <Field label={label} key={key}>
                    <Input
                      value={r[key]}
                      onChange={(e) =>
                        set(
                          "reviews",
                          product.reviews.map((item, n) =>
                            n === i ? { ...item, [key]: e.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                ))}
                <MediaUpload
                  siteId={product.mediaId}
                  accept="image/png,image/jpeg,image/webp"
                  onUploaded={(url) =>
                    set(
                      "reviews",
                      product.reviews.map((item, n) =>
                        n === i ? { ...item, image: url } : item,
                      ),
                    )
                  }
                />
                {r.image && (
                  <div>
                    <img
                      className="media-thumb"
                      src={r.image}
                      alt={`Imagem da avaliação ${i + 1}`}
                    />
                    <Button
                      variant="secondary"
                      onClick={() =>
                        set(
                          "reviews",
                          product.reviews.map((item, n) =>
                            n === i ? { ...item, image: "" } : item,
                          ),
                        )
                      }
                    >
                      Remover imagem
                    </Button>
                  </div>
                )}
                <Field label="Estrelas">
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={r.rating}
                    onChange={(e) =>
                      set(
                        "reviews",
                        product.reviews.map((item, n) =>
                          n === i
                            ? { ...item, rating: Number(e.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Button
                  variant="secondary"
                  onClick={() =>
                    set(
                      "reviews",
                      product.reviews.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remover
                </Button>
              </fieldset>
            ))}
            {product.reviews.length < 12 && (
              <Button
                variant="secondary"
                onClick={() =>
                  set("reviews", [
                    ...product.reviews,
                    { title: "", text: "", author: "", image: "", rating: 5 },
                  ])
                }
              >
                + Avaliação
              </Button>
            )}
          </EditorSection>
          <EditorSection
            id="site-footer"
            active={activeSection.id === "site-footer"}
          >
            {text("Frase do rodapé", "footerText")}
          </EditorSection>
          <Button disabled={pending} onClick={save}>
            {pending ? "Salvando…" : "Salvar produto"}
          </Button>
        </div>
      </aside>
      {showPreview && (
        <div className="preview">
          <div className="preview-label">PRÉVIA DA PÁGINA</div>
          <Storefront product={product} preview />
        </div>
      )}
    </div>
  );
}
