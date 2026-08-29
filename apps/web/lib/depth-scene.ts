/**
 * Depth sampling and cube geometry, ported from the validated prototype in `ejemplo.jack`.
 * Convention of the depth map: high brightness (255) = near, low (0) = far.
 */

export const MIN_SIZE = 16;
export const MAX_SIZE = 180;
export const SAMPLE_RADIUS = 6;
export const CUBE_SKEW_MAG_X = 0.7;
export const CUBE_SKEW_MAG_Y = 0.35;
export const VP_DARK_PERCENTILE = 0.05;
export const VP_HANDLE_RADIUS = 9;
export const SCALE_MIN = 0.3;
export const SCALE_MAX = 3;

export type Point = { x: number; y: number };

export type DepthField = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  min: number;
  max: number;
};

/** Reads the grey channel once and calibrates against the observed range. */
export function readDepthField(image: HTMLImageElement): DepthField | null {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0);

  let data: Uint8ClampedArray;
  try {
    data = context.getImageData(0, 0, width, height).data;
  } catch {
    // Tainted canvas: the image was fetched without CORS.
    return null;
  }

  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i];
    if (value < min) min = value;
    if (value > max) max = value;
  }

  return { data, width, height, min, max: max === min ? min + 1 : max };
}

/** Weighted centroid of the farthest percentile: where perspective converges. */
export function estimateVanishingPoint(field: DepthField): Point {
  const { data, width, height } = field;
  const total = width * height;
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < data.length; i += 4) histogram[data[i]] += 1;

  let cumulative = 0;
  let threshold = 255;
  const target = total * VP_DARK_PERCENTILE;
  for (let value = 0; value < 256; value += 1) {
    cumulative += histogram[value];
    if (cumulative >= target) {
      threshold = value;
      break;
    }
  }

  let sumX = 0;
  let sumY = 0;
  let sumWeight = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = data[(y * width + x) * 4];
      if (value <= threshold) {
        const weight = threshold - value + 1;
        sumX += x * weight;
        sumY += y * weight;
        sumWeight += weight;
      }
    }
  }

  if (sumWeight === 0) return { x: width / 2, y: height / 2 };
  return { x: sumX / sumWeight, y: sumY / sumWeight };
}

/** Averages a disc around the point so a single noisy pixel cannot drive the size. */
export function sampleDepth(
  field: DepthField,
  x: number,
  y: number,
  drawWidth: number,
  drawHeight: number,
): number | null {
  if (x < 0 || y < 0 || x >= drawWidth || y >= drawHeight) return null;

  const centerX = Math.round((x / drawWidth) * field.width);
  const centerY = Math.round((y / drawHeight) * field.height);

  let sum = 0;
  let count = 0;
  for (let offsetY = -SAMPLE_RADIUS; offsetY <= SAMPLE_RADIUS; offsetY += 1) {
    for (let offsetX = -SAMPLE_RADIUS; offsetX <= SAMPLE_RADIUS; offsetX += 1) {
      if (offsetX * offsetX + offsetY * offsetY > SAMPLE_RADIUS * SAMPLE_RADIUS) continue;
      const sampleX = centerX + offsetX;
      const sampleY = centerY + offsetY;
      if (sampleX < 0 || sampleY < 0 || sampleX >= field.width || sampleY >= field.height) continue;
      sum += field.data[(sampleY * field.width + sampleX) * 4];
      count += 1;
    }
  }

  return count === 0 ? null : sum / count;
}

/** Near depth maps to a large cube, far depth to a small one. */
export function depthToSize(field: DepthField, depth: number): number {
  const t = Math.min(1, Math.max(0, (depth - field.min) / (field.max - field.min)));
  return MIN_SIZE + t * (MAX_SIZE - MIN_SIZE);
}

export function toDisplayPoint(
  point: Point,
  field: DepthField,
  drawWidth: number,
  drawHeight: number,
): Point {
  return {
    x: (point.x / field.width) * drawWidth,
    y: (point.y / field.height) * drawHeight,
  };
}

export function toFieldPoint(
  point: Point,
  field: DepthField,
  drawWidth: number,
  drawHeight: number,
): Point {
  return {
    x: (point.x / drawWidth) * field.width,
    y: (point.y / drawHeight) * field.height,
  };
}

export type Cube = { x: number; y: number; size: number; depth: number };

/**
 * The back face recedes toward the vanishing point in its real 2D direction,
 * approximating one-point perspective. Orientation is automatic, never manual.
 */
export function cubeVertices(cube: Cube, vanishingPoint: Point, scale: number) {
  const size = cube.size * scale;
  const dx = vanishingPoint.x - cube.x;
  const dy = vanishingPoint.y - cube.y;
  const distance = Math.hypot(dx, dy) || 1;
  const skewX = (dx / distance) * size * CUBE_SKEW_MAG_X;
  const skewY = (dy / distance) * size * CUBE_SKEW_MAG_Y;

  const frontBottomLeft = { x: cube.x - size / 2, y: cube.y };
  const frontBottomRight = { x: cube.x + size / 2, y: cube.y };
  const frontTopRight = { x: cube.x + size / 2, y: cube.y - size };
  const frontTopLeft = { x: cube.x - size / 2, y: cube.y - size };
  const toBack = (point: Point) => ({ x: point.x + skewX, y: point.y + skewY });

  return {
    frontBottomLeft,
    frontBottomRight,
    frontTopRight,
    frontTopLeft,
    backTopRight: toBack(frontTopRight),
    backTopLeft: toBack(frontTopLeft),
    backBottomRight: toBack(frontBottomRight),
    backBottomLeft: toBack(frontBottomLeft),
    skewX,
    skewY,
    size,
  };
}

/** Below this horizontal angle the model receives no tilt, as in the prototype. */
export const VERTICAL_TILT_THRESHOLD_DEG = 20;

export type CameraParams = { rotateDegrees: number; verticalTilt: number };

/**
 * Derives the camera parameters the angle service expects from the cube's placement.
 * The cube has no manual rotation: it already leans toward the vanishing point, so that
 * same relation defines how far the camera turned and whether it looks down or up.
 */
export function deriveCamera(cube: Cube, vanishingPoint: Point): CameraParams {
  const dx = vanishingPoint.x - cube.x;
  const dy = vanishingPoint.y - cube.y;
  const distance = Math.hypot(dx, dy) || 1;

  // Horizontal offset toward the vanishing point, mapped to the model's [-90, 90].
  const rotateDegrees = Math.round(Math.max(-90, Math.min(90, (dx / distance) * 90)));

  // Vertical tilt is discrete: bird's eye when the vanishing point sits above the cube.
  const verticalAngle = Math.abs((Math.atan2(dy, Math.abs(dx) || 1) * 180) / Math.PI);
  let verticalTilt = 0;
  if (verticalAngle >= VERTICAL_TILT_THRESHOLD_DEG) verticalTilt = dy < 0 ? -1 : 1;

  return { rotateDegrees, verticalTilt };
}

export const ROT_DRAG_SENSITIVITY = 0.012;

export type Rotation = { x: number; y: number; z: number };
export type Vec3 = { x: number; y: number; z: number };

export function radToDeg(radians: number) {
  return (radians * 180) / Math.PI;
}

export function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Keeps angles in (-PI, PI] so free dragging never pushes the sliders out of range. */
export function wrapAngle(angle: number) {
  const twoPi = Math.PI * 2;
  return ((((angle + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
}

/**
 * Rotates a 3D vector by rx, ry, rz in Rz * Ry * Rx order.
 * The X sign is intentionally flipped so dragging upward tilts the sheet upward.
 */
export function rotateVec3(vector: Vec3, rx: number, ry: number, rz: number): Vec3 {
  const { x, y, z } = vector;

  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const y1 = y * cx + z * sx;
  const z1 = -y * sx + z * cx;

  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const x2 = x * cy + z1 * sy;
  const z2 = -x * sy + z1 * cy;

  const cz = Math.cos(rz);
  const sz = Math.sin(rz);
  return { x: x2 * cz - y1 * sz, y: x2 * sz + y1 * cz, z: z2 };
}

/** The model only accepts three discrete tilts, derived from the magnitude of rotX. */
export function verticalTiltFromRotX(rx: number) {
  const degrees = radToDeg(rx);
  if (degrees > VERTICAL_TILT_THRESHOLD_DEG) return 1;
  if (degrees < -VERTICAL_TILT_THRESHOLD_DEG) return -1;
  return 0;
}

/** Camera params from the manual product rotation: rotY is the turn, rotX the tilt. */
export function cameraFromRotation(rotation: Rotation): CameraParams {
  return {
    rotateDegrees: Math.max(-90, Math.min(90, Math.round(radToDeg(rotation.y)))),
    verticalTilt: verticalTiltFromRotX(rotation.x),
  };
}

export type AlphaBox = { x: number; y: number; w: number; h: number };

const ALPHA_BBOX_THRESHOLD = 8;

/**
 * Bounding box of the non-transparent pixels, so the visible content fills the derived
 * size instead of shrinking because of the PNG's empty padding.
 */
export function computeAlphaBBox(image: HTMLImageElement): AlphaBox {
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const fallback = { x: 0, y: 0, w, h };
  if (!w || !h) return fallback;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return fallback;

  context.drawImage(image, 0, 0);
  let data: Uint8ClampedArray;
  try {
    data = context.getImageData(0, 0, w, h).data;
  } catch {
    return fallback;
  }

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3] > ALPHA_BBOX_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX) return fallback;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
