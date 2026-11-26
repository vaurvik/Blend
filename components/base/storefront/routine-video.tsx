"use client";
import { useEffect, useRef } from "react";
export function RoutineVideo({
  src,
  poster,
  title,
}: {
  src: string;
  poster: string;
  title: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const abort = new AbortController(),
      signal = abort.signal;
    let timer = 0;
    const start = () => {
      if (document.visibilityState === "hidden" || video.error) return;
      video.play()?.catch(() => {
        video.controls = true;
        video.classList.remove("is-buffering");
      });
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.controls = true;
      return () => abort.abort();
    }
    video.muted = true;
    video.loop = false;
    video.addEventListener(
      "waiting",
      () => video.classList.add("is-buffering"),
      { signal },
    );
    video.addEventListener(
      "playing",
      () => {
        video.classList.remove("is-buffering");
        video.controls = false;
      },
      { signal },
    );
    video.addEventListener(
      "error",
      () => {
        video.classList.remove("is-buffering");
        video.classList.add("is-failed");
      },
      { signal },
    );
    video.addEventListener(
      "ended",
      () => {
        video.currentTime = 0;
        start();
      },
      { signal },
    );
    video.addEventListener(
      "stalled",
      () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (video.paused && document.visibilityState === "visible") start();
        }, 1200);
      },
      { signal },
    );
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) =>
              entries.forEach((entry) =>
                entry.isIntersecting ? start() : video.pause(),
              ),
            { rootMargin: "120px 0px" },
          )
        : null;
    if (observer) observer.observe(video);
    else start();
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "visible") {
          const rect = video.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) start();
        } else video.pause();
      },
      { signal },
    );
    return () => {
      abort.abort();
      observer?.disconnect();
      window.clearTimeout(timer);
      video.pause();
    };
  }, [src]);
  return (
    <div
      className="cesto-routine__media"
      style={
        {
          "--routine-poster": `url(${JSON.stringify(poster)})`,
        } as React.CSSProperties
      }
    >
      <video
        ref={ref}
        className="cesto-routine__video"
        muted
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={`Demonstração de ${title}`}
        data-routine-video
      >
        <source src={src} type="video/mp4" />
        Seu navegador não conseguiu carregar este vídeo.
      </video>
    </div>
  );
}
