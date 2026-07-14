(function () {
  "use strict";

  if (window.__romanticEffectsReady) return;
  window.__romanticEffectsReady = true;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return;

  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

  function createCanvas(id) {
    const canvas = document.createElement("canvas");
    canvas.id = id;
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    return canvas;
  }

  const sakuraCanvas = createCanvas("sakura-rain");
  const fireworkCanvas = createCanvas("click-fireworks");
  const sakura = sakuraCanvas.getContext("2d");
  const fireworks = fireworkCanvas.getContext("2d");
  let width = window.innerWidth;
  let height = window.innerHeight;
  let petals = [];
  let sparks = [];

  const petalColors = [
    "rgba(255, 178, 207, 0.72)",
    "rgba(246, 145, 184, 0.64)",
    "rgba(255, 211, 226, 0.78)",
    "rgba(221, 173, 231, 0.56)"
  ];

  function fitCanvas(canvas, context) {
    const ratio = pixelRatio();
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function makePetal(initial) {
    const size = 6 + Math.random() * 9;
    return {
      x: Math.random() * width,
      y: initial ? Math.random() * height : -size * 2,
      size: size,
      speed: 0.38 + Math.random() * 0.55,
      drift: -0.18 + Math.random() * 0.36,
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      spin: (-0.018 + Math.random() * 0.036),
      color: petalColors[Math.floor(Math.random() * petalColors.length)]
    };
  }

  function resetPetals() {
    const areaCount = Math.floor((width * height) / 26000);
    const count = Math.min(52, Math.max(width < 768 ? 16 : 24, areaCount));
    petals = Array.from({ length: count }, () => makePetal(true));
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    fitCanvas(sakuraCanvas, sakura);
    fitCanvas(fireworkCanvas, fireworks);
    resetPetals();
  }

  function drawPetal(petal) {
    const size = petal.size;
    sakura.save();
    sakura.translate(petal.x, petal.y);
    sakura.rotate(petal.rotation);
    sakura.fillStyle = petal.color;
    sakura.beginPath();
    sakura.moveTo(0, size * 0.48);
    sakura.bezierCurveTo(-size * 0.72, size * 0.05, -size * 0.48, -size * 0.62, 0, -size * 0.42);
    sakura.bezierCurveTo(size * 0.48, -size * 0.62, size * 0.72, size * 0.05, 0, size * 0.48);
    sakura.fill();
    sakura.restore();
  }

  let lastPetalFrame = performance.now();
  function animatePetals(now) {
    const delta = Math.min((now - lastPetalFrame) / 16.67, 2);
    lastPetalFrame = now;
    sakura.clearRect(0, 0, width, height);

    petals.forEach((petal, index) => {
      petal.phase += 0.012 * delta;
      petal.x += (petal.drift + Math.sin(petal.phase) * 0.28) * delta;
      petal.y += petal.speed * delta;
      petal.rotation += petal.spin * delta;

      if (petal.y > height + petal.size * 2 || petal.x < -40 || petal.x > width + 40) {
        petals[index] = makePetal(false);
      } else {
        drawPetal(petal);
      }
    });

    requestAnimationFrame(animatePetals);
  }

  function burst(x, y) {
    const baseHue = Math.random() * 360;
    const amount = width < 768 ? 30 : 42;

    for (let i = 0; i < amount; i += 1) {
      const angle = (Math.PI * 2 * i) / amount + (Math.random() - 0.5) * 0.12;
      const velocity = 1.8 + Math.random() * 3.4;
      sparks.push({
        x: x,
        y: y,
        previousX: x,
        previousY: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        gravity: 0.035 + Math.random() * 0.025,
        friction: 0.975,
        life: 1,
        decay: 0.014 + Math.random() * 0.014,
        size: 1.2 + Math.random() * 1.8,
        hue: (baseHue + i * 11 + Math.random() * 28) % 360
      });
    }

    if (sparks.length > 420) sparks = sparks.slice(-420);
  }

  function animateFireworks() {
    fireworks.clearRect(0, 0, width, height);
    fireworks.globalCompositeOperation = "lighter";

    sparks = sparks.filter((spark) => {
      spark.previousX = spark.x;
      spark.previousY = spark.y;
      spark.vx *= spark.friction;
      spark.vy = spark.vy * spark.friction + spark.gravity;
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.life -= spark.decay;

      if (spark.life <= 0) return false;

      fireworks.beginPath();
      fireworks.moveTo(spark.previousX, spark.previousY);
      fireworks.lineTo(spark.x, spark.y);
      fireworks.lineWidth = spark.size;
      fireworks.lineCap = "round";
      fireworks.strokeStyle = "hsla(" + spark.hue + ", 96%, 68%, " + spark.life + ")";
      fireworks.shadowBlur = 8;
      fireworks.shadowColor = "hsla(" + spark.hue + ", 96%, 68%, 0.8)";
      fireworks.stroke();
      return true;
    });

    fireworks.shadowBlur = 0;
    fireworks.globalCompositeOperation = "source-over";
    requestAnimationFrame(animateFireworks);
  }

  document.addEventListener("pointerdown", function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    burst(event.clientX, event.clientY);
  }, { passive: true });

  let resizeTimer;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 120);
  }, { passive: true });

  resize();
  requestAnimationFrame(animatePetals);
  requestAnimationFrame(animateFireworks);
})();
