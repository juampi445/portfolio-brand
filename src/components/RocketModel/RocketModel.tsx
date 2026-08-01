"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  GLTFLoader,
  Mesh,
  Program,
  Renderer,
  Texture,
  Transform,
  Vec3,
} from "ogl";
import type { GLTFAnimation } from "ogl";
import RocketConsole from "./RocketConsole";
import "./RocketModel.css";

interface RocketModelProps {
  src?: string;
  /** Rim light colour as hex — the brand accent, catching the model's edges. */
  rimColor?: string;
  /** Renders the tweak console. Defaults to development builds only. */
  debug?: boolean;
  className?: string;
}

// Every knob the renderer reads, live, once per frame. The console mutates
// this object through a ref — no React state, no WebGL re-init, no jank.
export interface RocketParams {
  // Transform (rotations in degrees, positions in world units)
  rotX: number;
  rotY: number;
  rotZ: number;
  posX: number;
  posY: number;
  posZ: number;
  /** Multiplier over the auto-fit scale. */
  scale: number;
  /** Auto-rotate around Y, radians per second. 0 = off. */
  spin: number;
  // Camera
  camX: number;
  camY: number;
  camZ: number;
  fov: number;
  // Environment — a lighting rig standing in for HDRI presets: a coloured key
  // light plus a sky/ground hemisphere for the ambient. The console's preset
  // menu (sunset, midnight, …) just writes coordinated values into these.
  preset: string;
  lightX: number;
  lightY: number;
  lightZ: number;
  lightColor: string;
  sky: string;
  ground: string;
  rim: string;
  rimStrength: number;
  ambient: number;
  diffuse: number;
  // Material — the mood switches. Texture off = flat material colour; tint
  // pulls every surface toward one colour, up to a full drench at 1. The
  // metallic/roughness pair multiplies the GLB's own factors (1 = native);
  // shine scales the key-light highlight, reflections the hemisphere mirror.
  useTexture: boolean;
  tint: string;
  tintStrength: number;
  metallic: number;
  roughness: number;
  shine: number;
  reflections: number;
  // The GLB's own clip
  playing: boolean;
  speed: number;
  loop: boolean;
}

export const defaultRocketParams = (rim: string): RocketParams => ({
  rotX: 0,
  rotY: 0,
  rotZ: -7,
  posX: 0,
  posY: 0,
  posZ: 0,
  scale: 1,
  spin: 0,
  camX: 0,
  camY: 0.4,
  camZ: 5.2,
  fov: 32,
  preset: "custom",
  lightX: 0.6,
  lightY: 0.8,
  lightZ: 0.5,
  lightColor: "#ffffff",
  sky: "#ffffff",
  ground: "#555555",
  rim,
  rimStrength: 0.55,
  ambient: 0.35,
  diffuse: 0.85,
  useTexture: true,
  tint: "#47D7B5",
  tintStrength: 0,
  metallic: 1,
  roughness: 1,
  shine: 1,
  reflections: 1,
  playing: true,
  speed: 1,
  loop: true,
});

const DEG = Math.PI / 180;

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [
        parseInt(m[1], 16) / 255,
        parseInt(m[2], 16) / 255,
        parseInt(m[3], 16) / 255,
      ]
    : [1, 1, 1];
};

// Textured lambert with a fresnel rim — not the glTF PBR model. The GLB's
// textures carry the rocket's identity; the rim paints the brand accent onto
// its silhouette so it sits in the same light as the rays behind it.
const vertex = /* glsl */ `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragment = /* glsl */ `
precision highp float;

uniform sampler2D tMap;
uniform float uHasMap;
uniform float uUseMap;
uniform sampler2D tMR;
uniform float uHasMR;
uniform vec3 uBase;
uniform vec3 uTint;
uniform float uTintStrength;
uniform float uMetalFactor;
uniform float uRoughFactor;
uniform float uMetalMul;
uniform float uRoughMul;
uniform float uSpecStrength;
uniform float uEnvStrength;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uRim;
uniform float uRimStrength;
uniform float uAmbient;
uniform float uDiffuse;
uniform vec3 cameraPosition;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
  vec3 n = normalize(vNormal);
  vec3 base = mix(uBase, texture2D(tMap, vUv).rgb, uHasMap * uUseMap);
  base = mix(base, uTint, uTintStrength);

  // glTF metallic-roughness: roughness in G, metallic in B, scaled by the
  // material factors and the console's global multipliers.
  vec2 mr = mix(vec2(1.0), texture2D(tMR, vUv).gb, uHasMR);
  float roughness = clamp(uRoughFactor * mr.x * uRoughMul, 0.05, 1.0);
  float metallic = clamp(uMetalFactor * mr.y * uMetalMul, 0.0, 1.0);

  // Metals reflect in their own colour; dielectrics in faint white.
  vec3 f0 = mix(vec3(0.04), base, metallic);

  vec3 l = normalize(uLightDir);
  vec3 v = normalize(cameraPosition - vWorldPos);
  vec3 h = normalize(l + v);
  float ndl = max(dot(n, l), 0.0);

  // Hemisphere ambient: surfaces facing up bathe in the sky colour, surfaces
  // facing down in the ground bounce — the cheap trick behind "sunset mood".
  vec3 ambient = mix(uGround, uSky, n.y * 0.5 + 0.5) * uAmbient;

  // Metal barely diffuses: its colour lives in the specular and reflections.
  vec3 color = base * (1.0 - metallic * 0.85) * (ambient + uLightColor * ndl * uDiffuse);

  // Blinn-Phong highlight from the key light, tightened by smoothness.
  float shininess = mix(120.0, 6.0, roughness);
  float highlight = pow(max(dot(n, h), 0.0), shininess) * (1.0 - roughness * 0.6);
  color += f0 * uLightColor * highlight * uSpecStrength * smoothstep(0.0, 0.15, ndl);

  // The shine: the sky/ground hemisphere sampled along the view reflection —
  // a two-texel environment map, which is what makes the hull read as metal.
  vec3 r = reflect(-v, n);
  vec3 env = mix(uGround, uSky, r.y * 0.5 + 0.5);
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  color += env * mix(f0, vec3(1.0), fresnel * 0.7)
    * (1.0 - roughness * 0.85)
    * mix(0.25, 1.0, metallic)
    * uEnvStrength;

  float rimFresnel = pow(1.0 - max(dot(n, v), 0.0), 2.5);
  color += uRim * rimFresnel * uRimStrength;

  gl_FragColor = vec4(color, 1.0);
}`;

const RocketModel = ({
  src = "/rocket_ship.glb",
  rimColor = "#47D7B5",
  debug = process.env.NODE_ENV === "development",
  className = "",
}: RocketModelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [clipInfo, setClipInfo] = useState<{
    name: string;
    duration: number;
  } | null>(null);

  const paramsRef = useRef<RocketParams | null>(null);
  if (!paramsRef.current) paramsRef.current = defaultRocketParams(rimColor);
  const clipRef = useRef<GLTFAnimation | null>(null);

  // Same gate as SideRays: no WebGL context, no 1.7MB fetch, until the
  // container is actually on screen (display: none never intersects, so the
  // mobile breakpoint also opts out here).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!isVisible || !container) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let frame: number | null = null;
    let disposed = false;
    let cleanupContext: (() => void) | null = null;

    const initialize = async () => {
      const renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio, 2),
        alpha: true,
        antialias: true,
      });
      const gl = renderer.gl;
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";

      const camera = new Camera(gl, { fov: 32, near: 0.1, far: 100 });

      const scene = new Transform();
      // User transforms live on the wrapper so they can't fight the clip,
      // which animates nodes inside the model.
      const wrapper = new Transform();
      wrapper.setParent(scene);

      const gltf = await GLTFLoader.load(gl, src);
      if (disposed) return;

      const model = new Transform();
      (gltf.scene || []).forEach((root: Transform) => root.setParent(model));
      model.setParent(wrapper);
      scene.updateMatrixWorld();

      // A 1px white fallback so every primitive shares one program shape.
      const white = new Texture(gl, {
        image: new Uint8Array([255, 255, 255, 255]),
        width: 1,
        height: 1,
      });

      // Shared uniform storage: arrays are shared by reference across all
      // programs and mutated in place; scalars are fanned out per frame.
      const lightDir: [number, number, number] = [0.6, 0.8, 0.5];
      const programs: Program[] = [];

      // Each console colour is one shared rgb array, mutated in place so every
      // program sees the change; the hex cache skips re-parsing per frame.
      const makeColor = (hex: string) => ({ hex, rgb: [...hexToRgb(hex)] });
      const syncColor = (color: { hex: string; rgb: number[] }, hex: string) => {
        if (hex === color.hex) return;
        color.hex = hex;
        const [r, g, b] = hexToRgb(hex);
        color.rgb[0] = r;
        color.rgb[1] = g;
        color.rgb[2] = b;
      };
      const initial = paramsRef.current!;
      const rim = makeColor(initial.rim);
      const tint = makeColor(initial.tint);
      const lightColor = makeColor(initial.lightColor);
      const sky = makeColor(initial.sky);
      const ground = makeColor(initial.ground);

      // Normalise: whatever units and origin the export used, fit the model
      // into a ~2.4 unit box centred on the camera's target, measuring each
      // mesh's bounds through its world matrix.
      const min = new Vec3(Infinity, Infinity, Infinity);
      const max = new Vec3(-Infinity, -Infinity, -Infinity);
      const corner = new Vec3();

      model.traverse((node) => {
        const mesh = node as Mesh & {
          program?: Program & { gltfMaterial?: Record<string, unknown> };
        };
        if (!mesh.geometry || !mesh.program) return;

        if (!mesh.geometry.bounds) mesh.geometry.computeBoundingBox();
        const b = mesh.geometry.bounds;
        for (let i = 0; i < 8; i++) {
          corner.set(
            i & 1 ? b.max.x : b.min.x,
            i & 2 ? b.max.y : b.min.y,
            i & 4 ? b.max.z : b.min.z,
          );
          corner.applyMatrix4(node.worldMatrix);
          min.x = Math.min(min.x, corner.x);
          min.y = Math.min(min.y, corner.y);
          min.z = Math.min(min.z, corner.z);
          max.x = Math.max(max.x, corner.x);
          max.y = Math.max(max.y, corner.y);
          max.z = Math.max(max.z, corner.z);
        }

        // Swap the loader's normal-debug program for the lit one, carrying the
        // material's base colour texture over.
        const material = mesh.program.gltfMaterial as
          | {
              baseColorTexture?: { texture?: Texture };
              baseColorFactor?: number[];
              metallicRoughnessTexture?: { texture?: Texture };
              metallicFactor?: number;
              roughnessFactor?: number;
            }
          | undefined;
        const map = material?.baseColorTexture?.texture;
        const hasMap = !!map && !!mesh.geometry.attributes.uv;
        const mr = material?.metallicRoughnessTexture?.texture;
        const hasMR = !!mr && !!mesh.geometry.attributes.uv;

        mesh.program = new Program(gl, {
          vertex,
          fragment,
          uniforms: {
            tMap: { value: hasMap ? map : white },
            uHasMap: { value: hasMap ? 1 : 0 },
            tMR: { value: hasMR ? mr : white },
            uHasMR: { value: hasMR ? 1 : 0 },
            uMetalFactor: { value: material?.metallicFactor ?? 1 },
            uRoughFactor: { value: material?.roughnessFactor ?? 1 },
            uMetalMul: { value: 1 },
            uRoughMul: { value: 1 },
            uSpecStrength: { value: 1 },
            uEnvStrength: { value: 1 },
            uBase: {
              value: (material?.baseColorFactor ?? [1, 1, 1, 1]).slice(0, 3),
            },
            uLightDir: { value: lightDir },
            uLightColor: { value: lightColor.rgb },
            uSky: { value: sky.rgb },
            uGround: { value: ground.rgb },
            uRim: { value: rim.rgb },
            uRimStrength: { value: 0.55 },
            uAmbient: { value: 0.35 },
            uDiffuse: { value: 0.85 },
            uUseMap: { value: 1 },
            uTint: { value: tint.rgb },
            uTintStrength: { value: 0 },
          },
        });
        programs.push(mesh.program);
      });

      const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
      const fit = size > 0 ? 2.4 / size : 1;
      model.scale.set(fit, fit, fit);
      model.position.set(
        (-(min.x + max.x) / 2) * fit,
        (-(min.y + max.y) / 2) * fit,
        (-(min.z + max.z) / 2) * fit,
      );

      const clip: GLTFAnimation | undefined = gltf.animations?.[0]?.animation;
      clipRef.current = clip ?? null;
      if (clip) {
        setClipInfo({
          name: gltf.animations[0].name ?? "clip",
          duration: clip.duration,
        });
      }

      // Motion is opt-out, not silently different: reduced motion parks the
      // clip; the console can still override while tweaking.
      if (reduced) paramsRef.current!.playing = false;

      container.appendChild(gl.canvas);

      const updateSize = () => {
        renderer.dpr = Math.min(window.devicePixelRatio, 2);
        const { clientWidth: w, clientHeight: h } = container;
        renderer.setSize(w, h);
        camera.perspective({ aspect: w / h });
      };
      window.addEventListener("resize", updateSize);
      updateSize();

      let spinAccum = 0;
      let lastFov = 0;
      let last = performance.now();

      const loop = (now: number) => {
        frame = requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.033);
        last = now;

        const p = paramsRef.current!;

        // Transform
        if (p.spin) spinAccum += dt * p.spin;
        wrapper.rotation.set(
          p.rotX * DEG,
          p.rotY * DEG + spinAccum,
          p.rotZ * DEG,
        );
        wrapper.position.set(p.posX, p.posY, p.posZ);
        wrapper.scale.set(p.scale, p.scale, p.scale);

        // Camera
        if (p.fov !== lastFov) {
          lastFov = p.fov;
          camera.perspective({ fov: p.fov });
        }
        camera.position.set(p.camX, p.camY, p.camZ);
        camera.lookAt([0, 0, 0]);

        // Light
        lightDir[0] = p.lightX;
        lightDir[1] = p.lightY;
        lightDir[2] = p.lightZ;
        syncColor(rim, p.rim);
        syncColor(tint, p.tint);
        syncColor(lightColor, p.lightColor);
        syncColor(sky, p.sky);
        syncColor(ground, p.ground);
        for (const program of programs) {
          program.uniforms.uRimStrength.value = p.rimStrength;
          program.uniforms.uAmbient.value = p.ambient;
          program.uniforms.uDiffuse.value = p.diffuse;
          program.uniforms.uUseMap.value = p.useTexture ? 1 : 0;
          program.uniforms.uTintStrength.value = p.tintStrength;
          program.uniforms.uMetalMul.value = p.metallic;
          program.uniforms.uRoughMul.value = p.roughness;
          program.uniforms.uSpecStrength.value = p.shine;
          program.uniforms.uEnvStrength.value = p.reflections;
        }

        // The GLB's own clip — the only motion the rocket performs by itself.
        if (clip) {
          clip.loop = p.loop;
          if (p.playing) clip.elapsed += dt * p.speed;
          clip.update();
        }

        renderer.render({ scene, camera });
      };
      frame = requestAnimationFrame(loop);

      cleanupContext = () => {
        window.removeEventListener("resize", updateSize);
        try {
          const loseCtx = gl.getExtension("WEBGL_lose_context");
          if (loseCtx) loseCtx.loseContext();
          if (gl.canvas.parentNode) gl.canvas.parentNode.removeChild(gl.canvas);
        } catch {
          // Context teardown is best-effort.
        }
      };
    };

    initialize().catch(() => {
      // A missing or malformed model leaves the hero exactly as it was — the
      // rocket is garnish, never a dependency.
    });

    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      cleanupContext?.();
      cleanupContext = null;
      clipRef.current = null;
    };
  }, [isVisible, src]);

  return (
    <div
      ref={containerRef}
      className={`rocket-model-container ${className}`.trim()}
    >
      {debug && (
        <RocketConsole
          initial={paramsRef.current!}
          clipName={clipInfo?.name ?? null}
          duration={clipInfo?.duration ?? 0}
          onChange={(patch) => {
            Object.assign(paramsRef.current!, patch);
          }}
          onSeek={(t) => {
            if (clipRef.current) clipRef.current.elapsed = t;
          }}
        />
      )}
    </div>
  );
};

export default RocketModel;
