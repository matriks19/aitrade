"use client";

import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";

import type { Drawing, DrawingPoint, DrawingTool, NewDrawing } from "@/lib/drawings";
import { formatPrice } from "@/lib/format";

interface DrawingOverlayProps {
  chart: IChartApi;
  series: ISeriesApi<"Candlestick">;
  drawings: Drawing[];
  tool: DrawingTool;
  onAdd: (drawing: NewDrawing) => void;
}

const DRAWING_COLOR = "#fbbf24";
const MONO_FONT = '11px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * Lightweight Charts üzerine bindirilmiş çizim katmanı.
 *
 * Çizimler veri koordinatlarında (zaman + fiyat) saklanır. Her karede
 * `timeToCoordinate` / `priceToCoordinate` ile ekran koordinatlarına çevrilir;
 * böylece zoom, pan ve resize sırasında çizimler grafiğe yapışık kalır.
 */
export function DrawingOverlay({
  chart,
  series,
  drawings,
  tool,
  onAdd,
}: DrawingOverlayProps) {
  const drawingsRef = useRef(drawings);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const toolRef = useRef(tool);
  const onAddRef = useRef(onAdd);
  const pendingRef = useRef<DrawingPoint | null>(null);
  const cursorRef = useRef<{ x: number; y: number; price: number } | null>(null);

  drawingsRef.current = drawings;
  toolRef.current = tool;
  onAddRef.current = onAdd;

  // Araç değişince yarım kalan çizimi sıfırla ve tıklama katmanını hemen aç/kapat.
  useEffect(() => {
    pendingRef.current = null;
    cursorRef.current = null;

    if (canvasRef.current) {
      canvasRef.current.style.pointerEvents = tool === "none" ? "none" : "auto";
    }
  }, [tool]);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let canvas: HTMLCanvasElement | null = null;
    let paneElement: HTMLElement | null = null;

    const resolvePoint = (event: MouseEvent): DrawingPoint | null => {
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      try {
        const plotWidth = chart.paneSize(0).width;
        if (x < 0 || x > plotWidth) return null;

        const time = chart.timeScale().coordinateToTime(x);
        const price = series.coordinateToPrice(y);
        if (time === null || price === null || typeof time !== "number") return null;
        return { time: Number(time), price: Number(price) };
      } catch {
        return null;
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (toolRef.current === "none") return;
      const point = resolvePoint(event);
      if (!point) return;

      if (toolRef.current === "horizontal") {
        onAddRef.current({
          type: "horizontal",
          points: [point],
          color: DRAWING_COLOR,
        });
        pendingRef.current = null;
        cursorRef.current = null;
        return;
      }

      const pending = pendingRef.current;
      if (!pending) {
        pendingRef.current = point;
        return;
      }

      if (pending.time === point.time && pending.price === point.price) return;

      onAddRef.current({
        type: "trendline",
        points: [pending, point],
        color: DRAWING_COLOR,
      });
      pendingRef.current = null;
      cursorRef.current = null;
    };

    const handleMove = (event: MouseEvent) => {
      if (!canvas) return;

      if (toolRef.current === "none") {
        cursorRef.current = null;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      try {
        const plotWidth = chart.paneSize(0).width;
        if (x < 0 || x > plotWidth) {
          cursorRef.current = null;
          return;
        }

        const price = series.coordinateToPrice(y);
        cursorRef.current = price === null ? null : { x, y, price: Number(price) };
      } catch {
        cursorRef.current = null;
      }
    };

    const handleLeave = () => {
      cursorRef.current = null;
    };

    const drawLabel = (
      context: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      plotWidth: number,
      color: string,
    ) => {
      context.font = MONO_FONT;
      const width = context.measureText(text).width + 10;
      const height = 18;
      const left = Math.max(4, Math.min(x, plotWidth - width - 4));

      context.fillStyle = "rgba(8, 13, 22, 0.86)";
      context.beginPath();
      context.roundRect(left, y, width, height, 4);
      context.fill();
      context.strokeStyle = `${color}66`;
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = color;
      context.fillText(text, left + 5, y + 12.5);
    };

    const draw = () => {
      if (!canvas) return;

      try {
        const currentPane = chart.panes()[0]?.getHTMLElement() ?? null;
        if (!currentPane) return;

        // Pane yeniden oluşturulursa veya canvas DOM'dan düşerse yeniden bağla.
        if (
          currentPane !== paneElement ||
          !canvas.isConnected ||
          canvas.parentElement !== currentPane
        ) {
          if (getComputedStyle(currentPane).position === "static") {
            currentPane.style.position = "relative";
          }
          paneElement = currentPane;
          currentPane.appendChild(canvas);
        }

        const context = canvas.getContext("2d");
        if (!context) return;

        const width = paneElement.clientWidth;
        const height = paneElement.clientHeight;
        if (width === 0 || height === 0) return;

        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const pixelWidth = Math.round(width * ratio);
        const pixelHeight = Math.round(height * ratio);

        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        }

        canvas.style.pointerEvents = toolRef.current === "none" ? "none" : "auto";

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        const plotWidth = chart.paneSize(0).width || width;
        const timeScale = chart.timeScale();
        const activeTool = toolRef.current;
        const pending = pendingRef.current;
        const cursor = cursorRef.current;

        // Kayıtlı çizimler.
        for (const drawing of drawingsRef.current) {
          context.strokeStyle = drawing.color;
          context.fillStyle = drawing.color;
          context.lineWidth = 1.5;
          context.setLineDash([]);

          if (drawing.type === "horizontal") {
            const point = drawing.points[0];
            if (!point) continue;

            const y = series.priceToCoordinate(point.price);
            if (y === null) continue;
            const yPosition = Number(y);

            context.beginPath();
            context.moveTo(0, yPosition);
            context.lineTo(plotWidth, yPosition);
            context.stroke();

            context.fillRect(0, yPosition - 2, 2, 4);
            context.fillRect(plotWidth - 2, yPosition - 2, 2, 4);

            const labelY = Math.max(2, Math.min(yPosition - 24, height - 20));
            drawLabel(
              context,
              formatPrice(point.price),
              plotWidth - 58,
              labelY,
              plotWidth,
              drawing.color,
            );
            continue;
          }

          const [first, second] = drawing.points;
          if (!first || !second) continue;

          const x1 = timeScale.timeToCoordinate(first.time as UTCTimestamp);
          const y1 = series.priceToCoordinate(first.price);
          const x2 = timeScale.timeToCoordinate(second.time as UTCTimestamp);
          const y2 = series.priceToCoordinate(second.price);

          if (x1 === null || y1 === null || x2 === null || y2 === null) continue;

          context.beginPath();
          context.moveTo(Number(x1), Number(y1));
          context.lineTo(Number(x2), Number(y2));
          context.stroke();

          for (const [x, y] of [
            [Number(x1), Number(y1)],
            [Number(x2), Number(y2)],
          ]) {
            context.beginPath();
            context.arc(x, y, 3, 0, Math.PI * 2);
            context.fill();
          }
        }

        // Aktif araç önizlemesi.
        if (activeTool !== "none" && cursor) {
          context.strokeStyle = "rgba(251, 191, 36, 0.72)";
          context.setLineDash([5, 4]);
          context.lineWidth = 1.2;

          if (activeTool === "horizontal") {
            context.beginPath();
            context.moveTo(0, cursor.y);
            context.lineTo(plotWidth, cursor.y);
            context.stroke();
          } else if (pending) {
            const startX = timeScale.timeToCoordinate(pending.time as UTCTimestamp);
            const startY = series.priceToCoordinate(pending.price);
            if (startX !== null && startY !== null) {
              context.beginPath();
              context.moveTo(Number(startX), Number(startY));
              context.lineTo(cursor.x, cursor.y);
              context.stroke();
            }
          }

          context.setLineDash([]);
        }
      } catch {
        // Grafik kaldırılırken oluşabilecek geçici hataları yoksay.
      }
    };

    const renderLoop = () => {
      if (disposed) return;
      draw();
      frame = window.requestAnimationFrame(renderLoop);
    };

    const attach = () => {
      if (disposed) return;

      const pane = chart.panes()[0]?.getHTMLElement() ?? null;
      if (!pane) {
        frame = window.requestAnimationFrame(attach);
        return;
      }

      paneElement = pane;
      canvas = document.createElement("canvas");
      canvas.className = "drawing-canvas";
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.pointerEvents = toolRef.current === "none" ? "none" : "auto";
      canvasRef.current = canvas;
      pane.appendChild(canvas);
      canvas.addEventListener("click", handleClick);
      canvas.addEventListener("mousemove", handleMove);
      canvas.addEventListener("mouseleave", handleLeave);

      renderLoop();
    };

    attach();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);

      if (canvas) {
        canvas.removeEventListener("click", handleClick);
        canvas.removeEventListener("mousemove", handleMove);
        canvas.removeEventListener("mouseleave", handleLeave);
        canvas.remove();
        if (canvasRef.current === canvas) canvasRef.current = null;
      }
    };
  }, [chart, series]);

  return null;
}
