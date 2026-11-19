"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";
export function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const galleryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const stage = gallery.querySelector<HTMLElement>("[data-gallery-stage]"),
      main = gallery.querySelector<HTMLImageElement>("[data-gallery-image]"),
      incoming = gallery.querySelector<HTMLImageElement>(
        "[data-gallery-incoming]",
      ),
      thumbs = Array.from(
        gallery.querySelectorAll<HTMLButtonElement>("[data-gallery-thumb]"),
      );
    if (!stage || !main || !incoming || !thumbs.length) return;
    const abort = new AbortController();
    let currentIndex = Math.max(
        0,
        thumbs.findIndex((t) => t.getAttribute("aria-pressed") === "true"),
      ),
      displayedIndex = currentIndex,
      timer = 0,
      frame = 0,
      touchStartX: number | null = null,
      pending: { thumb: HTMLButtonElement; direction: string } | null = null;
    function finish() {
      if (stage!.dataset.galleryAnimating !== "true") return;
      window.clearTimeout(timer);
      main!.src = incoming!.src;
      main!.alt = incoming!.alt;
      displayedIndex = thumbs.findIndex(
        (t) => t.dataset.image === incoming!.src,
      );
      stage!.removeAttribute("data-gallery-animating");
      stage!.removeAttribute("data-gallery-direction");
      incoming!.removeAttribute("src");
      const next = pending;
      pending = null;
      if (next) transition(next.thumb, next.direction);
    }
    function transition(thumb: HTMLButtonElement, direction: string) {
      const index = thumbs.indexOf(thumb);
      if (index < 0 || index === displayedIndex) return;
      incoming!.src = thumb.dataset.image ?? "";
      incoming!.alt = thumb.dataset.alt ?? "";
      stage!.dataset.galleryDirection =
        direction || (index > displayedIndex ? "next" : "previous");
      stage!.dataset.galleryAnimating = "preparing";
      void incoming!.offsetWidth;
      window.clearTimeout(timer);
      frame = window.requestAnimationFrame(() => {
        stage!.dataset.galleryAnimating = "true";
        timer = window.setTimeout(finish, 480);
      });
    }
    function select(thumb: HTMLButtonElement, direction?: string) {
      const index = thumbs.indexOf(thumb);
      if (index < 0) return;
      const motion = direction || (index > currentIndex ? "next" : "previous");
      currentIndex = index;
      thumbs.forEach((t) =>
        t.setAttribute("aria-pressed", String(t === thumb)),
      );
      if (
        displayedIndex === index &&
        !stage!.hasAttribute("data-gallery-animating")
      )
        return;
      if (stage!.hasAttribute("data-gallery-animating")) {
        pending = { thumb, direction: motion };
        return;
      }
      transition(thumb, motion);
    }
    function move(step: number) {
      select(
        thumbs[(currentIndex + step + thumbs.length) % thumbs.length],
        step > 0 ? "next" : "previous",
      );
    }
    const signal = abort.signal;
    incoming.addEventListener(
      "transitionend",
      (e) => {
        if (e.propertyName === "transform") finish();
      },
      { signal },
    );
    thumbs.forEach((t) =>
      t.addEventListener("click", () => select(t), { signal }),
    );
    gallery
      .querySelector("[data-gallery-prev]")
      ?.addEventListener("click", () => move(-1), { signal });
    gallery
      .querySelector("[data-gallery-next]")
      ?.addEventListener("click", () => move(1), { signal });
    stage.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].clientX;
      },
      { signal, passive: true },
    );
    stage.addEventListener(
      "touchend",
      (e) => {
        if (touchStartX === null) return;
        const distance = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
        touchStartX = null;
      },
      { signal, passive: true },
    );
    return () => {
      abort.abort();
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [images]);
  return (
    <div
      className="hero__visual product-gallery"
      data-product-gallery
      ref={galleryRef}
    >
      <div className="product-gallery__main" data-gallery-stage>
        {images[0] && (
          <img
            className="hero__image"
            src={images[0]}
            alt={title}
            width="900"
            height="900"
            fetchPriority="high"
            data-gallery-image
          />
        )}
        <img
          className="hero__image product-gallery__incoming-image"
          alt=""
          aria-hidden="true"
          width="900"
          height="900"
          data-gallery-incoming
        />
        <button
          className="product-gallery__nav product-gallery__nav--prev"
          type="button"
          data-gallery-prev
          aria-label="Ver imagem anterior"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          className="product-gallery__nav product-gallery__nav--next"
          type="button"
          data-gallery-next
          aria-label="Ver próxima imagem"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
      <div
        className="product-gallery__thumbs"
        aria-label="Imagens do produto"
        role="group"
      >
        {images.map((src, i) => (
          <button
            className="product-gallery__thumb"
            type="button"
            key={`${src}-${i}`}
            data-gallery-thumb
            data-gallery-variant={`image-${i + 1}`}
            data-image={src}
            data-alt={title}
            aria-label={`Ver imagem ${i + 1}`}
            aria-pressed={i === 0}
          >
            <img src={src} alt="" width="110" height="110" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
