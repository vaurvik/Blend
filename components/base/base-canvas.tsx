"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

export interface CanvasPoint {
  x: number;
  y: number;
}
export interface CanvasCamera extends CanvasPoint {
  zoom: number;
}
export interface BaseCanvasProps {
  children: (camera: CanvasCamera) => ReactNode;
  onPointerDown?: (
    event: PointerEvent<HTMLDivElement>,
    point: CanvasPoint,
  ) => void;
  onPointerUp?: (
    event: PointerEvent<HTMLDivElement>,
    point: CanvasPoint,
  ) => void;
  onPointerMove?: (
    event: PointerEvent<HTMLDivElement>,
    point: CanvasPoint,
  ) => void;
  onPointerEnter?: (
    event: PointerEvent<HTMLDivElement>,
    point: CanvasPoint,
  ) => void;
  onPointerLeave?: (
    event: PointerEvent<HTMLDivElement>,
    point: CanvasPoint,
  ) => void;
  onPointerCancel?: (
    event: PointerEvent<HTMLDivElement>,
    point: CanvasPoint,
  ) => void;
  onHold?: (point: CanvasPoint) => void;
  onCameraChange?: (camera: CanvasCamera) => void;
}

export function BaseCanvas({
  children,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onPointerEnter,
  onPointerLeave,
  onPointerCancel,
  onHold,
  onCameraChange,
}: BaseCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<CanvasCamera>({
    x: 80,
    y: 80,
    zoom: 0.7,
  });
  const cameraRef = useRef(camera);
  const pan = useRef<{ x: number; y: number; origin: CanvasCamera } | null>(
    null,
  );
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  function update(next: CanvasCamera) {
    cameraRef.current = next;
    setCamera(next);
    onCameraChange?.(next);
  }
  function point(event: PointerEvent<HTMLDivElement>): CanvasPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    const current = cameraRef.current;
    return {
      x: (event.clientX - rect.left - current.x) / current.zoom,
      y: (event.clientY - rect.top - current.y) / current.zoom,
    };
  }
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    function wheel(event: WheelEvent) {
      event.preventDefault();
      const current = cameraRef.current;
      if (
        !event.ctrlKey &&
        (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))
      ) {
        update({
          ...current,
          x: current.x - (event.deltaX || event.deltaY),
          y: current.y - (event.deltaX ? event.deltaY : 0),
        });
        return;
      }
      const rect = node!.getBoundingClientRect();
      const x = event.clientX - rect.left,
        y = event.clientY - rect.top;
      const zoom = Math.max(
        0.15,
        Math.min(2, current.zoom * Math.exp(-event.deltaY * 0.002)),
      );
      update({
        zoom,
        x: x - ((x - current.x) * zoom) / current.zoom,
        y: y - ((y - current.y) * zoom) / current.zoom,
      });
    }
    node.addEventListener("wheel", wheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", wheel);
      if (hold.current) clearTimeout(hold.current);
    };
    // A câmera atual é mantida em ref para não recriar o listener a cada movimento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCameraChange]);
  return (
    <div
      ref={ref}
      className="base-canvas"
      onPointerEnter={(event) => onPointerEnter?.(event, point(event))}
      onPointerLeave={(event) => onPointerLeave?.(event, point(event))}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        const coords = point(event);
        if (
          event.button === 1 ||
          event.button === 2 ||
          (event.pointerType === "touch" &&
            (event.target === event.currentTarget ||
              (event.target as HTMLElement).classList.contains(
                "base-canvas__world",
              )))
        ) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          pan.current = {
            x: event.clientX,
            y: event.clientY,
            origin: cameraRef.current,
          };
        } else if (event.button === 0 && onHold)
          hold.current = setTimeout(() => onHold(coords), 500);
        onPointerDown?.(event, coords);
      }}
      onPointerMove={(event) => {
        if (pan.current) {
          const { x, y, origin } = pan.current;
          update({
            ...origin,
            x: origin.x + event.clientX - x,
            y: origin.y + event.clientY - y,
          });
        }
        if (hold.current && event.buttons) {
          clearTimeout(hold.current);
          hold.current = null;
        }
        onPointerMove?.(event, point(event));
      }}
      onPointerUp={(event) => {
        if (hold.current) clearTimeout(hold.current);
        hold.current = null;
        pan.current = null;
        onPointerUp?.(event, point(event));
      }}
      onPointerCancel={(event) => {
        if (hold.current) clearTimeout(hold.current);
        hold.current = null;
        pan.current = null;
        onPointerCancel?.(event, point(event));
      }}
    >
      <div
        className="base-canvas__world"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
        }}
      >
        {children(camera)}
      </div>
    </div>
  );
}
