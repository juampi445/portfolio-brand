"use client";

// Dev-only tweak console for RocketModel. Every parameter the renderer reads
// is exposed here; changes are written straight into the engine's params ref,
// so they apply on the next frame without touching the WebGL context. "Copy
// config" puts the current values on the clipboard as JSON — paste the final
// set back into defaultRocketParams when a look is chosen.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { RocketParams } from "./RocketModel";
import "./RocketConsole.css";

// Lighting rigs standing in for the HDRI environment presets of drei /
// model-viewer: each writes a coordinated key light + sky/ground hemisphere +
// rim into the params. Pick one, then fine-tune any value — the preset name
// just stops describing it ("custom") once you drift.
const PRESETS: Record<string, Partial<RocketParams>> = {
  studio: {
    lightColor: "#ffffff",
    sky: "#ffffff",
    ground: "#555555",
    ambient: 0.4,
    diffuse: 0.9,
    lightX: 0.5,
    lightY: 0.8,
    lightZ: 0.6,
    rim: "#ffffff",
    rimStrength: 0.35,
  },
  dawn: {
    lightColor: "#ffd9b8",
    sky: "#ffe9dc",
    ground: "#5a4a6a",
    ambient: 0.5,
    diffuse: 0.8,
    lightX: 0.8,
    lightY: 0.35,
    lightZ: 0.45,
    rim: "#ffc9a0",
    rimStrength: 0.6,
  },
  sunset: {
    lightColor: "#ff9e5e",
    sky: "#ff7846",
    ground: "#33204d",
    ambient: 0.5,
    diffuse: 0.9,
    lightX: -0.8,
    lightY: 0.25,
    lightZ: 0.5,
    rim: "#ffb46e",
    rimStrength: 0.8,
  },
  midnight: {
    lightColor: "#9db8ff",
    sky: "#1c2740",
    ground: "#05070d",
    ambient: 0.65,
    diffuse: 0.55,
    lightX: 0.4,
    lightY: 0.9,
    lightZ: 0.3,
    rim: "#47d7b5",
    rimStrength: 0.9,
  },
  forest: {
    lightColor: "#fff3c8",
    sky: "#b9dcae",
    ground: "#27331f",
    ambient: 0.55,
    diffuse: 0.75,
    lightX: 0.3,
    lightY: 0.85,
    lightZ: 0.45,
    rim: "#cfe8a8",
    rimStrength: 0.5,
  },
  city: {
    lightColor: "#cfe4ff",
    sky: "#8fb0d8",
    ground: "#1a1f2e",
    ambient: 0.5,
    diffuse: 0.85,
    lightX: 0.6,
    lightY: 0.7,
    lightZ: 0.4,
    rim: "#7fd0ff",
    rimStrength: 0.85,
  },
  neon: {
    lightColor: "#e48fff",
    sky: "#5a2a8a",
    ground: "#0a0618",
    ambient: 0.6,
    diffuse: 0.6,
    lightX: -0.5,
    lightY: 0.6,
    lightZ: 0.6,
    rim: "#47d7b5",
    rimStrength: 1.2,
  },
  mint: {
    lightColor: "#eafff8",
    sky: "#47d7b5",
    ground: "#111111",
    ambient: 0.5,
    diffuse: 0.8,
    lightX: 0.6,
    lightY: 0.8,
    lightZ: 0.5,
    rim: "#47d7b5",
    rimStrength: 0.9,
  },
};

interface RocketConsoleProps {
  initial: RocketParams;
  clipName: string | null;
  duration: number;
  onChange: (patch: Partial<RocketParams>) => void;
  onSeek: (t: number) => void;
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className="rc-row">
      <span className="rc-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        className="rc-number"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function RocketConsole({
  initial,
  clipName,
  duration,
  onChange,
  onSeek,
}: RocketConsoleProps) {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<RocketParams>(initial);
  const [scrub, setScrub] = useState(0);
  const [copied, setCopied] = useState(false);

  // Portal target only exists in the browser; render nothing during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const set = (patch: Partial<RocketParams>) => {
    setP((prev) => ({ ...prev, ...patch }));
    onChange(patch);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(p, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (permissions); the console still works.
    }
  };

  if (!mounted) return null;

  // Portaled to <body>: inside the hero the console would sit in the rocket
  // region's stacking context, underneath the copy layer — visible through its
  // transparent background but unreachable by the pointer.
  if (!open) {
    return createPortal(
      <button className="rc-toggle" type="button" onClick={() => setOpen(true)}>
        rocket ⚙
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div className="rc-panel">
      <div className="rc-head">
        <span>rocket console</span>
        <button type="button" onClick={copy}>
          {copied ? "copied!" : "copy config"}
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      <fieldset>
        <legend>animation {clipName ? `(“${clipName}”)` : "(no clip)"}</legend>
        <label className="rc-check">
          <input
            type="checkbox"
            checked={p.playing}
            onChange={(e) => set({ playing: e.target.checked })}
          />
          playing
        </label>
        <label className="rc-check">
          <input
            type="checkbox"
            checked={p.loop}
            onChange={(e) => set({ loop: e.target.checked })}
          />
          loop
        </label>
        <Slider
          label="speed"
          min={0}
          max={3}
          step={0.05}
          value={p.speed}
          onChange={(speed) => set({ speed })}
        />
        {duration > 0 && (
          <label className="rc-row">
            <span className="rc-label">scrub</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={duration / 200}
              value={scrub}
              onChange={(e) => {
                const t = Number(e.target.value);
                setScrub(t);
                onSeek(t);
              }}
            />
            <span className="rc-value">{scrub.toFixed(2)}s</span>
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>rotation (deg)</legend>
        <Slider
          label="x"
          min={-180}
          max={180}
          step={1}
          value={p.rotX}
          onChange={(rotX) => set({ rotX })}
        />
        <Slider
          label="y"
          min={-180}
          max={180}
          step={1}
          value={p.rotY}
          onChange={(rotY) => set({ rotY })}
        />
        <Slider
          label="z"
          min={-180}
          max={180}
          step={1}
          value={p.rotZ}
          onChange={(rotZ) => set({ rotZ })}
        />
        <Slider
          label="auto-spin"
          min={-2}
          max={2}
          step={0.05}
          value={p.spin}
          onChange={(spin) => set({ spin })}
        />
      </fieldset>

      <fieldset>
        <legend>position / scale</legend>
        <Slider
          label="x"
          min={-2}
          max={2}
          step={0.01}
          value={p.posX}
          onChange={(posX) => set({ posX })}
        />
        <Slider
          label="y"
          min={-2}
          max={2}
          step={0.01}
          value={p.posY}
          onChange={(posY) => set({ posY })}
        />
        <Slider
          label="z"
          min={-2}
          max={2}
          step={0.01}
          value={p.posZ}
          onChange={(posZ) => set({ posZ })}
        />
        <Slider
          label="scale"
          min={0.2}
          max={3}
          step={0.01}
          value={p.scale}
          onChange={(scale) => set({ scale })}
        />
      </fieldset>

      <fieldset>
        <legend>camera</legend>
        <Slider
          label="fov"
          min={10}
          max={80}
          step={1}
          value={p.fov}
          onChange={(fov) => set({ fov })}
        />
        <Slider
          label="x"
          min={-6}
          max={6}
          step={0.05}
          value={p.camX}
          onChange={(camX) => set({ camX })}
        />
        <Slider
          label="y"
          min={-6}
          max={6}
          step={0.05}
          value={p.camY}
          onChange={(camY) => set({ camY })}
        />
        <Slider
          label="z"
          min={1}
          max={15}
          step={0.05}
          value={p.camZ}
          onChange={(camZ) => set({ camZ })}
        />
      </fieldset>

      <fieldset>
        <legend>environment</legend>
        <label className="rc-row">
          <span className="rc-label">preset</span>
          <select
            className="rc-select"
            value={p.preset}
            onChange={(e) => {
              const name = e.target.value;
              const patch = PRESETS[name];
              if (patch) set({ ...patch, preset: name });
            }}
          >
            <option value="custom" disabled>
              custom
            </option>
            {Object.keys(PRESETS).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="rc-row">
          <span className="rc-label">key light</span>
          <input
            type="color"
            value={p.lightColor}
            onChange={(e) => set({ lightColor: e.target.value, preset: "custom" })}
          />
          <span className="rc-value">{p.lightColor}</span>
        </label>
        <label className="rc-row">
          <span className="rc-label">sky</span>
          <input
            type="color"
            value={p.sky}
            onChange={(e) => set({ sky: e.target.value, preset: "custom" })}
          />
          <span className="rc-value">{p.sky}</span>
        </label>
        <label className="rc-row">
          <span className="rc-label">ground</span>
          <input
            type="color"
            value={p.ground}
            onChange={(e) => set({ ground: e.target.value, preset: "custom" })}
          />
          <span className="rc-value">{p.ground}</span>
        </label>
        <Slider
          label="dir x"
          min={-1}
          max={1}
          step={0.05}
          value={p.lightX}
          onChange={(lightX) => set({ lightX })}
        />
        <Slider
          label="dir y"
          min={-1}
          max={1}
          step={0.05}
          value={p.lightY}
          onChange={(lightY) => set({ lightY })}
        />
        <Slider
          label="dir z"
          min={-1}
          max={1}
          step={0.05}
          value={p.lightZ}
          onChange={(lightZ) => set({ lightZ })}
        />
        <Slider
          label="ambient"
          min={0}
          max={1}
          step={0.01}
          value={p.ambient}
          onChange={(ambient) => set({ ambient })}
        />
        <Slider
          label="diffuse"
          min={0}
          max={2}
          step={0.05}
          value={p.diffuse}
          onChange={(diffuse) => set({ diffuse })}
        />
        <label className="rc-row">
          <span className="rc-label">rim</span>
          <input
            type="color"
            value={p.rim}
            onChange={(e) => set({ rim: e.target.value })}
          />
          <span className="rc-value">{p.rim}</span>
        </label>
        <Slider
          label="rim power"
          min={0}
          max={2}
          step={0.05}
          value={p.rimStrength}
          onChange={(rimStrength) => set({ rimStrength })}
        />
      </fieldset>

      <fieldset>
        <legend>material</legend>
        <label className="rc-check">
          <input
            type="checkbox"
            checked={p.useTexture}
            onChange={(e) => set({ useTexture: e.target.checked })}
          />
          texture
        </label>
        <label className="rc-row">
          <span className="rc-label">tint</span>
          <input
            type="color"
            value={p.tint}
            onChange={(e) => set({ tint: e.target.value })}
          />
          <span className="rc-value">{p.tint}</span>
        </label>
        <Slider
          label="tint mix"
          min={0}
          max={1}
          step={0.01}
          value={p.tintStrength}
          onChange={(tintStrength) => set({ tintStrength })}
        />
        <Slider
          label="metallic"
          min={0}
          max={1}
          step={0.01}
          value={p.metallic}
          onChange={(metallic) => set({ metallic })}
        />
        <Slider
          label="roughness"
          min={0}
          max={2}
          step={0.01}
          value={p.roughness}
          onChange={(roughness) => set({ roughness })}
        />
        <Slider
          label="shine"
          min={0}
          max={3}
          step={0.05}
          value={p.shine}
          onChange={(shine) => set({ shine })}
        />
        <Slider
          label="reflections"
          min={0}
          max={3}
          step={0.05}
          value={p.reflections}
          onChange={(reflections) => set({ reflections })}
        />
      </fieldset>
    </div>,
    document.body,
  );
}
