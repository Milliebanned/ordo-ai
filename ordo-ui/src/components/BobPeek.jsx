import React, { useEffect, useRef } from 'react';

// Bob, peeking over the top edge of the card he sits behind.
// Same model and toon look as the landing page (three.js r128 is loaded in app.html).
// Sizes are for a 150px-tall canvas and scale with the canvas height set in CSS.
const BASE_H = 150;
const BASE_S = 40;       // px per Bob unit
const BASE_EDGE = 30;    // how far the canvas reaches below the card's top edge
const BASE_HEAD = 26;    // head centre, px above the card's top edge

export default function BobPeek() {
  const ref = useRef(null);

  useEffect(() => {
    const THREE = window.THREE;
    const cv = ref.current;
    if (!THREE || !cv) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(0, 1, 1, 0, -400, 400);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94b8, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 0.5); key.position.set(60, 200, 300); scene.add(key);
    const rim = new THREE.PointLight(0x3b82f6, 1.2, 800); rim.position.set(-200, 100, -100); scene.add(rim);
    const grad = new THREE.DataTexture(new Uint8Array([150, 205, 255]), 3, 1, THREE.LuminanceFormat);
    grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
    const INK = new THREE.MeshBasicMaterial({ color: 0x0f1a3a, side: THREE.BackSide });
    const toon = (c, x) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...x });
    const part = (geo, color, o = {}) => {
      const m = new THREE.Mesh(geo, o.mat || toon(color));
      const h = new THREE.Mesh(geo, INK); h.scale.setScalar(1.06); m.add(h);
      return m;
    };

    let S = BASE_S, EDGE_UP = BASE_EDGE, HEAD_UP = BASE_HEAD;
    const bob = new THREE.Group(); bob.scale.setScalar(S); scene.add(bob);
    const head = new THREE.Group(); bob.add(head);
    const skull = part(new THREE.SphereGeometry(1, 40, 28), 0xdfe5f2); skull.scale.set(1.2, 0.98, 1); head.add(skull);
    [-1, 1].forEach((s) => {
      const e = part(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 24), 0xc9d2e4);
      e.rotation.z = Math.PI / 2; e.scale.set(1.15, 1, 1); e.position.set(s * 1.2, -0.08, 0); head.add(e);
    });
    const eyes = [-1, 1].map((s) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), new THREE.MeshBasicMaterial({ color: 0x0b1226 }));
      eye.scale.set(1, 1.2, 0.45); eye.position.set(s * 0.42, 0.02, 0.93);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(-0.03, 0.08, 0.8); eye.add(hl);
      head.add(eye);
      return eye;
    });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: 0x0b1226 }));
    smile.rotation.z = Math.PI; smile.position.set(0, -0.14, 0.965); head.add(smile);

    // hard hat
    const hat = new THREE.Group(); hat.position.set(0, 0.42, 0); head.add(hat);
    const dg = new THREE.SphereGeometry(1.15, 44, 26, 0, Math.PI * 2, 0, Math.PI / 2);
    const pos = dg.attributes.position, cols = [], c1 = new THREE.Color(0x1b48d4), c2 = new THREE.Color(0x4f8dff), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.min(1, Math.max(0, (pos.getX(i) / 1.15 + 0.6 + pos.getY(i) * 0.25) / 1.6));
      tmp.copy(c1).lerp(c2, t); cols.push(tmp.r, tmp.g, tmp.b);
    }
    dg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const dome = part(dg, 0xffffff, { mat: toon(0xffffff, { vertexColors: true }) }); dome.scale.set(1.05, 1.02, 1.04); dome.position.y = 0.05; hat.add(dome);
    const brim = part(new THREE.CylinderGeometry(1.42, 1.42, 0.1, 56), 0x2b6bff); brim.scale.set(1, 1, 0.98); brim.position.y = 0.02; hat.add(brim);
    const rib = part(new THREE.TorusGeometry(1.2, 0.1, 10, 40, Math.PI), 0x1a45c8); rib.rotation.y = Math.PI / 2; rib.position.y = 0.06; hat.add(rib);
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.13, 0.028, 8, 60), new THREE.MeshBasicMaterial({ color: 0x0f1a3a }));
    band.rotation.x = Math.PI / 2; band.position.y = 0.3; hat.add(band);

    // hands gripping the card's top edge
    const hands = [-1, 1].map(() => {
      const h = part(new THREE.SphereGeometry(0.26, 20, 16), 0x2b6bff); h.scale.set(1, 0.8, 0.9); bob.add(h); return h;
    });

    let W = 220, H = 150;
    function resize() {
      W = cv.clientWidth || 220; H = cv.clientHeight || BASE_H;
      const k = H / BASE_H;
      S = BASE_S * k; EDGE_UP = BASE_EDGE * k; HEAD_UP = BASE_HEAD * k;
      bob.scale.setScalar(S);
      renderer.setSize(W, H, false);
      cam.left = 0; cam.right = W; cam.top = H; cam.bottom = 0; cam.updateProjectionMatrix();
    }

    let px = 0, py = 0, nextBlink = 2, blink = 0, peek = 0, raf = 0, visible = true;
    function onMove(e) {
      const r = cv.getBoundingClientRect();
      px = Math.max(-1.2, Math.min(1.2, (e.clientX - (r.left + r.width / 2)) / 500));
      py = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 400));
    }

    function frame(ms) {
      raf = 0;
      if (!visible) return;
      const t = ms / 1000;
      const duck = Math.max(0, Math.sin(t * 0.9 - 1.2)) > 0.96 ? 16 * (S / BASE_S) : 0; // occasional ducking
      peek += (duck - peek) * 0.12;
      bob.position.set(W / 2, EDGE_UP + HEAD_UP - peek - Math.sin(t * 2) * 2 * (S / BASE_S), 0);
      head.rotation.y = px * 0.55; head.rotation.x = py * 0.25 + 0.05; head.rotation.z = Math.sin(t * 1.3) * 0.04 + px * -0.05;
      hands.forEach((h, i) => {
        h.position.set((i ? 1 : -1) * 1.55, -HEAD_UP / S + 0.1 + (peek / S) * 0.4 + Math.sin(t * 2 + i) * 0.03, 0.6);
      });
      if (t > nextBlink) { blink = 0.14; nextBlink = t + 2.4 + Math.random() * 2.4; }
      blink = Math.max(0, blink - 1 / 60);
      eyes.forEach((e) => { e.scale.y = blink > 0 ? 0.12 : 1.2; });
      renderer.render(scene, cam);
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((en) => {
        visible = en[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
      });
      io.observe(cv);
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(frame);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { o.geometry?.dispose(); });
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className="bob-peek" aria-hidden="true" />;
}
