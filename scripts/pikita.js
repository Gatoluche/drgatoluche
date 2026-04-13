// Pikita floater module — animated sprite that drifts across the viewport and occasionally
// zooms in for a comedic close-up peek at the viewer.
const pikitaFloater = document.querySelector(".pikita-floater");

if (pikitaFloater) {
  // Drift speed multiplier for testing longevity.
  // 1 = current timing range, 2 = twice as fast, 0.5 = half speed.
  const driftDurationMultiplier = 1;

  const driftDurationMinMs = 23000;
  const driftDurationMaxMs = 36000;

  // Drift spin tuning: 1 = current speed, 2 = double spin, 0.5 = half spin.
  const driftSpinSpeedModifier = 0.1;

  let pikitaAnimation = null;
  let passesUntilPeek = 0;
  let isPeekRunning = false;
  let lastDriftImage = "";
  let requestedSpritePath = "";
  let driftImageIndex = 0;
  let peekImageIndex = 0;

  const driftPikitaImages = [
    "pictures/pikita/pikita_sleep.png",
    "pictures/pikita/pikita_smug.png",
    "pictures/pikita/pikita_wink.png",
    "pictures/pikita/pikita_x3.png"
  ];
  const peekPikitaImages = driftPikitaImages.filter((path) => !path.includes("pikita_sleep"));
  const spriteSourceCache = new Map();

  const randomBetween = (min, max) => Math.random() * (max - min) + min;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const preloadSprite = async (path) => {
    if (spriteSourceCache.has(path)) {
      return spriteSourceCache.get(path);
    }

    try {
      const response = await fetch(path, { cache: "force-cache" });
      if (!response.ok) {
        throw new Error(`Sprite request failed for ${path}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      spriteSourceCache.set(path, objectUrl);
      return objectUrl;
    } catch {
      // Fallback to original path if blob preloading fails.
      spriteSourceCache.set(path, path);
      return path;
    }
  };
  const setPikitaSprite = (path) => {
    requestedSpritePath = path;

    if (spriteSourceCache.has(path)) {
      pikitaFloater.src = spriteSourceCache.get(path);
      return;
    }

    // Show immediately, then switch to cached blob URL once fetched.
    pikitaFloater.src = path;
    preloadSprite(path).then((resolvedSource) => {
      if (requestedSpritePath === path) {
        pikitaFloater.src = resolvedSource;
      }
    });
  };
  const preloadAllSprites = () => Promise.all(driftPikitaImages.map((path) => preloadSprite(path)));
  const pickNextDriftImage = () => {
    const image = driftPikitaImages[driftImageIndex % driftPikitaImages.length];
    driftImageIndex += 1;
    lastDriftImage = image;
    return image;
  };
  const pickNextPeekImage = () => {
    // Peek cycles through non-sleep variants and skips matching the current drift sprite.
    const maxAttempts = peekPikitaImages.length;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const image = peekPikitaImages[peekImageIndex % peekPikitaImages.length];
      peekImageIndex += 1;
      if (image !== lastDriftImage) {
        return image;
      }
    }

    return peekPikitaImages[peekImageIndex % peekPikitaImages.length];
  };
  const resetPeekCountdown = () => {
    // Trigger peek every few regular passes so it feels surprising, not constant.
    passesUntilPeek = Math.floor(randomBetween(4, 9));
  };

  const runPeekEvent = () => {
    isPeekRunning = true;

    setPikitaSprite(pickNextPeekImage());

    if (pikitaAnimation) {
      pikitaAnimation.cancel();
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spriteWidth = pikitaFloater.getBoundingClientRect().width || Math.max(120, viewportWidth * 0.16);
    const offscreenPadding = spriteWidth * 1.3;

    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -offscreenPadding : viewportWidth + offscreenPadding;

    // Move the peek target inward so the close-up invades the content area more.
    const inwardNudge = viewportWidth * 0.15;
    const peekX = fromLeft
      ? randomBetween(-spriteWidth * 0.45 + inwardNudge, spriteWidth * 0.05 + inwardNudge)
      : randomBetween(
        viewportWidth - spriteWidth * 1.05 - inwardNudge,
        viewportWidth - spriteWidth * 0.55 - inwardNudge
      );

    // Always retreat downward after peeking for a cleaner comedic beat.
    const exitX = peekX + randomBetween(-viewportWidth * 0.025, viewportWidth * 0.025);

    // Keep peek altitude high enough so his face (upper part of sprite) stays visible.
    const maxPeekY = viewportHeight * 0.48;
    const startY = randomBetween(viewportHeight * 0.1, viewportHeight * 0.56);
    const peekY = randomBetween(viewportHeight * 0.08, maxPeekY);
    const exitY = viewportHeight + offscreenPadding * 1.2;

    const startRot = randomBetween(-12, 12);
    const peekRot = startRot + randomBetween(-8, 8);
    const endRot = peekRot + randomBetween(-5, 5);

    const closeScale = randomBetween(2.2, 3.3);
    const duration = randomBetween(2500, 3600);

    document.body.classList.add("pikita-peek-active");

    pikitaAnimation = pikitaFloater.animate(
      [
        {
          transform: `translate3d(${startX}px, ${startY}px, 0) rotate(${startRot}deg) scale(0.98)`,
          opacity: 0.24
        },
        {
          transform: `translate3d(${peekX}px, ${peekY}px, 0) rotate(${peekRot}deg) scale(${closeScale})`,
          opacity: 0.98,
          offset: 0.45
        },
        {
          transform: `translate3d(${peekX + (fromLeft ? 10 : -10)}px, ${peekY + randomBetween(-8, 8)}px, 0) rotate(${peekRot + randomBetween(-2, 2)}deg) scale(${closeScale * randomBetween(0.97, 1.03)})`,
          opacity: 0.98,
          offset: 0.62
        },
        {
          transform: `translate3d(${exitX}px, ${exitY}px, 0) rotate(${endRot}deg) scale(1.05)`,
          opacity: 0.2
        }
      ],
      {
        duration,
        easing: "cubic-bezier(0.25, 0.9, 0.25, 1)",
        fill: "forwards"
      }
    );

    pikitaAnimation.onfinish = () => {
      document.body.classList.remove("pikita-peek-active");
      isPeekRunning = false;
      resetPeekCountdown();
      startPikitaPass();
    };
  };

  const startPikitaPass = () => {
    if (isPeekRunning) {
      return;
    }

    if (pikitaAnimation) {
      pikitaAnimation.cancel();
    }

    // Regular background drifting can swap between Pikita variants.
    setPikitaSprite(pickNextDriftImage());

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spriteWidth = pikitaFloater.getBoundingClientRect().width || Math.max(120, viewportWidth * 0.16);
    const offscreenPadding = spriteWidth * 1.25;

    // Randomize direction so some passes go right-to-left.
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -offscreenPadding : viewportWidth + offscreenPadding;
    const endX = fromLeft ? viewportWidth + offscreenPadding : -offscreenPadding;

    const startY = randomBetween(viewportHeight * 0.08, viewportHeight * 0.72);
    const endY = randomBetween(viewportHeight * 0.08, viewportHeight * 0.78);
    const middleX = (startX + endX) / 2;

    // Slight curved path via a single control point, but sampled by arc length for uniform speed.
    const controlX = middleX + randomBetween(-viewportWidth * 0.1, viewportWidth * 0.1);
    const controlY =
      (startY + endY) / 2 + randomBetween(-viewportHeight * 0.14, viewportHeight * 0.14);

    const startRot = randomBetween(-14, 14);
    const endRot = startRot + randomBetween(-8, 8);

    // Add constant spin across the full drift pass.
    const spinDirection = Math.random() > 0.5 ? 1 : -1;
    const spinTurns = randomBetween(1.6, 3.2);
    const spinTotalDegrees = 360 * spinTurns * spinDirection * driftSpinSpeedModifier;

    const startScale = randomBetween(0.93, 1.04);
    const midScale = randomBetween(0.96, 1.08);
    const endScale = randomBetween(0.92, 1.03);

    pikitaFloater.style.opacity = randomBetween(0.2, 0.3).toFixed(2);

    const duration = randomBetween(driftDurationMinMs, driftDurationMaxMs) / driftDurationMultiplier;

    const sampleQuadraticPoint = (t) => {
      const oneMinusT = 1 - t;
      const x = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * controlX + t * t * endX;
      const y = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * controlY + t * t * endY;
      return { x, y };
    };

    const sampleCount = 120;
    const samples = [];
    let cumulativeDistance = 0;
    let previousPoint = sampleQuadraticPoint(0);
    samples.push({ t: 0, ...previousPoint, distance: 0 });

    for (let i = 1; i <= sampleCount; i += 1) {
      const t = i / sampleCount;
      const point = sampleQuadraticPoint(t);
      cumulativeDistance += Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
      samples.push({ t, ...point, distance: cumulativeDistance });
      previousPoint = point;
    }

    const totalDistance = samples[samples.length - 1].distance || 1;
    const keyframeSteps = 8;
    const driftKeyframes = [];

    for (let step = 0; step <= keyframeSteps; step += 1) {
      const offset = step / keyframeSteps;
      const targetDistance = totalDistance * offset;

      let sampleIndex = 1;
      while (sampleIndex < samples.length && samples[sampleIndex].distance < targetDistance) {
        sampleIndex += 1;
      }

      const toSample = samples[Math.min(sampleIndex, samples.length - 1)];
      const fromSample = samples[Math.max(sampleIndex - 1, 0)];
      const segmentDistance = toSample.distance - fromSample.distance || 1;
      const segmentProgress = clamp(
        (targetDistance - fromSample.distance) / segmentDistance,
        0,
        1
      );

      const x = fromSample.x + (toSample.x - fromSample.x) * segmentProgress;
      const y = fromSample.y + (toSample.y - fromSample.y) * segmentProgress;

      const rotation = startRot + (endRot - startRot) * offset + spinTotalDegrees * offset;
      const scale =
        offset < 0.5
          ? startScale + (midScale - startScale) * (offset / 0.5)
          : midScale + (endScale - midScale) * ((offset - 0.5) / 0.5);

      driftKeyframes.push({
        transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`,
        offset
      });
    }

    pikitaAnimation = pikitaFloater.animate(
      driftKeyframes,
      {
        duration,
        easing: "linear",
        fill: "forwards"
      }
    );

    // Chain the next pass immediately for a clean loop.
    pikitaAnimation.onfinish = () => {
      passesUntilPeek -= 1;
      if (passesUntilPeek <= 0) {
        runPeekEvent();
        return;
      }
      startPikitaPass();
    };
  };

  const restartPikitaPath = () => {
    document.body.classList.remove("pikita-peek-active");
    isPeekRunning = false;
    resetPeekCountdown();
    startPikitaPass();
  };

  // Debug shortcut: press backtick to force the rare peek event immediately.
  window.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }

    if (event.key === "`" || event.code === "Backquote") {
      event.preventDefault();
      runPeekEvent();
    }
  });

  resetPeekCountdown();

  // Seed the first drifting pass image.
  setPikitaSprite(pickNextDriftImage());

  // Warm the cache so each sprite is requested once and then reused.
  preloadAllSprites();

  // Start once layout dimensions are stable.
  if (document.readyState === "complete") {
    startPikitaPass();
  } else {
    window.addEventListener("load", startPikitaPass, { once: true });
  }

  // Re-roll path when viewport size changes.
  window.addEventListener("resize", restartPikitaPath);
}
