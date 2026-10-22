"use client";

import { useEffect, useRef } from "react";

type PointerPosition = { x: number; y: number; targetX: number; targetY: number };

const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 vUv;
  void main() {
    vUv = 0.5 * (a_position + 1.0);
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 vUv;
  uniform float u_time;
  uniform float u_ratio;
  uniform vec2 u_pointer_position;
  uniform float u_scroll_progress;

  vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
  }

  float neuro_shape(vec2 uv, float t, float p) {
    vec2 sine_acc = vec2(0.0);
    vec2 res = vec2(0.0);
    float scale = 8.0;
    for (int j = 0; j < 15; j++) {
      uv = rotate(uv, 1.0);
      sine_acc = rotate(sine_acc, 1.0);
      vec2 layer = uv * scale + float(j) + sine_acc - t;
      sine_acc += sin(layer) + 2.4 * p;
      res += (0.5 + 0.5 * cos(layer)) / scale;
      scale *= 1.2;
    }
    return res.x + res.y;
  }

  void main() {
    vec2 uv = 0.5 * vUv;
    uv.x *= u_ratio;
    vec2 pointer = vUv - u_pointer_position;
    pointer.x *= u_ratio;
    float p = clamp(length(pointer), 0.0, 1.0);
    p = 0.5 * pow(1.0 - p, 2.0);
    float t = 0.001 * u_time;
    float noise = neuro_shape(uv, t, p);
    noise = 1.2 * pow(noise, 3.0);
    noise += pow(noise, 10.0);
    noise = max(0.0, noise - 0.5);
    noise *= 1.0 - length(vUv - 0.5);
    vec3 color = vec3(0.5, 0.15, 0.65);
    color = mix(color, vec3(0.02, 0.7, 0.9), 0.32 + 0.16 * sin(2.0 * u_scroll_progress + 1.2));
    color += vec3(0.15, 0.0, 0.6) * sin(2.0 * u_scroll_progress + 1.5);
    color *= noise;
    gl_FragColor = vec4(color, noise);
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  source: string,
  type: number,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function InteractiveNeuralVortexBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<PointerPosition>({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: false });
    if (!canvas || !gl) return;

    const vertexShader = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRatio = gl.getUniformLocation(program, "u_ratio");
    const uPointerPosition = gl.getUniformLocation(program, "u_pointer_position");
    const uScrollProgress = gl.getUniformLocation(program, "u_scroll_progress");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    let lastFrameAt = 0;

    const resizeCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(window.innerWidth * pixelRatio));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * pixelRatio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uRatio, canvas.width / canvas.height);
      if (reducedMotion.matches) draw(performance.now());
    };

    const draw = (now: number) => {
      const pointer = pointerRef.current;
      pointer.x += (pointer.targetX - pointer.x) * 0.2;
      pointer.y += (pointer.targetY - pointer.y) * 0.2;
      gl.uniform1f(uTime, now);
      gl.uniform2f(
        uPointerPosition,
        pointer.x / Math.max(window.innerWidth, 1),
        1 - pointer.y / Math.max(window.innerHeight, 1),
      );
      gl.uniform1f(uScrollProgress, window.scrollY / Math.max(2 * window.innerHeight, 1));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const render = (now: number) => {
      if (document.hidden) return;
      if (now - lastFrameAt >= 1000 / 30) {
        draw(now);
        lastFrameAt = now;
      }
      if (!reducedMotion.matches) frameId = window.requestAnimationFrame(render);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerRef.current.targetX = event.clientX;
      pointerRef.current.targetY = event.clientY;
    };
    const handleVisibilityChange = () => {
      if (!document.hidden && !reducedMotion.matches) {
        frameId = window.requestAnimationFrame(render);
      }
    };
    const handleMotionChange = () => {
      window.cancelAnimationFrame(frameId);
      if (reducedMotion.matches) draw(performance.now());
      else frameId = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    if (!reducedMotion.matches) frameId = window.requestAnimationFrame(render);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reducedMotion.addEventListener("change", handleMotionChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotion.removeEventListener("change", handleMotionChange);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} className="planner-vortex" aria-hidden="true" />;
}
