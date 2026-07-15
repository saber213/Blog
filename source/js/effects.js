(function () {
  "use strict";

  if (window.__romanticEffectsReady) return;
  window.__romanticEffectsReady = true;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return;

  const deviceRatio = window.devicePixelRatio || 1;
  const sakuraRatio = Math.min(deviceRatio, 1.25);
  const fireworkRatio = 1;
  const maxSparks = 220;
  const sparkColors = [
    "#ff4f91",
    "#ff884d",
    "#ffd84d",
    "#59e391",
    "#53c8ff",
    "#7f8cff",
    "#bd70ff",
    "#ff70dc"
  ];
  const opacityLevels = [0.28, 0.58, 0.9];

  function createCanvas(id) {
    const canvas = document.createElement("canvas");
    canvas.id = id;
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    return canvas;
  }

  const sakuraCanvas = createCanvas("sakura-rain");
  const fireworkCanvas = createCanvas("click-fireworks");
  const contextOptions = { alpha: true, desynchronized: true };
  const sakura = sakuraCanvas.getContext("2d", contextOptions);
  const fireworks = fireworkCanvas.getContext("2d", contextOptions);
  let width = window.innerWidth;
  let height = window.innerHeight;
  let petals = [];
  let sparks = [];
  let flashes = [];
  const sparkBatches = Array.from(
    { length: sparkColors.length * opacityLevels.length },
    () => []
  );

  const petalColors = [
    "rgba(255, 178, 207, 0.72)",
    "rgba(246, 145, 184, 0.64)",
    "rgba(255, 211, 226, 0.78)",
    "rgba(221, 173, 231, 0.56)"
  ];

  function fitCanvas(canvas, context, ratio) {
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
    fitCanvas(sakuraCanvas, sakura, sakuraRatio);
    fitCanvas(fireworkCanvas, fireworks, fireworkRatio);
    fireworks.clearRect(0, 0, width, height);
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

  function drawPetals(delta) {
    sakura.clearRect(0, 0, width, height);

    for (let index = 0; index < petals.length; index += 1) {
      const petal = petals[index];
      petal.phase += 0.012 * delta;
      petal.x += (petal.drift + Math.sin(petal.phase) * 0.28) * delta;
      petal.y += petal.speed * delta;
      petal.rotation += petal.spin * delta;

      if (petal.y > height + petal.size * 2 || petal.x < -40 || petal.x > width + 40) {
        petals[index] = makePetal(false);
      } else {
        drawPetal(petal);
      }
    }
  }

  function burst(x, y) {
    const amount = width < 768 ? 26 : 34;
    const colorOffset = Math.floor(Math.random() * sparkColors.length);

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
        colorIndex: (colorOffset + i) % sparkColors.length
      });
    }

    flashes.push({ x: x, y: y, radius: 2, life: 1 });
    if (flashes.length > 6) flashes = flashes.slice(-6);
    if (sparks.length > maxSparks) {
      sparks.splice(0, sparks.length - maxSparks);
    }
  }

  function drawFireworks(delta) {
    if (sparks.length === 0 && flashes.length === 0) return;

    fireworks.clearRect(0, 0, width, height);
    fireworks.globalCompositeOperation = "lighter";
    sparkBatches.forEach((batch) => { batch.length = 0; });

    let activeSparkCount = 0;
    for (let i = 0; i < sparks.length; i += 1) {
      const spark = sparks[i];
      spark.previousX = spark.x;
      spark.previousY = spark.y;
      const friction = Math.pow(spark.friction, delta);
      spark.vx *= friction;
      spark.vy = spark.vy * friction + spark.gravity * delta;
      spark.x += spark.vx * delta;
      spark.y += spark.vy * delta;
      spark.life -= spark.decay * delta;

      if (spark.life <= 0) continue;

      sparks[activeSparkCount] = spark;
      activeSparkCount += 1;
      const opacityIndex = spark.life > 0.66 ? 2 : (spark.life > 0.33 ? 1 : 0);
      const batchIndex = opacityIndex * sparkColors.length + spark.colorIndex;
      sparkBatches[batchIndex].push(spark);
    }
    sparks.length = activeSparkCount;

    fireworks.lineCap = "round";
    fireworks.lineWidth = width < 768 ? 1.5 : 1.8;
    for (let batchIndex = 0; batchIndex < sparkBatches.length; batchIndex += 1) {
      const batch = sparkBatches[batchIndex];
      if (batch.length === 0) continue;

      const opacityIndex = Math.floor(batchIndex / sparkColors.length);
      const colorIndex = batchIndex % sparkColors.length;
      fireworks.globalAlpha = opacityLevels[opacityIndex];
      fireworks.strokeStyle = sparkColors[colorIndex];
      fireworks.beginPath();
      for (let i = 0; i < batch.length; i += 1) {
        const spark = batch[i];
        fireworks.moveTo(spark.previousX, spark.previousY);
        fireworks.lineTo(spark.x, spark.y);
      }
      fireworks.stroke();
    }

    let activeFlashCount = 0;
    for (let i = 0; i < flashes.length; i += 1) {
      const flash = flashes[i];
      flash.radius += 1.8 * delta;
      flash.life -= 0.045 * delta;
      if (flash.life <= 0) continue;

      flashes[activeFlashCount] = flash;
      activeFlashCount += 1;
      fireworks.globalAlpha = flash.life * 0.75;
      fireworks.strokeStyle = "#ffffff";
      fireworks.lineWidth = 1.2;
      fireworks.beginPath();
      fireworks.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
      fireworks.stroke();
    }
    flashes.length = activeFlashCount;

    fireworks.globalAlpha = 1;
    fireworks.globalCompositeOperation = "source-over";
  }

  let lastFrame = performance.now();
  function animate(now) {
    if (document.hidden) {
      lastFrame = now;
      requestAnimationFrame(animate);
      return;
    }

    const delta = Math.min((now - lastFrame) / 16.67, 2);
    lastFrame = now;
    drawPetals(delta);
    drawFireworks(delta);
    requestAnimationFrame(animate);
  }

  document.addEventListener("pointerdown", function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.isPrimary === false) return;
    burst(event.clientX, event.clientY);
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    lastFrame = performance.now();
  }, { passive: true });

  let resizeTimer;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 120);
  }, { passive: true });

  resize();
  requestAnimationFrame(animate);
})();
