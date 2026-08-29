/**
 * Text layers for the "text behind subject" effect. Positions are relative (0..1)
 * to the scene so they survive canvas resizes and scale cleanly on export.
 */

export type TextFont = "sans" | "serif" | "mono";

export type TextLayer = {
  id: string;
  content: string;
  /** Center of the text block, relative to the scene (0..1). */
  x: number;
  y: number;
  /** Font size relative to the scene height (0..1). */
  size: number;
  weight: number;
  font: TextFont;
  color: string;
  opacity: number;
  /** Degrees, clockwise. */
  rotation: number;
  /** Letter spacing relative to the font size (em). */
  letterSpacing: number;
};

export const TEXT_COLORS = ["#ffffff", "#000000", "#f5c518", "#e63946", "#2a9d8f"];

const FONT_STACKS: Record<TextFont, string> = {
  sans: "var(--font-sans), system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "var(--font-mono), ui-monospace, monospace",
};

export function fontStack(font: TextFont): string {
  return FONT_STACKS[font];
}

let nextId = 0;

export function createTextLayer(partial: Partial<TextLayer> = {}): TextLayer {
  nextId += 1;
  return {
    id: `text-${Date.now()}-${nextId}`,
    content: "Tu texto",
    x: 0.5,
    y: 0.4,
    size: 0.18,
    weight: 800,
    font: "sans",
    color: "#ffffff",
    opacity: 1,
    rotation: 0,
    letterSpacing: 0,
    ...partial,
  };
}

/**
 * Draws one layer onto a canvas of `width`×`height` px. The same routine renders the
 * interactive canvas and the full-resolution export, so both always match.
 */
export function drawTextLayer(
  context: CanvasRenderingContext2D,
  layer: TextLayer,
  width: number,
  height: number,
) {
  const fontSize = layer.size * height;
  if (fontSize < 1 || !layer.content.trim()) return;

  context.save();
  context.translate(layer.x * width, layer.y * height);
  context.rotate((layer.rotation * Math.PI) / 180);
  context.globalAlpha = layer.opacity;
  context.fillStyle = layer.color;
  context.font = `${layer.weight} ${fontSize}px ${fontStack(layer.font)}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  // Supported in modern Chromium/Firefox; silently ignored elsewhere.
  context.letterSpacing = `${layer.letterSpacing * fontSize}px`;

  const lines = layer.content.split("\n");
  const lineHeight = fontSize * 1.15;
  const offset = ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    context.fillText(line, 0, index * lineHeight - offset);
  });
  context.restore();
}

/**
 * Approximate bounding box of a layer in canvas pixels, for hit-testing drags.
 * Axis-aligned (rotation ignored), same simplification as the prototype's product.
 */
export function textLayerBounds(
  context: CanvasRenderingContext2D,
  layer: TextLayer,
  width: number,
  height: number,
) {
  const fontSize = layer.size * height;
  context.save();
  context.font = `${layer.weight} ${fontSize}px ${fontStack(layer.font)}`;
  const lines = layer.content.split("\n");
  const textWidth = Math.max(...lines.map((line) => context.measureText(line).width), 1);
  context.restore();

  const blockHeight = lines.length * fontSize * 1.15;
  const centerX = layer.x * width;
  const centerY = layer.y * height;
  return {
    left: centerX - textWidth / 2,
    right: centerX + textWidth / 2,
    top: centerY - blockHeight / 2,
    bottom: centerY + blockHeight / 2,
  };
}
