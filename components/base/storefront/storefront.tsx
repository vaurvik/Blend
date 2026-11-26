"use client";
/* eslint-disable @next/next/no-img-element */
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import type { Product } from "@/src/catalog/model";
import { useRouter } from "next/navigation";
import { Gallery } from "./gallery";
import { RoutineVideo } from "./routine-video";
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value / 100,
  );
function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 3h2.2l2.2 12.2h11.9L21 7H6" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}
function Countdown({
  endsAt,
  mode,
  durationMinutes,
}: {
  endsAt: string;
  mode: Product["offerTimerMode"];
  durationMinutes: number;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (mode === "date" && !endsAt) return;
    const deadline =
      mode === "duration"
        ? Date.now() + durationMinutes * 60000
        : Date.parse(endsAt);
    const update = () => setRemaining(Math.max(0, deadline - Date.now()));
    const frame = window.requestAnimationFrame(update);
    const id = window.setInterval(update, 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(id);
    };
  }, [endsAt, mode, durationMinutes]);
  if (mode === "date" && !endsAt) return null;
  const secs = Math.floor((remaining ?? 0) / 1000),
    values = [
      Math.floor(secs / 86400),
      Math.floor((secs % 86400) / 3600),
      Math.floor((secs % 3600) / 60),
      secs % 60,
    ],
    labels = ["DIAS", "H", "MIN", "SEG"];
  return (
    <div
      className="spring-sale__countdown"
      data-countdown
      aria-label="Contagem regressiva da oferta"
    >
      <span className="spring-sale__countdown-label" data-countdown-label>
        {remaining !== null && remaining <= 0
          ? "OFERTA ENCERRADA"
          : "OFERTA TERMINA EM"}
      </span>
      <time
        className="spring-sale__digits"
        data-countdown-time
        aria-live="off"
        aria-label={`${values[0]} dias, ${values[1]} horas, ${values[2]} minutos e ${values[3]} segundos`}
      >
        {values.map((value, i) => (
          <span key={labels[i]} style={{ display: "contents" }}>
            {i > 0 && (
              <span
                className={`spring-sale__separator${i === 3 ? " spring-sale__seconds-separator" : ""}`}
                aria-hidden="true"
              >
                :
              </span>
            )}
            <span
              className={`spring-sale__unit${i === 3 ? " spring-sale__seconds" : ""}`}
            >
              <b>{String(value).padStart(2, "0")}</b>
              <small>{labels[i]}</small>
            </span>
          </span>
        ))}
      </time>
    </div>
  );
}
function Promo({ product }: { product: Product }) {
  if (!product.announcement) return null;
  const discount = Math.max(
    0,
    ...product.options.map((o) =>
      o.originalPrice > o.price
        ? Math.round((1 - o.price / o.originalPrice) * 100)
        : 0,
    ),
  );
  return (
    <div className="shopify-section">
      <section
        className="spring-sale full-width"
        style={
          {
            "--spring-orange": product.color,
            backgroundImage: product.campaignImage
              ? `linear-gradient(rgba(239, 120, 0, 0.55), rgba(239, 120, 0, 0.55)), url(${JSON.stringify(product.campaignImage)})`
              : undefined,
            backgroundPosition: "center",
            backgroundSize: "auto, auto 300px",
          } as CSSProperties
        }
        aria-label={product.announcement}
      >
        <div className="spring-sale__inner">
          <div className="spring-sale__campaign" aria-hidden="true">
            <span className="spring-sale__campaign-mark">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                <path d="M15 10v3h6" />
              </svg>
            </span>
            <span className="spring-sale__campaign-name">
              {product.announcement}
            </span>
          </div>
          <div className="spring-sale__offer">
            {discount > 0 && (
              <>
                <div
                  className="spring-sale__discount"
                  aria-label={`${discount} por cento de desconto`}
                >
                  <strong>{discount}% OFF</strong>
                </div>
                <span className="spring-sale__coverage">
                  {product.campaignSupport}
                </span>
              </>
            )}
          </div>
          <Countdown
            endsAt={product.offerEndsAt}
            mode={product.offerTimerMode}
            durationMinutes={product.offerDurationMinutes}
          />
        </div>
      </section>
    </div>
  );
}
function Marquee({ items }: { items: string[] }) {
  const messages = items.filter(Boolean);
  if (!messages.length) return null;
  return (
    <div className="shopify-section">
      <section
        className="cesto-marquee full-width"
        aria-label="Destaques da loja"
      >
        <div className="cesto-marquee__viewport">
          <div className="cesto-marquee__track" aria-hidden="true">
            {[0, 1].map((group) => (
              <div className="cesto-marquee__group" key={group}>
                {[0, 1, 2, 3].flatMap((repeat) =>
                  messages.map((message, index) => (
                    <span
                      className="cesto-marquee__item"
                      key={`${repeat}-${index}`}
                    >
                      {message}
                      <span
                        className="cesto-marquee__separator"
                        aria-hidden="true"
                      >
                        ●
                      </span>
                    </span>
                  )),
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="cesto-marquee__sr-only">{messages.join(". ")}</p>
      </section>
    </div>
  );
}
function FaqIcon({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <svg viewBox="0 0 24 24">
          <path d="M5 21V4h11v17M3 21h18M9 8h3M9 12h3M9 16h3M18 8v13" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 24 24">
          <path d="M4 5h16v16H4zM8 9h8M8 13h8M8 17h5M7 2v3M17 2v3" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 24 24">
          <path d="M5 21V4h11v17M3 21h18M9 8h3M18 8v13" />
        </svg>
      );
    case 3:
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M3.5 8h17M3.5 16h17M12 3c3 3 4.5 6 4.5 9S15 18 12 21M12 3c-3 3-4.5 6-4.5 9S9 18 12 21" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2M9 2h6" />
        </svg>
      );
  }
}
function Faq({ items }: { items: Product["faq"] }) {
  const [open, setOpen] = useState<number[]>([]);
  if (!items.length) return null;
  return (
    <div
      className="hero-faq"
      id="Perguntas"
      aria-label="Perguntas frequentes sobre o produto"
      data-hero-faq
    >
      {items.map((item, i) => {
        const expanded = open.includes(i);
        return (
          <div
            className={`hero-faq__item${expanded ? " is-open" : ""}`}
            data-faq-item
            key={i}
          >
            <button
              className="hero-faq__trigger"
              type="button"
              aria-expanded={expanded}
              aria-controls={`faq-answer-${i}`}
              data-faq-trigger
              onClick={() =>
                setOpen((prev) =>
                  expanded ? prev.filter((x) => x !== i) : [...prev, i],
                )
              }
            >
              <span className="hero-faq__icon" aria-hidden="true">
                <FaqIcon index={i} />
              </span>
              <span className="hero-faq__question">{item.question}</span>
              <svg
                className="hero-faq__chevron"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div
              className="hero-faq__answer"
              id={`faq-answer-${i}`}
              aria-hidden={!expanded}
            >
              <div
                className="hero-faq__answer-inner"
                style={{ whiteSpace: "pre-line" }}
              >
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function TrustIcon({ index }: { index: number }) {
  if (index === 0)
    return (
      <svg viewBox="0 0 32 32">
        <path d="M16 3 27 7v8c0 7-4.5 11-11 14C9.5 26 5 22 5 15V7z" />
        <path d="m10 16 4 4 8-9" />
      </svg>
    );
  if (index === 1)
    return (
      <svg viewBox="0 0 32 32">
        <path d="M3 7h17v16H3zM20 13h5l5 5v5H20z" />
        <circle cx="9" cy="24" r="3" />
        <circle cx="25" cy="24" r="3" />
      </svg>
    );
  return (
    <svg viewBox="0 0 32 32">
      <path d="M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26Z" />
      <path d="M16 9v8l5 3" />
    </svg>
  );
}
function Benefit({ title, text }: { title: string; text: string }) {
  return (
    <article className="cesto-routine__benefit">
      <span className="cesto-routine__check" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="m7 12.5 3.2 3.2L17.5 8" />
        </svg>
      </span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}
function ReviewStars({ rating }: { rating: number }) {
  return (
    <div
      className="customer-card__rating"
      role="img"
      aria-label={`Avaliação: ${rating} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={i <= rating ? "is-filled" : undefined}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m12 2.8 2.83 5.74 6.34.92-4.59 4.47 1.08 6.31L12 17.26l-5.66 2.98 1.08-6.31-4.59-4.47 6.34-.92L12 2.8Z" />
        </svg>
      ))}
    </div>
  );
}
export function Storefront({
  product,
  preview = false,
  checkoutEnabled = false,
  supportsCard = true,
}: {
  product: Product;
  preview?: boolean;
  checkoutEnabled?: boolean;
  supportsCard?: boolean;
}) {
  const router = useRouter();
  const [option, setOption] = useState(() =>
      Math.max(
        0,
        product.options.findIndex((item) => item.available),
      ),
    ),
    [menu, setMenu] = useState(false),
    [sticky, setSticky] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const images = useMemo(
    () => product.images.filter(Boolean),
    [product.images],
  );
  const selected =
    product.options[Math.min(option, product.options.length - 1)];
  const displayedStars = Math.max(
    0,
    Math.min(5, Math.round(product.rating) || 0),
  );
  const checkout = `/checkout/${encodeURIComponent(product.slug)}?option=${Math.min(option, product.options.length - 1)}`;
  useEffect(() => {
    if (preview) return;
    const update = () =>
      setSticky(
        !!buttonRef.current &&
          buttonRef.current.getBoundingClientRect().bottom <= 0 &&
          window.scrollY >= 160,
      );
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const frame = window.requestAnimationFrame(update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [preview]);
  function buy(event: FormEvent) {
    event.preventDefault();
    if (!preview && checkoutEnabled && selected.available)
      router.push(checkout);
  }
  return (
    <div
      className={`storefront${preview ? " storefront--preview" : ""}`}
      style={
        {
          "--cesto-orange": product.color,
          "--cesto-ink": product.textColor,
          "--font-primary--family": "'IBM Plex Sans', sans-serif",
          "--page-width": "90rem",
          "--page-margin": "20px",
          "--color-background": product.backgroundColor,
          "--color-foreground": product.textColor,
          "--style-border-radius-inputs": "4px",
        } as CSSProperties
      }
    >
      <Promo product={product} />
      <div className="shopify-section">
        <header
          className="site-header full-width"
          style={{ background: product.headerColor }}
        >
          <div className="site-header__inner">
            <a
              className="brand"
              href="#Produto"
              aria-label={`${product.brandName} — início`}
            >
              {product.logo && (
                <img
                  className="brand__logo"
                  src={product.logo}
                  alt={product.brandName}
                  width="72"
                  height="72"
                  fetchPriority="high"
                />
              )}
            </a>
            <nav
              className={`site-nav${menu ? " is-open" : ""}`}
              id="SiteNav"
              aria-label="Navegação principal"
            >
              <a href="#Produto">{product.navigation.home}</a>
              <a href="#Produto">{product.navigation.product}</a>
              <a href="#Como-funciona">{product.navigation.routine}</a>
              <a href="#Opinioes">{product.navigation.reviews}</a>
              <a href="#Perguntas">{product.navigation.faq}</a>
            </nav>
            <div className="site-header__tools">
              <a
                className="icon-link cart-link"
                href={checkoutEnabled && !preview ? checkout : "#Produto"}
                aria-label="Ir para compra"
              >
                <CartIcon />
                <span className="cart-count" hidden>
                  0
                </span>
              </a>
              <button
                className="icon-link menu-toggle"
                type="button"
                aria-expanded={menu}
                aria-controls="SiteNav"
                aria-label={menu ? "Fechar menu" : "Abrir menu"}
                onClick={() => setMenu(!menu)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
            </div>
          </div>
        </header>
      </div>
      <Marquee items={product.marqueeItems} />
      <main>
        <div className="shopify-section">
          <section
            className="hero section-pad full-width hero--product-detail"
            id="Produto"
            data-product-hero
            style={{ backgroundColor: product.backgroundColor }}
          >
            <Gallery images={images} title={product.title} />
            <div className="hero__content">
              {product.rating > 0 && (
                <div className="product-rating-row">
                  <p
                    className="product-rating"
                    aria-label={`Avaliação média do produto: ${product.rating.toFixed(1)} de 5`}
                  >
                    <span className="product-rating__stars" aria-hidden="true">
                      {"★".repeat(displayedStars)}
                      {"☆".repeat(5 - displayedStars)}
                    </span>
                    <span>
                      <strong>
                        {product.rating.toFixed(1).replace(".", ",")}/5
                      </strong>{" "}
                      ·{" "}
                      <span>
                        {product.reviewCount.toLocaleString("pt-BR")} avaliações
                      </span>
                    </span>
                  </p>
                  <div
                    className="hero-payment-icons"
                    aria-label="Formas de pagamento aceitas"
                  >
                    {[
                      "pix",
                      ...(supportsCard ? ["mastercard", "visa"] : []),
                    ].map((x) => (
                      <span
                        className={`hero-payment-icons__brand hero-payment-icons__brand--${x}`}
                        key={x}
                      >
                        <img
                          src={`/assets/storefront/payment-${x}.svg`}
                          alt={x}
                          width={x === "pix" ? 24 : 32}
                          height={x === "pix" ? 24 : 32}
                          loading="lazy"
                        />
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <h1 className="hero__headline--home">{product.title}</h1>
              <ul
                className="product-highlights"
                aria-label="Destaques do produto"
              >
                {product.benefits.filter(Boolean).map((text, i) => (
                  <li key={i}>
                    <span aria-hidden="true">✓</span>
                    {text}
                  </li>
                ))}
              </ul>
              <form
                id="CestoProductForm"
                className="product-form"
                data-product-form
                onSubmit={buy}
              >
                <fieldset
                  className="variant-picker"
                  aria-label="Opção do produto"
                >
                  {product.options.map((o, i) => (
                    <Fragment key={i}>
                      <input
                        className="variant-option-radio"
                        type="radio"
                        id={`CestoVariant-${i}`}
                        name="id"
                        value={i}
                        data-gallery-key={i === 1 ? "190" : "100"}
                        checked={i === option}
                        disabled={!o.available}
                        onChange={() => setOption(i)}
                      />
                      <label
                        className="variant-option"
                        htmlFor={`CestoVariant-${i}`}
                      >
                        <span className="variant-option__heading">
                          <span className="variant-option__title">
                            {o.name}
                            {!o.available && " · Indisponível"}
                          </span>
                          {o.badge && (
                            <span className="variant-option__badge">
                              {o.badge}
                            </span>
                          )}
                        </span>
                        <span className="variant-option__detail">
                          {o.detail}
                        </span>
                        <span className="variant-option__prices">
                          <strong className="variant-option__price">
                            {money(o.price)}
                          </strong>
                          {o.originalPrice > o.price && (
                            <span className="variant-option__sale">
                              <s>{money(o.originalPrice)}</s>
                              <em>
                                {Math.round(
                                  (1 - o.price / o.originalPrice) * 100,
                                )}
                                % OFF
                              </em>
                            </span>
                          )}
                        </span>
                      </label>
                    </Fragment>
                  ))}
                </fieldset>
                <p className="hero__price" aria-live="polite">
                  <strong>{money(selected.price)}</strong>
                  <s hidden={selected.originalPrice <= selected.price}>
                    {money(selected.originalPrice)}
                  </s>
                </p>
                <button
                  ref={buttonRef}
                  type="submit"
                  name="add"
                  className="button button--primary"
                  data-add-button
                  disabled={
                    !selected.available || (!preview && !checkoutEnabled)
                  }
                >
                  <CartIcon />
                  <span>{product.buttonText}</span>
                  <span aria-hidden="true">→</span>
                </button>
                {!preview && !checkoutEnabled && (
                  <p className="storefront-checkout-note">
                    Pagamento ainda não disponível.
                  </p>
                )}
                <Faq items={product.faq} />
              </form>
              <div
                className={`product-sticky-atc${sticky ? " is-visible" : ""}`}
                data-sticky-atc
                aria-hidden={!sticky}
                inert={!sticky}
              >
                <div className="product-sticky-atc__product">
                  {images[0] && (
                    <img
                      className="product-sticky-atc__image"
                      src={images[0]}
                      alt={product.title}
                      width="56"
                      height="56"
                      loading="lazy"
                    />
                  )}
                  <div className="product-sticky-atc__info">
                    <strong className="product-sticky-atc__title">
                      {product.title}
                    </strong>
                    {product.options.length > 1 && (
                      <>
                        <label
                          className="product-sticky-atc__variant-label"
                          htmlFor="StickyVariant"
                        >
                          Produto
                        </label>
                        <select
                          className="product-sticky-atc__variant-select"
                          id="StickyVariant"
                          aria-label="Selecionar produto"
                          value={option}
                          onChange={(e) => setOption(Number(e.target.value))}
                        >
                          {product.options.map((o, i) => (
                            <option value={i} key={i} disabled={!o.available}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
                <div className="product-sticky-atc__offer">
                  <strong className="product-sticky-atc__price">
                    {money(selected.price)}
                  </strong>
                  {selected.originalPrice > selected.price && (
                    <>
                      <span className="product-sticky-atc__compare">
                        {money(selected.originalPrice)}
                      </span>
                      <span className="product-sticky-atc__discount">
                        {Math.round(
                          (1 - selected.price / selected.originalPrice) * 100,
                        )}
                        % OFF
                      </span>
                    </>
                  )}
                </div>
                <div className="product-sticky-atc__trust">
                  <span className="product-sticky-atc__trust-label">
                    Pagamento seguro
                  </span>
                  <div
                    className="product-sticky-atc__payments"
                    aria-label="Formas de pagamento"
                  >
                    {[
                      "pix",
                      ...(supportsCard ? ["mastercard", "visa"] : []),
                    ].map((x) => (
                      <img
                        src={`/assets/storefront/payment-${x}.svg`}
                        alt={x}
                        width={x === "pix" ? 20 : 28}
                        height={x === "pix" ? 20 : 28}
                        loading="lazy"
                        key={x}
                      />
                    ))}
                  </div>
                </div>
                <button
                  className="button button--primary product-sticky-atc__button"
                  type="button"
                  tabIndex={sticky ? 0 : -1}
                  disabled={!checkoutEnabled || !selected.available}
                  onClick={() => buttonRef.current?.click()}
                >
                  <CartIcon />
                  <span>{product.buttonText}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
        <div className="shopify-section">
          <section
            className="trust-bar section-pad full-width"
            aria-label="Informações de compra"
            style={{ backgroundColor: product.backgroundColor }}
          >
            {product.trustItems.map((item, i) => (
              <div className="trust-item" key={i}>
                <span className="trust-item__icon" aria-hidden="true">
                  <TrustIcon index={i} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </section>
        </div>
        <div className="shopify-section">
          <section
            className="cesto-routine section-pad full-width"
            id="Como-funciona"
            aria-labelledby="CestoRoutineHeading"
            style={{ backgroundColor: product.backgroundColor }}
          >
            <header className="cesto-routine__header">
              <h2 id="CestoRoutineHeading">{product.routineTitle}</h2>
              {product.routineText && <p>{product.routineText}</p>}
            </header>
            <div className="cesto-routine__grid">
              <div className="cesto-routine__benefits cesto-routine__benefits--left">
                {product.routineBenefits.slice(0, 2).map((b, i) => (
                  <Benefit key={i} {...b} />
                ))}
              </div>
              {product.video && (
                <RoutineVideo
                  src={product.video}
                  poster={images[0] ?? ""}
                  title={product.title}
                />
              )}
              <div className="cesto-routine__benefits cesto-routine__benefits--right">
                {product.routineBenefits.slice(2, 4).map((b, i) => (
                  <Benefit key={i} {...b} />
                ))}
              </div>
            </div>
          </section>
        </div>
        {product.reviews.length > 0 && (
          <div className="shopify-section">
            <section
              className="customers-section full-width"
              id="Opinioes"
              aria-labelledby="CustomersHeading"
              style={{ backgroundColor: product.backgroundColor }}
            >
              <div className="customers-section__inner">
                <header className="customers-section__heading">
                  <h2 id="CustomersHeading">{product.reviewTitle}</h2>
                  {product.reviewText && <p>{product.reviewText}</p>}
                </header>
                <p className="customers-section__hint">
                  <span aria-hidden="true">↔</span> Deslize para ver as outras
                  opiniões
                </p>
                <div className="customers-section__grid">
                  {product.reviews.map((review, i) => (
                    <article className="customer-card" key={i}>
                      <div className="customer-card__image">
                        {review.image && (
                          <img
                            className="customer-card__photo"
                            src={review.image}
                            alt={review.title || "Foto da avaliação do produto"}
                            width="960"
                            height="1280"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                      <div className="customer-card__content">
                        <ReviewStars rating={review.rating} />
                        {review.title && <h3>{review.title}</h3>}
                        {review.text && (
                          <p style={{ whiteSpace: "pre-line" }}>
                            {review.text}
                          </p>
                        )}
                        {review.author && (
                          <div className="customer-card__author">
                            {review.author}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
      <div className="shopify-section">
        <footer
          className="site-footer full-width"
          style={{ background: product.headerColor }}
        >
          <div className="site-footer__top">
            <a
              className="brand"
              href="#Produto"
              aria-label={`${product.brandName} — início`}
            >
              {product.logo && (
                <img
                  className="brand__logo"
                  src={product.logo}
                  alt={product.brandName}
                  width="72"
                  height="72"
                  loading="lazy"
                />
              )}
            </a>
            <nav className="footer-nav" aria-label="Navegação do rodapé">
              <a href="#Produto">{product.navigation.home}</a>
              <a href="#Produto">{product.navigation.product}</a>
              <a href="#Como-funciona">{product.navigation.routine}</a>
              <a href="#Opinioes">{product.navigation.reviews}</a>
              <a href="#Perguntas">{product.navigation.faq}</a>
            </nav>
            {product.facebookUrl && (
              <div className="social-links" aria-label="Redes sociais">
                <a
                  href={product.facebookUrl}
                  aria-label={`Facebook ${product.brandName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src="/assets/storefront/facebook-icon.png"
                    alt=""
                    width="24"
                    height="24"
                    loading="lazy"
                  />
                </a>
              </div>
            )}
          </div>
          <div className="site-footer__bottom">
            <span>{product.footerText}</span>
            <span>
              © {new Date().getFullYear()} {product.brandName}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
