// ─── PRESETS CONFIGURATION ──────────────────────────────────────────────────
// All preset data for lighting, camera angles, LED, and device skin.

const BACKGROUND_PRESETS = {
  darkNeutral:  { label: "Dark",       hex: "#111114" },
  lightNeutral: { label: "Light",      hex: "#f0f0f2" },
  brand:        { label: "Brand",      hex: "#007B34" },
  brandDark:    { label: "Brand Dark", hex: "#003d1a" },
};

const LIGHTING_PRESETS = {
  studio: {
    label: "Studio",
    ambient: { color: { r: 0.9, g: 0.9, b: 0.95 }, intensity: 0.5 },
    lights: [
      {
        type: "directional",
        direction: { x: -1, y: -1.5, z: -1 },
        color: { r: 1, g: 0.98, b: 0.95 },
        intensity: 1.4,
      },
      {
        type: "directional",
        direction: { x: 1, y: -0.5, z: 1 },
        color: { r: 0.6, g: 0.7, b: 0.9 },
        intensity: 0.6,
      },
    ],
  },
  dramatic: {
    label: "Dramatic",
    ambient: { color: { r: 0.2, g: 0.2, b: 0.25 }, intensity: 0.15 },
    lights: [
      {
        type: "directional",
        direction: { x: -0.5, y: -1, z: -0.3 },
        color: { r: 1, g: 0.95, b: 0.8 },
        intensity: 2.2,
      },
    ],
  },
  outdoor: {
    label: "Outdoor",
    ambient: { color: { r: 0.6, g: 0.75, b: 1.0 }, intensity: 0.7 },
    lights: [
      {
        type: "directional",
        direction: { x: 0.3, y: -1, z: 0.5 },
        color: { r: 1, g: 0.95, b: 0.75 },
        intensity: 1.8,
      },
    ],
  },
  neon: {
    label: "Neon",
    ambient: { color: { r: 0.3, g: 0.1, b: 0.5 }, intensity: 0.3 },
    lights: [
      {
        type: "point",
        position: { x: -3, y: 2, z: 0 },
        color: { r: 0.0, g: 1.0, b: 0.8 },
        intensity: 1.5,
      },
      {
        type: "point",
        position: { x: 3, y: 1, z: -1 },
        color: { r: 1.0, g: 0.1, b: 0.5 },
        intensity: 1.5,
      },
      {
        type: "directional",
        direction: { x: 0, y: -1, z: 0 },
        color: { r: 0.4, g: 0.2, b: 0.8 },
        intensity: 0.4,
      },
    ],
  },
};

// Camera presets: alpha and beta in radians, radius multiplier
const CAMERA_PRESETS = {
  hero: {
    label: "Hero",
    alpha: Math.PI / 6,       // 30°
    beta: (70 * Math.PI) / 180,
  },
  front: {
    label: "Front",
    alpha: 0,
    beta: Math.PI / 2,        // 90°
  },
  side: {
    label: "Side",
    alpha: Math.PI / 2,       // 90°
    beta: Math.PI / 2,
  },
  top: {
    label: "Top",
    alpha: Math.PI / 2,       // 90° right
    beta: 0.01,               // near 0 to avoid gimbal lock
  },
  iso: {
    label: "Iso",
    alpha: Math.PI / 4,       // 45°
    beta: (55 * Math.PI) / 180,
  },
};

// LED presets (default state)
const LED_DEFAULTS = {
  meshName: "LED_indicator",  // Name of the LED mesh in the .glb file — update to match yours
  defaultOn: true,
  defaultColor: "#00ff44",
};

const LED_COLOR_PRESETS = [
  { label: "Green",  hex: "#00ff44" },
  { label: "Blue",   hex: "#0088ff" },
  { label: "Yellow", hex: "#ffee00" },
  { label: "Red",    hex: "#ff2200" },
  { label: "White",  hex: "#ffffff" },
];

// Device skin presets
const SKIN_PRESETS = [
  { label: "Charcoal", color: "#2a2d35", hex: "#2a2d35" },
  { label: "White",    color: "#e8e8ea", hex: "#e8e8ea" },
  { label: "Blue",     color: "#1a4fff", hex: "#1a4fff" },
  { label: "Crimson",  color: "#c0182a", hex: "#c0182a" },
];

// Device body mesh names — add all mesh names that should be affected by skin changes
// Update these to match your actual .glb mesh names
const DEVICE_BODY_MESHES = ["upper housing"];
