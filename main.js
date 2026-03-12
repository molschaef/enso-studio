// ─── DEVICE VIEWER — main.js ────────────────────────────────────────────────

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

let scene, camera, ambientLight, dynamicLights = [], glowLayer;
let meshMap = {};
let ledMesh = null;
let ledOn = LED_DEFAULTS.defaultOn;
let ledColor = LED_DEFAULTS.defaultColor;
let blinkInterval = null;
let currentLightingPreset = "studio";
let currentCameraPreset = "hero";

// ─── SCENE INIT ──────────────────────────────────────────────────────────────

async function initScene() {
  scene = new BABYLON.Scene(engine);

  // Camera
  camera = new BABYLON.ArcRotateCamera("cam", Math.PI / 6, (70 * Math.PI) / 180, 5, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, false);
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 30;
  camera.wheelPrecision = 50;
  camera.minZ = 0.01;

  // Initial ambient light (replaced by presets)
  ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);

  // Subtle surface glow (tight kernel, won't bleed far)
  glowLayer = new BABYLON.GlowLayer("glow", scene);
  glowLayer.blurKernelSize = 8;
  glowLayer.intensity = 0;

  // Point light at LED position for realistic local illumination
  // Apply default presets
  applyBackgroundPreset("darkNeutral");
  applyLightingPreset("studio");

  // Load model
  await loadModel();

  // Start render loop
  engine.runRenderLoop(() => scene.render());
}

// ─── MODEL LOADING ───────────────────────────────────────────────────────────

async function loadModel() {
  const loadingEl = document.getElementById("loading");

  try {
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", "models/", "device.glb", scene);

    meshMap = {};
    result.meshes.forEach(mesh => {
      meshMap[mesh.name] = mesh;
    });
    // Reduce shininess on all meshes
    result.meshes.forEach(mesh => {
      if (mesh.material instanceof BABYLON.PBRMaterial) {
        mesh.material.roughness = 0.8;
        mesh.material.metallic = 0.1;
      }
    });

    // Find LED mesh
    ledMesh = meshMap[LED_DEFAULTS.meshName] || null;
    if (!ledMesh) {
      // Try case-insensitive search
      const ledKey = Object.keys(meshMap).find(k => k.toLowerCase().includes("led"));
      if (ledKey) ledMesh = meshMap[ledKey];
    }

    // Apply LED defaults
    if (ledMesh) {
      ensureLEDMaterial(ledMesh);
      setLED(LED_DEFAULTS.defaultOn, LED_DEFAULTS.defaultColor);
    } else {
      console.warn("LED mesh not found. Update LED_DEFAULTS.meshName in presets.js");
    }

    // Auto-fit camera to model
    fitCameraToModel(result.meshes);
    loadingEl.style.display = "none";

    // Generate favicon from the scene
    setTimeout(async () => {
      try {
        const dataUrl = await BABYLON.Tools.CreateScreenshotAsync(engine, camera, { width: 64, height: 64 });
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = dataUrl;
      } catch (e) { /* favicon is non-critical */ }
    }, 500);

  } catch (err) {
    loadingEl.innerHTML = `
      <div class="load-error">
        <p>Could not load <strong>models/device.glb</strong></p>
        <p>Export your .blend file to GLB and place it in the <code>models/</code> folder.</p>
        <p class="err-detail">${err.message || err}</p>
      </div>`;
    console.error("Model load error:", err);
  }
}

function fitCameraToModel(meshes) {
  const validMeshes = meshes.filter(m => m.getBoundingInfo);
  if (!validMeshes.length) return;

  let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
  let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);

  validMeshes.forEach(mesh => {
    mesh.computeWorldMatrix(true);
    const bi = mesh.getBoundingInfo();
    if (!bi) return;
    min = BABYLON.Vector3.Minimize(min, bi.boundingBox.minimumWorld);
    max = BABYLON.Vector3.Maximize(max, bi.boundingBox.maximumWorld);
  });

  const center = BABYLON.Vector3.Center(min, max);
  const size = max.subtract(min);
  const maxDim = Math.max(size.x, size.y, size.z);

  camera.target = center;
  camera.radius = maxDim * 2;
  camera.lowerRadiusLimit = maxDim * 0.5;
  camera.upperRadiusLimit = maxDim * 10;
}

// ─── LIGHTING ────────────────────────────────────────────────────────────────

function applyLightingPreset(name) {
  const preset = LIGHTING_PRESETS[name];
  if (!preset) return;
  currentLightingPreset = name;

  // Ambient hemispheric light
  if (ambientLight) {
    ambientLight.diffuse = new BABYLON.Color3(preset.ambient.color.r, preset.ambient.color.g, preset.ambient.color.b);
    ambientLight.intensity = preset.ambient.intensity;
  }

  // Remove old dynamic lights
  dynamicLights.forEach(l => l.dispose());
  dynamicLights = [];

  // Add new lights from preset
  preset.lights.forEach((ld, i) => {
    let light;
    if (ld.type === "directional") {
      light = new BABYLON.DirectionalLight(`dl_${name}_${i}`,
        new BABYLON.Vector3(ld.direction.x, ld.direction.y, ld.direction.z), scene);
    } else if (ld.type === "point") {
      light = new BABYLON.PointLight(`pl_${name}_${i}`,
        new BABYLON.Vector3(ld.position.x, ld.position.y, ld.position.z), scene);
    }
    if (light) {
      light.diffuse = new BABYLON.Color3(ld.color.r, ld.color.g, ld.color.b);
      light.intensity = ld.intensity;
      dynamicLights.push(light);
    }
  });

  // Update active button
  document.querySelectorAll(".lighting-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.preset === name);
  });
}

function applyBackgroundPreset(name) {
  const preset = BACKGROUND_PRESETS[name];
  if (!preset) return;

  const r = parseInt(preset.hex.slice(1, 3), 16) / 255;
  const g = parseInt(preset.hex.slice(3, 5), 16) / 255;
  const b = parseInt(preset.hex.slice(5, 7), 16) / 255;
  scene.clearColor = new BABYLON.Color4(r, g, b, 1);

  document.querySelectorAll(".bg-preset-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.preset === name);
  });
}

// ─── CAMERA ──────────────────────────────────────────────────────────────────

function applyCameraPreset(name) {
  const preset = CAMERA_PRESETS[name];
  if (!preset) return;
  currentCameraPreset = name;

  const duration = 30; // frames
  const fps = 60;

  BABYLON.Animation.CreateAndStartAnimation(
    "camAlpha", camera, "alpha", fps, duration,
    camera.alpha, preset.alpha, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  BABYLON.Animation.CreateAndStartAnimation(
    "camBeta", camera, "beta", fps, duration,
    camera.beta, preset.beta, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  );

  document.querySelectorAll(".camera-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.preset === name);
  });
}

// ─── LED ─────────────────────────────────────────────────────────────────────

function ensureLEDMaterial(mesh) {
  const mat = new BABYLON.StandardMaterial("ledMat_" + mesh.name, scene);
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mesh.material = mat;
}

function hexToColor3(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new BABYLON.Color3(r, g, b);
}

function setLED(on, colorHex) {
  ledOn = on;
  ledColor = colorHex;

  if (!ledMesh) return;
  ensureLEDMaterial(ledMesh);

  const mat = ledMesh.material;
  if (on) {
    const col = hexToColor3(colorHex);
    mat.emissiveColor = col;
    glowLayer.intensity = 0.4;
    glowLayer.addIncludedOnlyMesh(ledMesh);
  } else {
    mat.emissiveColor = BABYLON.Color3.Black();
    glowLayer.intensity = 0;
  }

  // Update UI
  document.getElementById("led-on-btn").classList.toggle("active", on);
  document.getElementById("led-off-btn").classList.toggle("active", !on);
  document.getElementById("led-blink-btn").classList.remove("active");
}

function startBlink() {
  stopBlink();
  setLED(true, ledColor);

  const baseColor = hexToColor3(ledColor);
  const pulsePeriod = 2000; // ms for one full pulse cycle

  blinkInterval = scene.onBeforeRenderObservable.add(() => {
    if (!ledMesh) return;
    const t = performance.now();
    const intensity = (Math.sin((t / pulsePeriod) * Math.PI * 2) + 1) / 2; // 0 to 1
    ledMesh.material.emissiveColor = new BABYLON.Color3(
      baseColor.r * intensity,
      baseColor.g * intensity,
      baseColor.b * intensity
    );
    glowLayer.intensity = intensity * 0.4;
  });

  document.getElementById("led-blink-btn").classList.add("active");
  document.getElementById("led-on-btn").classList.remove("active");
  document.getElementById("led-off-btn").classList.remove("active");
}

function stopBlink() {
  if (blinkInterval) {
    scene.onBeforeRenderObservable.remove(blinkInterval);
    blinkInterval = null;
  }
}

// ─── DEVICE SKIN ─────────────────────────────────────────────────────────────

function applyDeviceSkin(hexColor) {
  const col = hexToColor3(hexColor);

  DEVICE_BODY_MESHES.forEach(name => {
    const mesh = meshMap[name];
    if (!mesh) {
      // Try partial match
      const key = Object.keys(meshMap).find(k =>
        k.toLowerCase().includes(name.toLowerCase())
      );
      if (!key) return;
      applyColorToMesh(meshMap[key], col);
    } else {
      applyColorToMesh(mesh, col);
    }
  });

  // Update active swatch
  document.querySelectorAll(".skin-swatch").forEach(el => {
    el.classList.toggle("active", el.dataset.color === hexColor);
  });
}

function applyColorToMesh(mesh, color3) {
  if (!mesh) return;
  if (!mesh.material || !(mesh.material instanceof BABYLON.PBRMaterial)) {
    const mat = new BABYLON.PBRMaterial("bodyMat_" + mesh.name, scene);
    mat.roughness = 0.6;
    mat.metallic = 0.3;
    mesh.material = mat;
  }
  mesh.material.albedoColor = color3;
}

// ─── EXPORT PNG ──────────────────────────────────────────────────────────────

async function exportPNG() {
  const btn = document.getElementById("export-btn");
  const transparent = document.querySelector(".bg-btn.active").dataset.bg === "transparent";
  btn.textContent = "Capturing...";
  btn.disabled = true;

  // Temporarily clear background for transparent export
  const savedClearColor = scene.clearColor.clone();
  if (transparent) {
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
  }

  await new Promise(r => setTimeout(r, 100));

  try {
    const dataUrl = await BABYLON.Tools.CreateScreenshotAsync(engine, camera, { width: 2048, height: 2048 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = transparent ? "device-render-transparent.png" : "device-render.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error("Screenshot failed:", e);
  }

  // Restore background
  scene.clearColor = savedClearColor;
  btn.textContent = "Export PNG";
  btn.disabled = false;
}

// ─── UI WIRING ───────────────────────────────────────────────────────────────

function buildUI() {
  // Background buttons
  document.querySelectorAll(".bg-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => applyBackgroundPreset(btn.dataset.preset));
  });

  // Lighting buttons
  document.querySelectorAll(".lighting-btn").forEach(btn => {
    btn.addEventListener("click", () => applyLightingPreset(btn.dataset.preset));
  });

  // Camera buttons
  document.querySelectorAll(".camera-btn").forEach(btn => {
    btn.addEventListener("click", () => applyCameraPreset(btn.dataset.preset));
  });

  // LED buttons
  document.getElementById("led-on-btn").addEventListener("click", () => {
    stopBlink();
    setLED(true, ledColor);
  });
  document.getElementById("led-blink-btn").addEventListener("click", () => {
    startBlink();
  });
  document.getElementById("led-off-btn").addEventListener("click", () => {
    stopBlink();
    setLED(false, ledColor);
  });

  // LED color swatches
  const ledSwatchContainer = document.getElementById("led-swatches");
  LED_COLOR_PRESETS.forEach(preset => {
    const swatch = document.createElement("button");
    swatch.className = "skin-swatch led-swatch";
    swatch.dataset.color = preset.hex;
    swatch.title = preset.label;
    swatch.style.background = preset.hex;
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".led-swatch").forEach(el => el.classList.remove("active"));
      swatch.classList.add("active");
      ledColor = preset.hex;
      if (blinkInterval) startBlink();
      else if (ledOn) setLED(true, preset.hex);
    });
    ledSwatchContainer.appendChild(swatch);
  });
  // Activate default color swatch
  const defaultLedSwatch = ledSwatchContainer.querySelector(`[data-color="${LED_DEFAULTS.defaultColor}"]`);
  if (defaultLedSwatch) defaultLedSwatch.classList.add("active");

  // Background toggle
  document.querySelectorAll(".bg-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".bg-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Export button
  document.getElementById("export-btn").addEventListener("click", exportPNG);
}

// ─── RESIZE ──────────────────────────────────────────────────────────────────

window.addEventListener("resize", () => engine.resize());

// ─── BOOT ────────────────────────────────────────────────────────────────────

buildUI();
initScene();
